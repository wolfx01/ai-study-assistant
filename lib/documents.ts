export function splitDocument(text: string, size = 2000): string[] {
  const chunks: string[] = [];
  for (const paragraph of text.split(/\r?\n\s*\r?\n/)) {
    const value = paragraph.trim();
    for (let i = 0; i < value.length; i += size) chunks.push(value.slice(i, i + size));
  }
  return chunks;
}
