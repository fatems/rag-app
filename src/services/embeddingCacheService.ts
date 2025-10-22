/**
 * Embedding Cache Service.
 */

import { logger } from "../utils/logger.js";
import { type EmbeddingVector } from "./embeddingsService.js";
import { IRedisService } from "./interfaces/IRedisService.js";
import { ICryptoService } from "./interfaces/ICryptoService.js";

export class EmbeddingCacheService {
	private readonly redisService: IRedisService;
	private readonly cacheTtlSeconds: number;
	private readonly cryptoService: ICryptoService;

	constructor(redisService: IRedisService, cacheTtlSeconds: number, cryptoService: ICryptoService) {
		this.redisService = redisService;
		this.cacheTtlSeconds = cacheTtlSeconds;
		this.cryptoService = cryptoService;
		logger.info("EmbeddingCacheService initialized");

		this.redisService.on('error', (err: Error) => logger.error("Redis embedding cache client error", { error: err.message }));
	}

	private hashText(text: string): string {
		return this.cryptoService.hashText(text);
	}

	async get(text: string): Promise<EmbeddingVector | null> {
		const hash = this.hashText(text);
		try {
			const cachedEmbedding = await this.redisService.get(`embed:${hash}`);
			if (cachedEmbedding) {
				logger.debug("Embedding cache hit", { hash });
				return Float32Array.from(JSON.parse(cachedEmbedding));
			}
			logger.debug("Embedding cache miss", { hash });
			return null;
		} catch (error) {
			logger.error("Failed to retrieve embedding from cache", { hash, error: error instanceof Error ? error.message : String(error) });
			return null;
		}
	}

	async set(text: string, embedding: EmbeddingVector): Promise<void> {
		const hash = this.hashText(text);
		try {
			await this.redisService.setex(
				`embed:${hash}`,
				this.cacheTtlSeconds,
				JSON.stringify(Array.from(embedding))
			);
			logger.debug("Embedding cached", { hash, ttl: this.cacheTtlSeconds });
		} catch (error) {
			logger.error("Failed to cache embedding", { hash, error: error instanceof Error ? error.message : String(error) });
		}
	}
}

/**
 * Handles caching logic for embedding generation.
 */
export async function getAndCacheEmbeddings(
	texts: string[],
	cacheService: EmbeddingCacheService,
	embedFn: (texts: string[]) => Promise<EmbeddingVector[] | number[][]>,
	providerName: string,
): Promise<EmbeddingVector[]> {
	const embeddings: (EmbeddingVector | undefined)[] = new Array(texts.length);
	const uncachedTexts: string[] = [];
	const uncachedIndices: number[] = [];

	for (let i = 0; i < texts.length; i++) {
		const text = texts[i];
		const cachedEmbedding = await cacheService.get(text);
		if (cachedEmbedding) {
			embeddings[i] = cachedEmbedding;
		} else {
			uncachedTexts.push(text);
			uncachedIndices.push(i);
		}
	}

	if (uncachedTexts.length > 0) {
		logger.info(`${providerName}: Embedding uncached texts`, { count: uncachedTexts.length });
		const rawNewEmbeddings = await embedFn(uncachedTexts);
		const newEmbeddings = rawNewEmbeddings[0] instanceof Float32Array
			? (rawNewEmbeddings as EmbeddingVector[])
			: (rawNewEmbeddings as number[][]).map((v) => Float32Array.from(v));

		for (let i = 0; i < newEmbeddings.length; i++) {
			const text = uncachedTexts[i];
			const embedding = newEmbeddings[i];
			await cacheService.set(text, embedding);
			embeddings[uncachedIndices[i]] = embedding;
		}
	}

	return embeddings.map(e => e || new Float32Array(0));
}
