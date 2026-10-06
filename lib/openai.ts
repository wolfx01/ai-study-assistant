import OpenAI from "openai";
let client: OpenAI | undefined;
export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error("Set OPENAI_API_KEY in .env.local before using the assistant.");
  return client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL || undefined });
}
