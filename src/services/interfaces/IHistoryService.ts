export interface IHistoryService {
  getChatHistory(userId: string, offset: number, limit: number): Promise<any[]>;
  countChatHistory(userId: string): Promise<number>;
}
