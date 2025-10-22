/**
 * Custom Error Classes for structured error management.
 */

export class AppError extends Error {
	constructor(message: string, public readonly statusCode: number = 500, public readonly isOperational: boolean = true) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}

export class ValidationError extends AppError {
	constructor(message: string) {
		super(message, 400);
	}
}

export class NotFoundError extends AppError {
	constructor(message: string = "Resource not found") {
		super(message, 404);
	}
}

export class CacheError extends AppError {
	constructor(message: string) {
		super(message, 500);
	}
}

export class ExternalServiceError extends AppError {
	constructor(message: string, public readonly service: string, statusCode: number = 502) {
		super(message, statusCode);
	}
}

