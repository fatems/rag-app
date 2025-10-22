/**
 * OpenAPI/Swagger definitions
 * Centralized API documentation
 */

export const apiDocs = {
	openapi: "3.0.0",
	info: {
		title: "RAG Chatbot API",
		version: "1.0.0",
		description: "AI-powered chatbot with knowledge base retrieval",
	},
	servers: [
		{
			url: "http://localhost:3000",
			description: "Local development",
		},
	],
	paths: {
		"/chat": {
			post: {
				tags: ["Chat"],
				summary: "Send message to chatbot",
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: {
								type: "object",
								required: ["message", "userId"],
								properties: {
									message: { type: "string", example: "How do I install?" },
									userId: { type: "string", example: "user123" },
									sessionId: { type: "string", example: "session456" },
								},
							},
						},
					},
				},
				responses: {
					"200": {
						description: "Success",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										response: { type: "string" },
										cached: { type: "boolean" },
										timestamp: { type: "string" },
									},
								},
							},
						},
					},
					"400": { description: "Bad request" },
					"429": { description: "Rate limit exceeded" },
				},
			},
		},
		"/history/{userId}": {
			get: {
				tags: ["History"],
				summary: "Get user chat history",
				parameters: [
					{
						in: "path",
						name: "userId",
						required: true,
						schema: { type: "string" },
						description: "ID of the user to retrieve chat history for",
					},
					{
						in: "query",
						name: "page",
						required: false,
						schema: { type: "integer", minimum: 1, default: 1 },
						description: "Page number for pagination (default: 1)",
					},
					{
						in: "query",
						name: "limit",
						required: false,
						schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
						description: "Maximum number of chat entries to return per page (default: 10, max: 100)",
					},
				],
				responses: {
					"200": {
						description: "Success",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										data: {
											type: "array",
											items: {
												type: "object",
												properties: {
													userId: { type: "string" },
													message: { type: "string" },
													response: { type: "string" },
													timestamp: { type: "string" },
													sessionId: { type: "string" },
												},
											},
										},
										pagination: {
											type: "object",
											properties: {
												totalDocs: { type: "integer", description: "Total number of chat entries" },
												totalPages: { type: "integer", description: "Total number of pages" },
												currentPage: { type: "integer", description: "Current page number" },
												nextPage: { type: "integer", nullable: true, description: "Next page number, or null if on last page" },
												prevPage: { type: "integer", nullable: true, description: "Previous page number, or null if on first page" },
												limit: { type: "integer", description: "Number of entries per page" },
											},
										},
									},
								},
							},
						},
					},
					"400": { description: "Bad request" },
				},
			},
		},
		"/health": {
			get: {
				tags: ["Health"],
				summary: "Check system health",
				responses: {
					"200": {
						description: "System healthy",
						content: {
							"application/json": {
								schema: {
									type: "object",
									properties: {
										uptime: { type: "number" },
										timestamp: { type: "number" },
										status: { type: "string" },
										checks: {
											type: "object",
											properties: {
												mongodb: { type: "string" },
												redis: { type: "string" },
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	},
};

