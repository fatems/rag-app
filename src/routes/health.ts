import express, { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { logger } from "../utils/logger.js";
import { IRedisService } from "../services/interfaces/IRedisService.js";

export function createHealthRouter(redisService: IRedisService): Router {
	const router = express.Router();

	router.get("/", async (req: Request, res: Response) => {
		const health = {
			uptime: process.uptime(),
			timestamp: Date.now(),
			status: "ok",
			checks: {
				mongodb: "unknown",
				redis: "unknown",
			},
		};

		try {
			// Check MongoDB
			if (mongoose.connection.readyState === 1) {
				health.checks.mongodb = "connected";
			} else {
				health.checks.mongodb = "disconnected";
				health.status = "degraded";
			}

			// Check Redis
			try {
				const ping = await redisService.ping();
				health.checks.redis = ping === "PONG" ? "connected" : "error";
			} catch {
				health.checks.redis = "error";
				health.status = "degraded";
			}

			const statusCode = health.status === "ok" ? 200 : 503;
			res.status(statusCode).json(health);
		} catch (error) {
			logger.error("Health check failed", error);
			health.status = "error";
			res.status(503).json(health);
		}
	});

	return router;
}

