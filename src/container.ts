import { InMemoryRetrieverService } from "./services/InMemoryRetrievalService.js";
import { ChromaDBRetrieverService } from "./services/chromaRetrievalService.js";
import { ChatService } from "./services/chatService.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { type IRetrieverService } from "./services/interfaces/IRetriever.js";
import { createEmbedder, type Embedder } from "./services/embeddingsService.js";
import { RedisService } from "./services/redisService.js";
import { EmbeddingCacheService } from "./services/embeddingCacheService.js";
import { IRedisService } from "./services/interfaces/IRedisService.js";
import { ICryptoService } from "./services/interfaces/ICryptoService.js";
import { CryptoService } from "./services/cryptoService.js";
import { generateLLMResponse } from "./external/llmExternal.js";
import { buildPrompt } from "./utils/prompt.js";
import { AppError } from "./utils/errors.js";
import { HistoryService } from "./services/historyService.js";
import { IHistoryService } from "./services/interfaces/IHistoryService.js";

/**
 * Application's dependency injection container.
 */
export interface Container {
	redisService: IRedisService;
	retriever: IRetrieverService;
	chatService: ChatService;
	embeddingCacheService: EmbeddingCacheService;
	cryptoService: ICryptoService;
	generateLLMResponse: typeof generateLLMResponse;
	buildPrompt: typeof buildPrompt;
	historyService: IHistoryService;
}

/**
 * Initializes all core services and resources.
 */
export async function createContainer(): Promise<Container> {
	logger.info("Initializing application services...");

	try {
		const redisService = new RedisService(env.redisUrl);
		await redisService.connect();

		const cryptoService = new CryptoService();

		const embeddingCacheService = new EmbeddingCacheService(redisService, env.cacheTtlSeconds, cryptoService);
		const embedder: Embedder = createEmbedder(embeddingCacheService);

		const useChromaDB = env.useChromaDB;
		
		let retriever: IRetrieverService;
		
		if (useChromaDB) {
			logger.info("Using ChromaDB with HNSW indexing (FAISS-like)");
			const chromaRetriever = new ChromaDBRetrieverService(embedder);
			await chromaRetriever.initialize();
			retriever = chromaRetriever;
			await retriever.loadFromFile("knowledge.txt");
			const stats = await chromaRetriever.getStats();
			logger.info("ChromaDB knowledge base loaded", { chunks: stats.count });
		} else {
			logger.info("Using in-memory retrieval (O(n) search)");
			retriever = new InMemoryRetrieverService(embedder);
			await retriever.loadFromFile("knowledge.txt");
			logger.info("In-memory knowledge base loaded", { chunks: (retriever as InMemoryRetrieverService).getChunksCount() });
		}

		const chatService = new ChatService(retriever, redisService, cryptoService, buildPrompt, generateLLMResponse);
		const historyService = new HistoryService();

		logger.info("All services initialized successfully.");
		return { redisService, retriever, chatService, embeddingCacheService, cryptoService, generateLLMResponse, buildPrompt, historyService };
	} catch (error) {
		logger.error("Application services failed to initialize", { error: error instanceof Error ? error.message : String(error) });
		throw new AppError("Application startup failed due to service initialization issues.");
	}
}

/**
 * Cleans up all resources.
 */
export async function cleanupContainer(container: Container): Promise<void> {
	logger.info("Cleaning up application resources...");

	await container.redisService.close();
	logger.info("Main Redis client closed");

	logger.info("All resources cleaned up successfully.");
}

