import { Chat } from "../models/chat.model.js";
import { IHistoryService } from "./interfaces/IHistoryService.js";

export class HistoryService implements IHistoryService {
  async getChatHistory(userId: string, offset: number, limit: number): Promise<any[]> {
    const docs = await Chat.find({ userId })
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
    return docs;
  }

  async countChatHistory(userId: string): Promise<number> {
    return Chat.countDocuments({ userId });
  }
}
