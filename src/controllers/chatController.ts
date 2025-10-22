import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { ChatService } from "../services/chatService.js";

const chatSchema = z.object({
	message: z.string().min(1),
	userId: z.string().min(1),
	sessionId: z.string().optional(),
});

export class ChatController {
	constructor(private readonly chatService: ChatService) {}

	post = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const { message, userId, sessionId } = chatSchema.parse(req.body);
			const sid = sessionId ?? userId;
			const result = await this.chatService.processChat(message, userId, sid);
			res.json(result);
		} catch (error) {
			next(error);
		}
	};
}
