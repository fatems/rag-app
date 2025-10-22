import express, { Router } from "express";
import type { HistoryController } from "../controllers/historyController.js";

export function createHistoryRouter(historyController: HistoryController): Router {
	const router = express.Router();
	router.get("/:userId", historyController.get);
	return router;
}
