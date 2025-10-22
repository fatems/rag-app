import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Chat } from "../models/chat.model.js";
import { getPaginationMetadata } from "../utils/pagination.js";
import { IHistoryService } from "../services/interfaces/IHistoryService.js";

const paramsSchema = z.object({
	userId: z.string().min(1, "User ID cannot be empty"),
});

const querySchema = z.object({
	page: z.preprocess(Number, z.number().min(1, "Page number must be at least 1")).optional().default(1),
	limit: z.preprocess(Number, z.number().min(1, "Limit must be at least 1").max(100, "Limit cannot exceed 100")).optional().default(10),
});

export class HistoryController {
	constructor(private readonly historyService: IHistoryService) {}
	get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const { userId } = paramsSchema.parse(req.params);
			const { page, limit } = querySchema.parse(req.query);
			const offset = (page - 1) * limit;

			const totalDocs = await this.historyService.countChatHistory(userId);

			const pagination = getPaginationMetadata(totalDocs, page, limit);

			const docs = await this.historyService.getChatHistory(userId, offset, limit);

			res.json({ data: docs, pagination });
		} catch (error) {
			next(error);
		}
	};
}
