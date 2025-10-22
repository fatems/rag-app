/**
 * ChromaDB Retrieval Service.
 */

import fs from "fs";
import path from "path";
import { ChromaClient, Collection } from "chromadb";
import { type Embedder } from "./embeddingsService.js";
import { splitIntoChunks } from "../utils/chunk.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";
import { type IChunk, type IRetrieverService } from "./interfaces/IRetriever.js";
import { AppError } from "../utils/errors.js";

export class ChromaDBRetrieverService implements IRetrieverService {
	private client: ChromaClient;
	private collection: Collection | null = null;
	private embedder: Embedder;
	private collectionName = "knowledge_base";

	constructor(embedder: Embedder, chromaUrl: string = env.chromaUrl) {
		this.embedder = embedder;
		this.client = new ChromaClient({ path: chromaUrl });
		logger.info("ChromaDBRetriever initialized", { chromaUrl, embedder: embedder.provider });
	}

	async initialize(): Promise<void> {
		this.collection = await this.client.getOrCreateCollection({
			name: this.collectionName,
			metadata: {
				"hnsw:space": "cosine",
				"hnsw:construction_ef": env.chromaHnswEf,
				"hnsw:M": env.chromaHnswM,
			},
		});
		logger.info("ChromaDB collection initialized successfully", {
			name: this.collectionName,
			indexType: "HNSW (FAISS-like)",
			ef: env.chromaHnswEf,
			M: env.chromaHnswM,
		});
	}

	async loadFromFile(filePath: string): Promise<void> {
		if (!this.collection) {
			throw new AppError("ChromaDB not initialized. Call initialize() first.");
		}

		const abs = path.resolve(filePath);
		let text: string;
		try {
			text = fs.readFileSync(abs, "utf8");
		} catch (error) {
			logger.error("Failed to read knowledge file for ChromaDB", { filePath, error: error instanceof Error ? error.message : String(error) });
			throw new AppError(`Failed to read knowledge file: ${filePath}`);
		}
		
		const chunkTexts = splitIntoChunks(text, 250);

		logger.info("ChromaDB: Generating embeddings for chunks...", { count: chunkTexts.length });
		const embeddings = await this.embedder.embed(chunkTexts);

		const ids = chunkTexts.map((_, idx) => `chunk_${idx}_${Date.now()}`);
		const metadatas = chunkTexts.map((_, idx) => ({
			chunkIndex: idx,
			source: filePath,
		}));

		await this.collection.add({
			ids,
			embeddings: embeddings.map((e) => Array.from(e)),
			documents: chunkTexts,
			metadatas,
		});
		logger.info("Loaded chunks into ChromaDB with HNSW indexing", {
			count: chunkTexts.length,
			indexType: "HNSW",
			complexity: "O(log n) query time",
		});
	}

	async topKSimilar(query: string, k = 3): Promise<IChunk[]> {
		if (!this.collection) {
			throw new AppError("ChromaDB not initialized. Call initialize() first.");
		}

		const [queryVec] = await this.embedder.embed([query]);

		const results = await this.collection.query({
			queryEmbeddings: [Array.from(queryVec)],
			nResults: k,
		});

		const chunks: IChunk[] = [];
		if (results.ids && results.documents && results.metadatas) {
			for (let i = 0; i < results.ids[0].length; i++) {
				chunks.push({
					id: results.ids[0][i] as string,
					text: results.documents[0][i] as string,
					metadata: results.metadatas[0][i] as { chunkIndex: number; source: string },
				});
			}
		}

		logger.info("Retrieved chunks via HNSW index", {
			query: query.substring(0, 50),
			resultsCount: chunks.length,
			searchComplexity: "O(log n)",
		});
		return chunks;
	}

	async getStats(): Promise<{ count: number }> {
		if (!this.collection) {
			return { count: 0 };
		}
		const count = await this.collection.count();
		return { count };
	}
}

