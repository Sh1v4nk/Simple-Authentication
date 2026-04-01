export interface MongoIndexInfo {
    name: string;
    expireAfterSeconds?: number;
    partialFilterExpression?: {
        isVerified?: boolean;
    } & Record<string, unknown>;
}
