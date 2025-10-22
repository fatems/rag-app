/**
 * Redis Service for caching.
 */

import { Redis } from "ioredis";
import { logger } from "../utils/logger.js";
import { IRedisService } from "./interfaces/IRedisService.js";
import { CacheError } from "../utils/errors.js";

export class RedisService implements IRedisService {
	public readonly client: Redis;

	constructor(redisUrl: string) {
		this.client = new Redis(redisUrl);
		logger.info("RedisService initialized", { redisUrl });

		this.client.on('error', (err: Error) => {
			logger.error("Redis client error", { error: err.message });
		});
	}

	public on(event: string, listener: (...args: any[]) => void): Redis {
		return this.client.on(event, listener);
	}

	public async get(key: string): Promise<string | null> {
		return this.client.get(key);
	}

	public async setex(key: string, seconds: number, value: string): Promise<string | null> {
		return this.client.setex(key, seconds, value);
	}

	public async ping(): Promise<string> {
		return this.client.ping();
	}

	public async quit(): Promise<string> {
		return this.client.quit();
	}

	async connect(): Promise<string> {
		try {
			const result = await this.client.ping();
			logger.info("Connected to Redis server");
			return result;
		} catch (error) {
			logger.error("Failed to connect to Redis server", { error: error instanceof Error ? error.message : String(error) });
			throw new CacheError("Redis connection failed");
		}
	}

	async close(): Promise<string> {
		try {
			const result = await this.client.quit();
			logger.info("RedisService client closed");
			return result;
		} catch (error) {
			logger.error("Failed to close Redis client", { error: error instanceof Error ? error.message : String(error) });
			throw new CacheError("Failed to close Redis client");
		}
	}
}
