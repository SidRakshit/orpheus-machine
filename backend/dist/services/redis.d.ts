declare class RedisService {
    private client;
    private isConnected;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    get(key: string): Promise<string | null>;
    del(key: string): Promise<number>;
    exists(key: string): Promise<number>;
    setJob(jobId: string, jobData: any, ttlSeconds?: number): Promise<void>;
    getJob(jobId: string): Promise<any | null>;
    deleteJob(jobId: string): Promise<number>;
    cacheSongSearch(query: string, results: any[], ttlSeconds?: number): Promise<void>;
    getCachedSongSearch(query: string): Promise<any[] | null>;
    ping(): Promise<string>;
    isHealthy(): boolean;
}
export declare const redis: RedisService;
export declare const initializeRedis: () => Promise<void>;
export {};
