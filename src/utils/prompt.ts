import { logger } from "../utils/logger.js";
import { addLanguageContext } from "../utils/language.js";

/**
 * Builds the prompt string for the LLM.
 */
export function buildPrompt(contextChunks: string[], question: string, history: string[] = []): string {
	const maxContextLength = 2000;
	const maxHistoryLength = 1000;

	let context = contextChunks.join("\n---\n");
	if (context.length > maxContextLength) {
		context = context.substring(0, maxContextLength) + "... [truncated]";
		logger.warn("Context truncated to fit LLM token limit", { originalLength: context.length, newLength: maxContextLength });
	}

	let historyText = "";
	if (history.length > 0) {
		const historyString = history.join("\n");
		if (historyString.length > maxHistoryLength) {
			const recentHistory = history.slice(-5);
			historyText = `Previous conversation:\n${recentHistory.join("\n")}\n\n`;
		} else {
			historyText = `Previous conversation:\n${historyString}\n\n`;
		}
	}

	let prompt = `You are a helpful assistant. Answer based on the provided context and conversation history.\n\n${historyText}Context:\n${context}\n\nQuestion: ${question}\n\nInstructions:\n- If the answer is in the context, provide a clear and concise response\n- If the answer is NOT in the context, say "I don't have that information in my knowledge base"\n- Use the conversation history to maintain context\n- Be helpful and friendly\n\nAnswer:`;

	return addLanguageContext(prompt, question);
}
