/**
 * LLM service for interacting with OpenRouter API.
 */

import axios from "axios";
import https from "https";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { AppError, ExternalServiceError } from "../utils/errors.js";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

const axiosInstance = axios.create({
	httpsAgent: new https.Agent({
		rejectUnauthorized: false, // In development, bypass SSL validation
		keepAlive: true,
	}),
	timeout: 30000, // 30-second timeout
});

/**
 * Generates a response from the LLM.
 */
export async function generateLLMResponse(prompt: string): Promise<string> {
	const startTime = Date.now();

	try {
		const { data } = await axiosInstance.post(
			`${OPENROUTER_BASE}/chat/completions`,
			{
				model: "openai/gpt-3.5-turbo",
				messages: [{ role: "user", content: prompt }],
				max_tokens: 500,
				temperature: 0.7,
			},
			{
				headers: {
					Authorization: `Bearer ${env.openRouterApiKey}`,
					"Content-Type": "application/json",
					"HTTP-Referer": env.appUrl || "http://localhost:3000",
					"X-Title": "RAG Chatbot",
				},
			},
		);

		const content: string = data.choices?.[0]?.message?.content ?? "";
		const latency = Date.now() - startTime;

		logger.info("LLM response generated successfully", {
			latency: `${latency}ms`,
			tokenCount: content.length,
		});

		return content;
	} catch (error) {
		const latency = Date.now() - startTime;
		logger.error("LLM API error occurred", {
			error: error instanceof Error ? error.message : String(error),
			latency: `${latency}ms`,
		});

		// Categorize and re-throw specific errors for better handling upstream
		if (axios.isAxiosError(error)) {
			if (error.response?.status === 401) {
				throw new ExternalServiceError("Invalid OpenRouter API key. Please check your .env file.", "OpenRouter");
			}
			if (error.response?.status === 429) {
				throw new ExternalServiceError("Rate limit exceeded on OpenRouter API. Please try again later.", "OpenRouter");
			}
			if (error.code === 'ECONNABORTED') {
				throw new ExternalServiceError("LLM API request timed out.", "OpenRouter", 504);
			}
			if (error.code === 'ERR_NETWORK') {
				throw new ExternalServiceError("Network error connecting to LLM API.", "OpenRouter", 502);
			}
		}
		throw new ExternalServiceError("Failed to generate LLM response due to an unexpected error.", "OpenRouter");
	}
}
