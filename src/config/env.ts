import dotenv from "dotenv";
import { AppError } from "../utils/errors.js";

// Load environment variables from .env file
dotenv.config();

function requireEnv(name: string, fallback?: string): string {
	const val = process.env[name] ?? fallback;
	if (!val) throw new AppError(`Missing required env var: ${name}`, 500, false);
	return val;
}

export const env = {
	nodeEnv: process.env.NODE_ENV ?? "development",
	port: Number(process.env.PORT ?? 3000),
	appUrl: process.env.APP_URL ?? "http://localhost:3000",
	openRouterApiKey: requireEnv("OPENROUTER_API_KEY", ""),
	cohereApiKey: process.env.COHERE_API_KEY ?? "",
	huggingFaceModel: process.env.HUGGINGFACE_MODEL ?? "Xenova/all-MiniLM-L6-v2",
	mongoUri: requireEnv("MONGODB_URI", "mongodb://localhost:27017/rag"),
	redisUrl: requireEnv("REDIS_URL", "redis://localhost:6379"),
	chromaUrl: process.env.CHROMA_URL ?? "http://localhost:8000",
	chromaHnswEf: Number(process.env.CHROMA_HNSW_EF ?? 200),
	chromaHnswM: Number(process.env.CHROMA_HNSW_M ?? 16),
	useChromaDB: process.env.USE_CHROMADB === "true",
	cacheTtlSeconds: 3600 as const,
	// Transformers.js / HF settings
	hfOffline:
		process.env.HF_HUB_OFFLINE === "1" ||
		process.env.TRANSFORMERS_OFFLINE === "1" ||
		process.env.HF_HUB_OFFLINE === "true" ||
		process.env.TRANSFORMERS_OFFLINE === "true" ||
		false,
	hfCacheDir: process.env.TRANSFORMERS_CACHE || process.env.HF_HOME || "",
};
