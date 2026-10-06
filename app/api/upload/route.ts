import { splitDocument } from "@/lib/documents";
import { storeDocument } from "@/lib/db";
import { serviceError } from "@/lib/errors";
import { extractPdfText } from "@/lib/pdf";
import { uploadLimit } from "@/lib/upload";
import { currentUser, sameOrigin } from "@/lib/auth";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Please log in." }, { status: 401 });
  let form;
  try { form = await request.formData(); } catch { return Response.json({ error: "Invalid file upload." }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File) || !/\.(txt|md|pdf)$/i.test(file.name)) return Response.json({ error: "Upload a .txt, .md, or .pdf file." }, { status: 400 });
  const isPdf = /\.pdf$/i.test(file.name);
  if (file.size > uploadLimit(file.name)) return Response.json({ error: isPdf ? "Maximum PDF size is 10 MB." : "Maximum text file size is 200 KB." }, { status: 413 });
  let text;
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    text = isPdf ? await extractPdfText(data) : new TextDecoder("utf-8", { fatal: true }).decode(data);
  }
  catch { return Response.json({ error: isPdf ? "Could not read this PDF. Upload a valid PDF without password protection." : "The file must use UTF-8 encoding." }, { status: 400 }); }
  if (isPdf && !text.trim()) return Response.json({ error: "This PDF has no extractable text. Scanned PDFs need OCR before uploading." }, { status: 400 });
  const chunks = splitDocument(text);
  if (!chunks.length || chunks.length > 200) return Response.json({ error: "Upload a nonempty document with at most 200 paragraphs/chunks." }, { status: 400 });
  try {
    await storeDocument(file.name, chunks, user.id);
    return Response.json({ status: "success", filename: file.name, chunks_stored: chunks.length });
  } catch (error) { const failure = serviceError(error); console.error("Upload failed", failure.error); return Response.json({ error: failure.error }, { status: failure.status }); }
}
