/**
 * Embedding service for Cohere or HuggingFace models with Redis caching.
 */

import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { CohereClient } from "cohere-ai";
import * as HF from "@xenova/transformers";
import { EmbeddingCacheService, getAndCacheEmbeddings } from "./embeddingCacheService.js";

export type EmbeddingVector = Float32Array;

export interface Embedder {
	embed(texts: string[]): Promise<EmbeddingVector[]>;
	provider: "cohere" | "hf";
}

class CohereEmbedder implements Embedder {
	private client: CohereClient;
	provider: "cohere" = "cohere";
	private cacheService: EmbeddingCacheService;

	constructor(apiKey: string, cacheService: EmbeddingCacheService) {
		this.client = new CohereClient({ token: apiKey });
		this.cacheService = cacheService;
		logger.info("CohereEmbedder initialized");
	}

	async embed(texts: string[]): Promise<EmbeddingVector[]> {
		return getAndCacheEmbeddings(texts, this.cacheService, async (uncachedTexts) => {
			// Cohere v3 requires input_type; choose based on usage (heuristic)
			const inputType = uncachedTexts.length === 1 ? ("search_query" as const) : ("search_document" as const);
			const resp = await this.client.embed({
				texts: uncachedTexts,
				model: "embed-english-v3.0" as any,
				input_type: inputType,
			});
			return resp.embeddings as number[][];
		}, this.provider);
	}
}

class HFEmbedder implements Embedder {
	private pipelinePromise: Promise<any>;
	provider: "hf" = "hf";
	private cacheService: EmbeddingCacheService;

	constructor(model: string, cacheService: EmbeddingCacheService) {
		this.pipelinePromise = HF.pipeline("feature-extraction", model, {
			quantized: false,
		}) as unknown as Promise<any>;
		this.cacheService = cacheService;
		logger.info("HFEmbedder initialized", { model });

		this.pipelinePromise.catch((err: Error) => logger.error("HuggingFace pipeline initialization failed", { error: err.message }));
	}

	async embed(texts: string[]): Promise<EmbeddingVector[]> {
		return getAndCacheEmbeddings(texts, this.cacheService, async (uncachedTexts) => {
			const pipe: any = await this.pipelinePromise;
			const newEmbeddingsPromises = uncachedTexts.map(async (t) => {
				const result: any = await pipe(t, { pooling: "mean", normalize: true });
				return Float32Array.from(Array.from(result.data as number[]));
			});
			return Promise.all(newEmbeddingsPromises);
		}, this.provider);
	}
}

export function createEmbedder(embeddingCacheService: EmbeddingCacheService): Embedder {
	if (env.cohereApiKey) {
		logger.info("Using Cohere for embeddings");
		return new CohereEmbedder(env.cohereApiKey, embeddingCacheService);
	}
	logger.info("Using HuggingFace on-device embeddings", { model: env.huggingFaceModel });
	return new HFEmbedder(env.huggingFaceModel, embeddingCacheService);
}
