export interface ClientInfo {
    clientIP: string;
    userAgent: string;
}

export interface MongoDuplicateKeyError {
    code: number;
    keyPattern?: Record<string, unknown>;
}
