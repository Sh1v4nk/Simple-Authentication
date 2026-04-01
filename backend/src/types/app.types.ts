export interface HealthPayload {
    status: "healthy" | "unhealthy";
    timestamp: string;
    uptime: number;
    database: "connected" | "disconnected";
    redis: "connected" | "disconnected";
    memory: {
        rss: string;
        heapUsed: string;
        heapTotal: string;
        external: string;
    };
}

export interface HealthCache {
    expiresAt: number;
    payload: HealthPayload;
    statusCode: number;
}
