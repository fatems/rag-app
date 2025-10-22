import type { EmbeddingVector } from "../services/embeddingsService.js";

export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < a.length && i < b.length; i++) {
		const va = a[i];
		const vb = b[i];
		dot += va * vb;
		na += va * va;
		nb += vb * vb;
	}
	if (na === 0 || nb === 0) return 0;
	return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
