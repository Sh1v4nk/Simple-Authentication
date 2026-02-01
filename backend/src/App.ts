import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import connectDB from "@/configs/Database";
import AuthRoute from "@/routes/AuthRouter";
import { ensureIndexes, checkDatabaseHealth, runTokenCleanup } from "@/utils";
import { generalRateLimit, routeScanningProtection, rootRouteRateLimit, healthCheckRateLimit } from "@/middlewares";

const app = express();

// Trust proxy for accurate IP addresses behind reverse proxies
app.set("trust proxy", 1);

const allowedOrigins = [
    process.env.CLIENT_URL,
    ...(process.env.NODE_ENV !== "production" ? ["http://localhost:5173", "http://localhost:3000"] : []),
].filter(Boolean) as string[];

const corsOptions = {
    origin: (origin: string | undefined, callback: (error: Error | null, success?: boolean) => void) => {
        if (!origin || allowedOrigins.includes(origin) || /^https:\/\/authhub[a-z0-9-]*\.vercel\.app$/i.test(origin)) {
            return callback(null, true);
        }
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining"],
    maxAge: 86400, // Cache preflight for 24h
};

app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: false, // Handled in authSecurity middleware
    }),
);
app.use(cors(corsOptions));

// Basic rate limiting
app.use(generalRateLimit);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(cookieParser());

app.get("/", rootRouteRateLimit, (req, res) => {
    res.json({
        success: true,
        message: "Simple Authentication API",
        version: "1.0.0",
    });
});

app.get("/health", healthCheckRateLimit, async (req, res) => {
    const dbHealthy = await checkDatabaseHealth();
    const status = dbHealthy ? "healthy" : "unhealthy";
    const statusCode = dbHealthy ? 200 : 503;

    const memUsage = process.memoryUsage();
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    if (rssMB > 500) {
        console.warn(`⚠️ HIGH MEMORY: RSS=${rssMB}MB Heap=${heapMB}MB - Consider restart`);
    }

    res.status(statusCode).json({
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbHealthy ? "connected" : "disconnected",
        memory: {
            rss: `${rssMB}MB`,
            heapUsed: `${heapMB}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        },
    });
});

let isShuttingDown = false;

async function startServer(): Promise<void> {
    try {
        process.removeAllListeners("SIGTERM");
        process.removeAllListeners("SIGINT");
        process.removeAllListeners("uncaughtException");
        process.removeAllListeners("unhandledRejection");

        await connectDB();
        await ensureIndexes();

        try {
            await runTokenCleanup();
        } catch (error) {
            console.error("Startup token cleanup failed:", error);
        }

        // Scheduled token cleanup every 6 hours
        setInterval(
            async () => {
                try {
                    console.log("⏰ Running scheduled token cleanup...");
                    await runTokenCleanup();
                } catch (error) {
                    console.error("Scheduled cleanup failed:", error);
                }
            },
            6 * 60 * 60 * 1000,
        );

        // Memory monitoring every 5 minutes
        setInterval(
            () => {
                const mem = process.memoryUsage();
                const rssMB = Math.round(mem.rss / 1024 / 1024);
                const heapMB = Math.round(mem.heapUsed / 1024 / 1024);

                if (rssMB > 400) {
                    console.warn(`⚠️ Memory: RSS=${rssMB}MB Heap=${heapMB}MB Uptime=${Math.round(process.uptime() / 3600)}h`);
                }
            },
            5 * 60 * 1000,
        );

        const PORT: number = parseInt(process.env.PORT || "3000", 10);

        app.use("/api/auth", AuthRoute); // API routes

        // Error handling middleware
        app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
            console.error("💥 Unhandled error:", err);

            // Log security-related errors
            if (err.message.includes("CORS") || err.message.includes("origin")) {
                console.warn(`🚫 CORS error from IP: ${req.ip}, Origin: ${req.get("Origin")}`);
            }

            res.status(500).json({
                success: false,
                message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
            });
        });

        // 404 handler with route scanning protection
        app.use("*", routeScanningProtection, (req, res) => {
            console.warn(`🔍 404 - Route not found: ${req.method} ${req.originalUrl} from IP: ${req.ip}`);
            res.status(404).json({
                success: false,
                message: "Route not found",
            });
        });

        const server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        // Aggressive memory optimization settings
        server.maxConnections = 100; // Limit concurrent connections
        server.keepAliveTimeout = 5000; // Reduced from 65s - close connections faster
        server.headersTimeout = 6000; // Reduced from 66s
        server.maxHeadersCount = 50; // Reduced from 100
        server.timeout = 30000; // 30s request timeout

        // Graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            if (isShuttingDown) return;
            isShuttingDown = true;

            console.log(`Received ${signal}, shutting down...`);

            try {
                server.close();
                await mongoose.connection.close(false);
            } catch (error) {
                console.error("Database close failed:", error);
            }

            process.exit(0);
        };

        // Register signal handlers (listeners already cleaned at startup)
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));

        // Handle uncaught exceptions and unhandled rejections
        process.on("uncaughtException", (error) => {
            console.error("💥 Uncaught Exception:", error);
            gracefulShutdown("UNCAUGHT_EXCEPTION");
        });

        process.on("unhandledRejection", (reason) => {
            console.error("💥 Unhandled Rejection:", reason);
            gracefulShutdown("UNHANDLED_REJECTION");
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();
