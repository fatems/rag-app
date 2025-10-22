import type { Express } from "express";
import express from "express";
import type { Container } from "../container.js";
import { ChatController } from "../controllers/chatController.js";
import { HistoryController } from "../controllers/historyController.js";
import { createChatRouter } from "./chat.js";
import { createHistoryRouter } from "./history.js";
import { createHealthRouter } from "./health.js";

export function registerRoutes(app: Express, container: Container): void {
	const chatController = new ChatController(container.chatService);
	const historyController = new HistoryController(container.historyService);

	const chatRouter = createChatRouter(chatController);
	const historyRouter = createHistoryRouter(historyController);
	const healthRouter = createHealthRouter(container.redisService);

	const router = express.Router();
	router.use("/health", healthRouter);
	router.use("/chat", chatRouter);
	router.use("/history", historyRouter);
	app.use("/", router);
}
