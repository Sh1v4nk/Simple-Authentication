/* eslint-disable no-console */
import { z } from "zod";

const envSchema = z
    .object({
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
        PORT: z
            .string()
            .optional()
            .default("3000")
            .transform((val) => parseInt(val, 10))
            .pipe(z.number().int().min(1).max(65535)),
        CLIENT_URL: z.string().url("CLIENT_URL must be a valid URL"),
        MONGO_URI: z.string().min(1, "MONGO_URI is required"),
        UPSTASH_REDIS_REST_URL: z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL"),
        UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),
        JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters for security"),
        JWT_AUDIENCE: z.string().optional().default("simple-auth-client"),
        JWT_ISSUER: z.string().optional().default("simple-auth-api"),
        SALT_ROUNDS: z
            .string()
            .optional()
            .default("12")
            .transform((val) => parseInt(val, 10))
            .pipe(z.number().int().min(10).max(31)),
        MAILTRAP_API_TOKEN: z.string().min(1, "MAILTRAP_API_TOKEN is required"),
        INFRA_TIER: z.enum(["free", "paid"]).default("free"),
        HEALTH_CACHE_TTL_MS: z
            .string()
            .optional()
            .default("15000")
            .transform((val) => parseInt(val, 10))
            .pipe(z.number().int().min(1000).max(60000)),
        LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    })
    .superRefine((env, ctx) => {
        if (env.NODE_ENV === "production" && !env.CLIENT_URL.startsWith("https://")) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["CLIENT_URL"],
                message: "CLIENT_URL must use https:// in production",
            });
        }

        if (env.NODE_ENV === "production" && !env.UPSTASH_REDIS_REST_URL.startsWith("https://")) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["UPSTASH_REDIS_REST_URL"],
                message: "UPSTASH_REDIS_REST_URL must use https:// in production",
            });
        }

        if (env.NODE_ENV === "production" && env.SALT_ROUNDS < 12) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["SALT_ROUNDS"],
                message: "SALT_ROUNDS should be at least 12 in production",
            });
        }

        if (env.NODE_ENV === "production" && ["debug", "trace"].includes(env.LOG_LEVEL)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["LOG_LEVEL"],
                message: "LOG_LEVEL should not be debug or trace in production",
            });
        }
    });

export type EnvConfig = z.infer<typeof envSchema>;

let _validatedEnv: EnvConfig | null = null;

export function validateEnv(): EnvConfig {
    if (_validatedEnv) return _validatedEnv;

    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        const formatted = result.error.issues.map((issue) => `  ✗ ${issue.path.join(".")}: ${issue.message}`).join("\n");

        console.error(`[ENV] Validation failed:\n${formatted}`);
        console.error("[ENV] Check your .env file against .env.example");
        process.exit(1);
    }

    _validatedEnv = result.data;
    console.log("[ENV] Environment variables validated successfully");
    return _validatedEnv;
}

export function getEnv(): EnvConfig {
    if (!_validatedEnv) {
        throw new Error("[ENV] validateEnv() must be called before getEnv()");
    }
    return _validatedEnv;
}
