/**
 * Multi-lingual Support Utilities.
 */

import { logger } from "./logger.js";

export type Language = "en" | "fa" | "unknown";

export function detectLanguage(text: string): Language {
	if (!text || text.trim().length === 0) {
		return "unknown";
	}

	const persianChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
	
	const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
	
	const total = persianChars + latinChars;
	
	if (total === 0) {
		return "unknown";
	}

	if (persianChars / total > 0.3) {
		return "fa";
	}
	
	if (latinChars / total > 0.3) {
		return "en";
	}

	return "unknown";
}

export function getLanguageInstruction(language: Language): string {
	switch (language) {
		case "fa":
			return "لطفاً پاسخ را به زبان فارسی بدهید (Please respond in Persian/Farsi).";
		case "en":
			return "Please respond in English.";
		case "unknown":
		default:
			return "Please respond in the same language as the question.";
	}
}

export function addLanguageContext(prompt: string, query: string): string {
	const language = detectLanguage(query);
	const instruction = getLanguageInstruction(language);
	
	logger.info("Language detected for query", { language, query: query.substring(0, 50) });
	
	return `${prompt}\n\nLanguage Note: ${instruction}`;
}

