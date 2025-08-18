"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeRedis = exports.redis = void 0;
const redis_1 = require("redis");
const logger_1 = require("../utils/logger");
class RedisService {
    constructor() {
        this.isConnected = false;
        this.client = (0, redis_1.createClient)({
            socket: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
            },
            ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD })
        });
        this.client.on('error', (err) => {
            logger_1.logger.error('Redis client error:', err);
            this.isConnected = false;
        });
        this.client.on('connect', () => {
            logger_1.logger.info('Redis client connected');
            this.isConnected = true;
        });
        this.client.on('disconnect', () => {
            logger_1.logger.warn('Redis client disconnected');
            this.isConnected = false;
        });
    }
    async connect() {
        try {
            await this.client.connect();
            logger_1.logger.info('Redis connection established');
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }
    async disconnect() {
        if (this.isConnected) {
            await this.client.disconnect();
            logger_1.logger.info('Redis connection closed');
        }
    }
    async set(key, value, ttlSeconds) {
        try {
            if (ttlSeconds) {
                await this.client.setEx(key, ttlSeconds, value);
            }
            else {
                await this.client.set(key, value);
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to set Redis key ${key}:`, error);
            throw error;
        }
    }
    async get(key) {
        try {
            return await this.client.get(key);
        }
        catch (error) {
            logger_1.logger.error(`Failed to get Redis key ${key}:`, error);
            throw error;
        }
    }
    async del(key) {
        try {
            return await this.client.del(key);
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete Redis key ${key}:`, error);
            throw error;
        }
    }
    async exists(key) {
        try {
            return await this.client.exists(key);
        }
        catch (error) {
            logger_1.logger.error(`Failed to check Redis key ${key}:`, error);
            throw error;
        }
    }
    async setJob(jobId, jobData, ttlSeconds = 86400) {
        const key = `job:${jobId}`;
        await this.set(key, JSON.stringify(jobData), ttlSeconds);
    }
    async getJob(jobId) {
        const key = `job:${jobId}`;
        const data = await this.get(key);
        return data ? JSON.parse(data) : null;
    }
    async deleteJob(jobId) {
        const key = `job:${jobId}`;
        return await this.del(key);
    }
    async cacheSongSearch(query, results, ttlSeconds = 3600) {
        const key = `search:${query.toLowerCase()}`;
        await this.set(key, JSON.stringify(results), ttlSeconds);
    }
    async getCachedSongSearch(query) {
        const key = `search:${query.toLowerCase()}`;
        const data = await this.get(key);
        return data ? JSON.parse(data) : null;
    }
    async ping() {
        try {
            return await this.client.ping();
        }
        catch (error) {
            logger_1.logger.error('Redis ping failed:', error);
            throw error;
        }
    }
    isHealthy() {
        return this.isConnected;
    }
}
exports.redis = new RedisService();
const initializeRedis = async () => {
    await exports.redis.connect();
};
exports.initializeRedis = initializeRedis;
//# sourceMappingURL=redis.js.map