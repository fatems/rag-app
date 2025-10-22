import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
	// Log the error
	logger.error({
		message: err.message,
		stack: err.stack,
		name: err.name,
		path: req.path,
		method: req.method,
	});

	// Handle Zod validation errors
	if (err instanceof ZodError) {
		res.status(400).json({
			error: "Validation Error",
			details: err.issues.map((e) => ({
				path: e.path.join("."),
				message: e.message,
			})),
		});
		return;
	}

	// Handle custom application errors
	if (err instanceof AppError) {
		res.status(err.statusCode).json({
			error: err.message,
			...(err instanceof Error && err.constructor.name !== "AppError" && { type: err.constructor.name }),
		});
		return;
	}

	// Handle unknown errors
	const isDevelopment = process.env.NODE_ENV !== "production";
	res.status(500).json({
		error: isDevelopment ? err.message : "Internal Server Error",
		...(isDevelopment && { stack: err.stack }),
	});
};