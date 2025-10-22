/**
 * In-Memory Retrieval Service.
 */

import fs from "fs";
import path from "path";
import { type Embedder } from "./embeddingsService.js";
import { splitIntoChunks } from "../utils/chunk.js";
import { cosineSimilarity } from "../utils/similarity.js";
import { logger } from "../utils/logger.js";
import { type IChunk, type IRetrieverService } from "./interfaces/IRetriever.js";
import { EmbeddingVector } from "./embeddingsService.js";
import { AppError } from "../utils/errors.js";

export class InMemoryRetrieverService implements IRetrieverService {
	private chunks: (IChunk & { embedding: EmbeddingVector })[] = [];
	private embedder: Embedder;

	constructor(embedder: Embedder) {
		this.embedder = embedder;
		logger.info("InMemoryRetriever initialized", { embedder: embedder.provider });
	}

	async loadFromFile(filePath: string): Promise<void> {
		const abs = path.resolve(filePath);
		let text: string;
		try {
			text = fs.readFileSync(abs, "utf8");
		} catch (error) {
			logger.error("Failed to read knowledge file for in-memory retriever", { filePath, error: error instanceof Error ? error.message : String(error) });
			throw new AppError(`Failed to read knowledge file: ${filePath}`);
		}
		const chunkTexts = splitIntoChunks(text, 250);

		logger.info("In-Memory: Generating embeddings for chunks...", { count: chunkTexts.length });
		const embeddings = await this.embedder.embed(chunkTexts);

		this.chunks = chunkTexts.map((text, idx) => ({
			id: `chunk_${idx}`,
			text,
			embedding: embeddings[idx],
			metadata: { chunkIndex: idx, source: filePath },
		}));
		logger.info(`Loaded ${this.chunks.length} chunks into memory`);
	}

	async topKSimilar(query: string, k = 3): Promise<IChunk[]> {
		const [queryVec] = await this.embedder.embed([query]);
		
		const scored = this.chunks.map((c) => ({
			chunk: c,
			score: cosineSimilarity(queryVec, c.embedding),
		}));
		scored.sort((a, b) => b.score - a.score);
		
		logger.info("Retrieved chunks from memory", {
			query: query.substring(0, 50),
			resultsCount: scored.length,
			searchComplexity: "O(n)",
		});
		
		return scored.slice(0, k).map((s) => s.chunk);
	}

	getChunksCount(): number {
		return this.chunks.length;
	}
}
