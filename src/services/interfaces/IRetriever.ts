/**
 * Retriever Interface
 * Common interface for all retrieval strategies (in-memory, ChromaDB, etc.)
 */

export interface IChunk {
	id: string;
	text: string;
	metadata?: Record<string, any>;
}

export interface IRetrieverService {
	/**
	 * Load knowledge from file
	 */
	loadFromFile(filePath: string): Promise<void>;

	/**
	 * Find top K most similar chunks to the query
	 */
	topKSimilar(query: string, k?: number): Promise<IChunk[]>;
}

