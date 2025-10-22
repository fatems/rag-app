import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import mongoose from "mongoose";
import { connectMongo } from "../config/mongo.js";
import { createContainer, cleanupContainer, type Container } from "../container.js";
import { registerRoutes } from "../routes/index.js";
import { errorHandler } from "../middleware/errorHandler.js";
import { swaggerSpec } from "../config/swagger.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export async function startServer(): Promise<void> {
	await connectMongo();
	logger.info("MongoDB connected");

	const container = await createContainer();

	const app = express();
	
	app.use(cors());
	app.use(express.json({ limit: "1mb" }));
	app.use(morgan("dev"));
	app.use(rateLimit({
		windowMs: 300_000, // 5 minutes
		max: 300, // up to 300 requests per 5 minutes per IP (~1 req/sec avg)
		standardHeaders: true,
		legacyHeaders: false,
	}));

	// Swagger API docs (must be before helmet to avoid CSP issues)
	app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
		customCss: '.swagger-ui .topbar { display: none }',
	}));
	app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));
	
	// Configure helmet with CSP (applied after swagger to avoid blocking it)
	app.use((req, res, next) => {
		if (req.path.startsWith('/api-docs')) {
			return next();
		}
		helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					styleSrc: ["'self'", "'unsafe-inline'"],
					scriptSrc: ["'self'", "'unsafe-inline'"],
					imgSrc: ["'self'", "data:", "https:"],
				},
			},
		})(req, res, next);
	});

	registerRoutes(app, container);
	app.use(errorHandler);

	const port = env.port;
	const host = '0.0.0.0';
	const server = app.listen(port, host, () => {
		logger.info(`Server listening on http://0.0.0.0:${port}`);
		logger.info(`Access via: http://localhost:${port}`);
	});

	const shutdown = async (signal: string) => {
		logger.info(`${signal} received, shutting down...`);

		server.close(async () => {
			logger.info("HTTP server closed");

			try {
				await cleanupContainer(container);
				await mongoose.disconnect();
				logger.info("All resources cleaned up");
				process.exit(0);
			} catch (error) {
				logger.error("Shutdown failed", error);
				process.exit(1);
			}
		});

		setTimeout(() => {
			logger.error("Forced shutdown timeout");
			process.exit(1);
		}, 30000);
	};

	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("SIGINT", () => shutdown("SIGINT"));
}
