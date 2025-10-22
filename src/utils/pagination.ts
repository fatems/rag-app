/**
 * Pagination Utility.
 */

export interface PaginationMetadata {
	totalDocs: number;
	totalPages: number;
	currentPage: number;
	nextPage: number | null;
	prevPage: number | null;
	limit: number;
}

export function getPaginationMetadata(
	totalDocs: number,
	currentPage: number,
	limit: number,
): PaginationMetadata {
	const totalPages = Math.max(1, Math.ceil(totalDocs / limit));

	const nextPage = currentPage < totalPages ? currentPage + 1 : null;

	const prevPage = currentPage > 1 ? currentPage - 1 : null;

	return {
		totalDocs,
		totalPages,
		currentPage,
		nextPage,
		prevPage,
		limit,
	};
}


