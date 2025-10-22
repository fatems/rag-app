import mongoose, { Schema, Document, Model } from "mongoose";

export interface ChatDoc extends Document {
	userId: string;
	message: string;
	response: string;
	timestamp: Date;
	sessionId: string;
}

const ChatSchema = new Schema<ChatDoc>(
	{
		userId: { type: String, required: true, index: true },
		message: { type: String, required: true },
		response: { type: String, required: true },
		timestamp: { type: Date, required: true, default: () => new Date(), index: true },
		sessionId: { type: String, required: true, index: true },
	},
	{ versionKey: false },
);

ChatSchema.index({ userId: 1, timestamp: -1 });

export const Chat: Model<ChatDoc> =
	mongoose.models.Chat || mongoose.model<ChatDoc>("Chat", ChatSchema);
