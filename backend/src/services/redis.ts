import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

class RedisService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        reconnectStrategy: (retries: number) => Math.min(retries * 50, 1000)
      },
      ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD })
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis client disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      logger.info('Redis connection closed');
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error(`Failed to set Redis key ${key}:`, error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Failed to get Redis key ${key}:`, error);
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error(`Failed to delete Redis key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<number> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error(`Failed to check Redis key ${key}:`, error);
      throw error;
    }
  }

  async setJob(jobId: string, jobData: any, ttlSeconds: number = 86400): Promise<void> {
    const key = `job:${jobId}`;
    await this.set(key, JSON.stringify(jobData), ttlSeconds);
  }

  async getJob(jobId: string): Promise<any | null> {
    const key = `job:${jobId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async deleteJob(jobId: string): Promise<number> {
    const key = `job:${jobId}`;
    return await this.del(key);
  }

  async cacheSongSearch(query: string, results: any[], ttlSeconds: number = 3600): Promise<void> {
    const key = `search:${query.toLowerCase()}`;
    await this.set(key, JSON.stringify(results), ttlSeconds);
  }

  async getCachedSongSearch(query: string): Promise<any[] | null> {
    const key = `search:${query.toLowerCase()}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      logger.error('Redis ping failed:', error);
      throw error;
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
export const redis = new RedisService();

export const initializeRedis = async (): Promise<void> => {
  await redis.connect();
}; 