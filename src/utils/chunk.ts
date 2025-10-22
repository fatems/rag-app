export function splitIntoChunks(text: string, maxWords = 250): string[] {
	const words = text.split(/\s+/).filter(Boolean);
	const chunks: string[] = [];
	for (let i = 0; i < words.length; i += maxWords) {
		chunks.push(words.slice(i, i + maxWords).join(" "));
	}
	return chunks;
}
