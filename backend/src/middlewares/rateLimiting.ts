import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { Request, Response, NextFunction } from "express";
import { TIMING_CONSTANTS } from "@/constants";

/**
 * Rate Limiting Configuration
 * Different rate limits for different types of operations
 */

// General API rate limiting
export const generalRateLimit = rateLimit({
    windowMs: TIMING_CONSTANTS.FIFTEEN_MINUTES, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: "Too many requests from this IP, please try again later.",
        retryAfter: "15 minutes",
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req: Request, res: Response) => {
        const resetTime = req.rateLimit?.resetTime || new Date(Date.now() + TIMING_CONSTANTS.FIFTEEN_MINUTES);
        const secondsUntilReset = Math.max(0, Math.round((resetTime.getTime() - Date.now()) / 1000));

        res.status(429).json({
            success: false,
            message: "Too many requests from this IP, please try again later.",
            retryAfter: secondsUntilReset,
        });
    },
});

// Strict rate limiting for authentication endpoints
export const authRateLimit = rateLimit({
    windowMs: TIMING_CONSTANTS.FIFTEEN_MINUTES, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: {
        error: "Too many authentication attempts, please try again later.",
        retryAfter: "15 minutes",
    },
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req: Request, res: Response) => {
        const resetTime = req.rateLimit?.resetTime || new Date(Date.now() + TIMING_CONSTANTS.FIFTEEN_MINUTES);
        const secondsUntilReset = Math.max(0, Math.round((resetTime.getTime() - Date.now()) / 1000));

        res.status(429).json({
            success: false,
            message: "Too many authentication attempts from this IP, please try again later.",
            retryAfter: secondsUntilReset,
        });
    },
});

// Rate limiting for password reset requests
export const passwordResetRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset attempts per hour
    message: {
        error: "Too many password reset attempts, please try again later.",
        retryAfter: "1 hour",
    },
    handler: (req: Request, res: Response) => {
        const resetTime = req.rateLimit?.resetTime || new Date(Date.now() + 60 * 60 * 1000);
        const secondsUntilReset = Math.max(0, Math.round((resetTime.getTime() - Date.now()) / 1000));

        res.status(429).json({
            success: false,
            message: "Too many password reset attempts from this IP, please try again later.",
            retryAfter: secondsUntilReset,
        });
    },
});

// Rate limiting for email verification/resend
export const emailVerificationRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // Limit each IP to 3 email verification attempts per 5 minutes
    message: {
        error: "Too many email verification attempts, please try again later.",
        retryAfter: "5 minutes",
    },
    handler: (req: Request, res: Response) => {
        const resetTime = req.rateLimit?.resetTime || new Date(Date.now() + 5 * 60 * 1000);
        const secondsUntilReset = Math.max(0, Math.round((resetTime.getTime() - Date.now()) / 1000));

        res.status(429).json({
            success: false,
            message: "Too many email verification attempts, please try again later.",
            retryAfter: secondsUntilReset,
        });
    },
});

// Progressive delay middleware for repeated requests
export const progressiveDelay = slowDown({
    windowMs: TIMING_CONSTANTS.FIFTEEN_MINUTES, // 15 minutes
    delayAfter: 5, // Allow 5 requests per windowMs at full speed
    delayMs: (hits) => hits * 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 5000, // Maximum delay of 5 seconds
});

// Strict rate limiting for route scanning/abuse detection
export const routeScanningProtection = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Allow only 5 requests to unknown/404 routes per hour
    message: {
        error: "Too many requests to undefined routes. Possible scanning detected.",
        retryAfter: "1 hour",
    },
    skipSuccessfulRequests: true, // Only count failed/404 requests
    handler: (req: Request, res: Response) => {
        const resetTime = req.rateLimit?.resetTime || new Date(Date.now() + 60 * 60 * 1000);
        const secondsUntilReset = Math.max(0, Math.round((resetTime.getTime() - Date.now()) / 1000));

        // Log potential scanning attempt
        console.warn(`🚨 Route scanning detected from IP: ${req.ip}, User-Agent: ${req.get("User-Agent")}, Path: ${req.originalUrl}`);

        res.status(429).json({
            success: false,
            message: "Too many requests to undefined routes. Please check your API calls.",
            retryAfter: secondsUntilReset,
        });
    },
});

// Root route rate limiting - restrictive since it's just API info
export const rootRouteRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Allow 5 requests to root route per hour
    message: {
        error: "Too many requests to root route, please reduce frequency.",
        retryAfter: "1 hour",
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        const resetTime = req.rateLimit?.resetTime || new Date(Date.now() + 60 * 60 * 1000);
        const secondsUntilReset = Math.max(0, Math.round((resetTime.getTime() - Date.now()) / 1000));

        res.status(429).json({
            success: false,
            message: "Root route rate limit exceeded. Please reduce frequency.",
            retryAfter: secondsUntilReset,
        });
    },
});

// Health check rate limiting - restrictive to prevent abuse
export const healthCheckRateLimit = rateLimit({
    windowMs: TIMING_CONSTANTS.FIFTEEN_MINUTES, // 15 minutes
    max: 3, // Allow 3 health checks per 15 minutes
    message: {
        error: "Too many health check requests, please reduce frequency.",
        retryAfter: "15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
        const resetTime = req.rateLimit?.resetTime || new Date(Date.now() + TIMING_CONSTANTS.FIFTEEN_MINUTES);
        const secondsUntilReset = Math.max(0, Math.round((resetTime.getTime() - Date.now()) / 1000));

        res.status(429).json({
            success: false,
            message: "Health check rate limit exceeded. Please reduce frequency.",
            retryAfter: secondsUntilReset,
        });
    },
});

// Rate limiting for token refresh - more permissive than auth endpoints
export const refreshTokenRateLimit = rateLimit({
    windowMs: TIMING_CONSTANTS.FIFTEEN_MINUTES, // 15 minutes
    max: 20, // Allow 20 refresh attempts per window (more than auth attempts)
    message: {
        error: "Too many token refresh attempts, please try again later.",
        retryAfter: "15 minutes",
    },
    skipSuccessfulRequests: true, // Don't count successful refreshes
    handler: (req: Request, res: Response) => {
        const resetTime = req.rateLimit?.resetTime || new Date(Date.now() + TIMING_CONSTANTS.FIFTEEN_MINUTES);
        const secondsUntilReset = Math.max(0, Math.round((resetTime.getTime() - Date.now()) / 1000));

        res.status(429).json({
            success: false,
            message: "Too many token refresh attempts from this IP, please try again later.",
            retryAfter: secondsUntilReset,
        });
    },
});

/**
 * Custom rate limiting based on user behavior
 */
export const adaptiveRateLimit = (req: Request, res: Response, next: NextFunction) => {
    // Get client IP
    const clientIP = req.ip || req.socket?.remoteAddress || "unknown";

    // Add rate limit info to request for logging
    if (req.rateLimit) {
        req.rateLimitInfo = {
            limit: req.rateLimit.limit,
            remaining: req.rateLimit.remaining,
            reset: req.rateLimit.resetTime,
        };
    }

    // Log suspicious activity
    if (req.rateLimit && req.rateLimit.remaining <= 2) {
        console.warn(`⚠️  High request frequency detected from IP: ${clientIP}, remaining: ${req.rateLimit.remaining}`);
    }

    next();
};

/**
 * IP-based security checks
 */
export const ipSecurityCheck = (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.socket?.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent") || "unknown";

    // Basic IP validation
    if (!clientIP || clientIP === "unknown") {
        return res.status(400).json({
            success: false,
            message: "Invalid request origin",
        });
    }

    // Detect potential bot traffic
    const suspiciousUserAgents = ["bot", "crawler", "spider", "scraper", "curl", "wget"];

    const isSuspicious = suspiciousUserAgents.some((agent) => userAgent.toLowerCase().includes(agent));

    if (isSuspicious) {
        console.warn(`🤖 Suspicious user agent detected: ${userAgent} from IP: ${clientIP}`);
        return res.status(403).json({
            success: false,
            message: "Access denied",
        });
    }

    // Add security headers to request for downstream use
    req.headers["x-client-ip"] = clientIP;
    req.headers["x-user-agent"] = userAgent;

    next();
};

/**
 * Request validation middleware
 */
export const requestValidation = (req: Request, res: Response, next: NextFunction) => {
    // Check for required headers
    const requiredHeaders = ["user-agent", "accept"];

    for (const header of requiredHeaders) {
        if (!req.get(header)) {
            return res.status(400).json({
                success: false,
                message: `Missing required header: ${header}`,
            });
        }
    }

    // Validate request size
    const contentLength = parseInt(req.get("content-length") || "0");
    const maxSize = 1024 * 1024; // 1MB limit

    if (contentLength > maxSize) {
        return res.status(413).json({
            success: false,
            message: "Request too large",
        });
    }

    next();
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Remove server information
    res.removeHeader("X-Powered-By");

    // Add security headers
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    // HSTS header for HTTPS
    if (req.secure || req.get("x-forwarded-proto") === "https") {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }

    next();
};

/**
 * Request logging middleware for security monitoring
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const clientIP = req.ip || req.socket?.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent");
    const method = req.method;
    const url = req.originalUrl;

    // Log the request
    console.log(`🔒 [${new Date().toISOString()}] ${method} ${url} - IP: ${clientIP} - UA: ${userAgent}`);

    // Override res.end to log response
    const originalEnd = res.end.bind(res);
    res.end = function (chunk?: any, encoding?: any): Response {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        console.log(`📊 [${new Date().toISOString()}] ${method} ${url} - ${statusCode} - ${duration}ms - IP: ${clientIP}`);

        // Log suspicious activity
        if (statusCode === 429) {
            console.warn(`🚨 Rate limit exceeded: ${method} ${url} - IP: ${clientIP}`);
        } else if (statusCode >= 400 && statusCode < 500) {
            console.warn(`⚠️  Client error: ${method} ${url} - ${statusCode} - IP: ${clientIP}`);
        } else if (statusCode >= 500) {
            console.error(`❌ Server error: ${method} ${url} - ${statusCode} - IP: ${clientIP}`);
        }

        return originalEnd(chunk, encoding);
    };

    next();
};
