import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import connectDB from "@/configs/Database";
import AuthRoute from "@/routes/AuthRouter";
import { ensureIndexes, checkDatabaseHealth, runTokenCleanup } from "@/utils";
import { generalRateLimit, routeScanningProtection, rootRouteRateLimit, healthCheckRateLimit, cleanupSecurityStores } from "@/middlewares";

const app = express();

// Trust proxy for accurate IP addresses behind reverse proxies
app.set("trust proxy", 1);
app.use(helmet());
app.use(morgan("dev", { skip: (req) => req.method === "OPTIONS" }));

const corsOptions = {
    origin: (origin: string | undefined, callback: (error: Error | null, success?: boolean) => void) => {
        const isDev = process.env.NODE_ENV !== "production";
        const allowedOrigins = [process.env.CLIENT_URL].filter(Boolean);

        // Allow no origin (internal requests) or dev localhost
        if (!origin || (isDev && origin.startsWith("http://localhost:"))) return callback(null, true);

        if (allowedOrigins.includes(origin)) return callback(null, true); // Check whitelist

        callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"], // restrict allowed request headers
    exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"], // make custom headers visible to frontend
};

app.use(cors(corsOptions));

// Basic rate limiting
app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
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

    // Get memory usage
    const memUsage = process.memoryUsage();

    res.status(statusCode).json({
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbHealthy ? "connected" : "disconnected",
        memory: {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        },
    });
});

let isShuttingDown = false;

async function startServer(): Promise<void> {
    try {
        await connectDB();
        await ensureIndexes();

        try {
            await runTokenCleanup();
        } catch (error) {
            console.error("Startup token cleanup failed:", error);
        }

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
                hint: "Check API documentation for available endpoints",
            });
        });

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            if (isShuttingDown) return;
            isShuttingDown = true;

            console.log(`Received ${signal}, shutting down...`);

            // Cleanup security stores
            cleanupSecurityStores();

            try {
                await mongoose.connection.close(false);
            } catch (error) {
                console.error("Database close failed:", error);
            }

            process.exit(0);
        };

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
