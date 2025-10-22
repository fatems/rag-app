import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export async function connectMongo(): Promise<void> {
	mongoose.set("strictQuery", true);
	await mongoose.connect(env.mongoUri);
	logger.info("Connected to MongoDB");
}
