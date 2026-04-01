import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";

import { connectDB, disconnectDB } from "@/configs/database";
import AuthRoute from "@/routes/auth.routes";
import { logger } from "@/configs/logger";
import { checkRedisHealth } from "@/configs/redis";
import { validateEnv, getEnv } from "@/configs/env";
import { ensureIndexes, checkDatabaseHealth } from "@/utils/dbOptimizer";
import { generalRateLimit, routeScanningProtection, healthCheckRateLimit } from "@/middlewares/rateLimit.middleware";
import type { HealthCache } from "@/types/app.types";
import { isTrustedOrigin } from "@/utils/origin";

const app = express();
const env = validateEnv();
const { HEALTH_CACHE_TTL_MS } = env;

let healthCache: HealthCache | null = null;

app.use(
    pinoHttp({
        logger,
        genReqId: (req) => {
            const headerRequestId = req.headers["x-request-id"];
            const requestId = typeof headerRequestId === "string" && headerRequestId.length > 0 ? headerRequestId : crypto.randomUUID();
            req.requestId = requestId;
            return requestId;
        },
        customSuccessMessage: (_req, res) => `request completed ${res.statusCode}`,
        customErrorMessage: (_req, res, err) => `request failed ${res.statusCode} — ${err.message}`,
        redact: ["req.headers.authorization", "req.headers.cookie"],
        autoLogging: {
            ignore: (req) => req.url === "/health",
        },
    }),
);

app.set("trust proxy", 1);

const corsOptions = {
    origin: (origin: string | undefined, callback: (error: Error | null, success?: boolean) => void) => {
        if (!origin || isTrustedOrigin(origin)) {
            return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
    maxAge: 86400,
};

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.use(generalRateLimit);
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

app.get("/health", healthCheckRateLimit, async (_req, res) => {
    if (healthCache && Date.now() < healthCache.expiresAt) {
        res.status(healthCache.statusCode).json(healthCache.payload);
        return;
    }

    const [dbHealthy, redisHealthy] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);
    const mem = process.memoryUsage();
    const rssMB = Math.round(mem.rss / 1024 / 1024);
    const heapMB = Math.round(mem.heapUsed / 1024 / 1024);

    if (rssMB > 500) logger.warn({ rssMB, heapMB }, "[HEALTH] High memory");

    const statusCode = dbHealthy && redisHealthy ? 200 : 503;
    const payload = {
        status: dbHealthy && redisHealthy ? ("healthy" as const) : ("unhealthy" as const),
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        database: dbHealthy ? ("connected" as const) : ("disconnected" as const),
        redis: redisHealthy ? ("connected" as const) : ("disconnected" as const),
        memory: {
            rss: `${rssMB}MB`,
            heapUsed: `${heapMB}MB`,
            heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
            external: `${Math.round(mem.external / 1024 / 1024)}MB`,
        },
    };

    healthCache = {
        expiresAt: Date.now() + HEALTH_CACHE_TTL_MS,
        payload,
        statusCode,
    };

    res.status(statusCode).json(payload);
});

app.use("/api/auth", AuthRoute);

app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    req.log.error({ err, method: req.method, path: req.originalUrl }, "[ERROR] Request failed");
    if (err.message.includes("CORS") || err.message.includes("origin")) {
        req.log.warn({ ip: req.ip, origin: req.get("Origin") }, "[CORS] Blocked origin");
        res.status(403).json({ success: false, message: "Origin not allowed" });
        return;
    }

    res.status(500).json({
        success: false,
        message: env.NODE_ENV === "production" ? "Internal server error" : err.message,
    });
});

app.use("*", routeScanningProtection, (req, res) => {
    req.log.warn({ method: req.method, path: req.originalUrl, ip: req.ip }, "[404] Route not found");
    res.status(404).json({ success: false, message: "Route not found" });
});

async function startServer(): Promise<void> {
    try {
        const { PORT, NODE_ENV } = getEnv();
        await connectDB();
        const redisHealthy = await checkRedisHealth();
        if (!redisHealthy) {
            throw new Error("[STARTUP] Redis is not reachable. Refusing to start.");
        }

        logger.info("[REDIS] Connectivity check passed (command=PING)");
        await ensureIndexes();

        const server = app.listen(PORT, () => {
            logger.info({ port: PORT, env: NODE_ENV }, "[SERVER] Running");
        });

        // Keep-alive must stay above common proxy idle timeouts to avoid reused dead sockets.
        server.keepAliveTimeout = 80_000;
        server.headersTimeout = 81_000;
        server.timeout = 30_000;

        let isShuttingDown = false;

        const gracefulShutdown = (signal: string) => {
            if (isShuttingDown) return;
            isShuttingDown = true;

            logger.info(`[SHUTDOWN] ${signal} — draining requests...`);

            const forceExit = setTimeout(() => {
                logger.error("[SHUTDOWN] Timed out — forcing exit");
                process.exit(1);
            }, 10_000).unref();

            server.close(async () => {
                try {
                    await disconnectDB();
                    logger.info("[SHUTDOWN] Clean exit");
                } catch (err) {
                    logger.error({ err }, "[SHUTDOWN] DB close failed");
                } finally {
                    clearTimeout(forceExit);
                    process.exit(0);
                }
            });
        };

        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
        process.on("uncaughtException", (err) => {
            logger.error({ err }, "[CRASH] Uncaught Exception");
            gracefulShutdown("uncaughtException");
        });
        process.on("unhandledRejection", (reason) => {
            logger.error({ reason }, "[CRASH] Unhandled Rejection");
            gracefulShutdown("unhandledRejection");
        });
    } catch (err) {
        logger.error({ err }, "[FATAL] Failed to start");
        process.exit(1);
    }
}

startServer();
