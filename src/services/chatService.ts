import { type IRetrieverService } from "./interfaces/IRetriever.js";
import { Chat, type ChatDoc } from "../models/chat.model.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";
import { IRedisService } from "./interfaces/IRedisService.js";
import { ICryptoService } from "./interfaces/ICryptoService.js";
import { AppError } from "../utils/errors.js";

export class ChatService {
	constructor(
		private readonly retriever: IRetrieverService,
		private readonly redisService: IRedisService,
		private readonly cryptoService: ICryptoService,
		private readonly buildPrompt: (contextChunks: string[], question: string, history?: string[]) => string,
		private readonly generateLLMResponse: (prompt: string) => Promise<string>,
	) {}

	async processChat(
		message: string,
		userId: string,
		sessionId: string,
	): Promise<{ response: string; cached: boolean; timestamp: string }> {
		const key = `chat:${this.cryptoService.hashText(message)}`;
		try {
			const cached = await this.redisService.get(key);

			if (cached) {
				logger.info("Cache hit", { key });
				await Chat.create({ userId, message, response: cached, timestamp: new Date(), sessionId });
				return { response: cached, cached: true, timestamp: new Date().toISOString() };
			}

			const topChunks = await this.retriever.topKSimilar(message, 3);

			const historyDocs = await Chat.find({ userId })
				.sort({ timestamp: -1 })
				.limit(10)
				.lean();
			const historyPairs = (historyDocs as unknown as ChatDoc[])
				.reverse()
				.map((h) => `Q: ${h.message}\nA: ${h.response}`);

			const prompt = this.buildPrompt(topChunks.map((c) => c.text), message, historyPairs);

			const response = await this.generateLLMResponse(prompt);

			await Promise.all([
				this.redisService.setex(key, env.cacheTtlSeconds, response),
				Chat.create({ userId, message, response, timestamp: new Date(), sessionId }),
			]);

			return { response, cached: false, timestamp: new Date().toISOString() };
		} catch (error) {
			logger.error("Error processing chat request", { userId, sessionId, message: message.substring(0, 100), error: error instanceof Error ? error.message : String(error) });
			throw new AppError("Failed to process chat request. Please try again.");
		}
	}
}
