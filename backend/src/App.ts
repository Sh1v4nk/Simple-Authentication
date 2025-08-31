import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "@/configs/Database";
import AuthRoute from "@/routes/AuthRouter";
import { ensureIndexes, checkDatabaseHealth } from "@/utils/databaseOptimization";
import { generalRateLimit, routeScanningProtection, rootRouteRateLimit, healthCheckRateLimit } from "@/middlewares";

const app = express();

// Trust proxy for accurate IP addresses behind reverse proxies
app.set("trust proxy", 1);
app.use(helmet());

const corsOptions = {
    origin: function (origin: string | undefined, callback: (error: Error | null, success?: boolean) => void) {
        const isDev = process.env.NODE_ENV !== "production";

        // ✅ Allow requests without origin in production (health checks, internal requests)
        // but still validate origin when present for security
        if (!origin) {
            return callback(null, true);
        }

        if (isDev && origin.startsWith("http://localhost:")) {
            return callback(null, true);
        }

        const allowedOrigins = [process.env.CLIENT_URL].filter(Boolean);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.log(`🚫 CORS blocked origin: ${origin}`);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true, // allow cookies/authorization headers
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // restrict allowed methods
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"], // restrict allowed request headers
    exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"], // make custom headers visible to frontend
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
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
        endpoints: {
            auth: "/api/auth",
            health: "/health",
        },
        authEndpoints: {
            signup: "POST /api/auth/signup",
            signin: "POST /api/auth/signin",
            signout: "POST /api/auth/signout",
            verify: "GET /api/auth/verify",
            forgotPassword: "POST /api/auth/forgot-password",
            resetPassword: "POST /api/auth/reset-password",
        },
    });
});

// Health check endpoint with specific rate limiting
app.get("/health", healthCheckRateLimit, async (req, res) => {
    const dbHealthy = await checkDatabaseHealth();
    const status = dbHealthy ? "healthy" : "unhealthy";
    const statusCode = dbHealthy ? 200 : 503;

    res.status(statusCode).json({
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbHealthy ? "connected" : "disconnected",
    });
});

async function startServer(): Promise<void> {
    try {
        await connectDB();
        await ensureIndexes();

        const PORT: number = parseInt(process.env.PORT || "3000", 10);

        // API routes
        app.use("/api/auth", AuthRoute);

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
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🔒 Basic security headers enabled (Helmet)`);
            console.log(`📊 Rate limiting active`);
            console.log(`🗄️  Database optimization enabled`);
        });
    } catch (error) {
        console.error("❌ Failed to start the server:", error);
        process.exit(1);
    }
}

startServer();
