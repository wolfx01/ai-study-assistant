import { PDFParse } from "pdf-parse";
export async function extractPdfText(data: Uint8Array): Promise<string> {
  if (!Buffer.from(data.subarray(0, 1024)).includes(Buffer.from("%PDF-"))) throw new Error("Invalid PDF header.");
  const parser = new PDFParse({ data: Uint8Array.from(data) });
  try {
    const result = await parser.getText({ pageJoiner: "\n\n" });
    return result.pages.map(page => page.text.trim()).filter(Boolean).join("\n\n");
  } finally { await parser.destroy(); }
}
