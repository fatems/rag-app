import express, { Router } from "express";
import type { ChatController } from "../controllers/chatController.js";

export function createChatRouter(chatController: ChatController): Router {
	const router = express.Router();
	router.post("/", chatController.post);
	return router;
}
