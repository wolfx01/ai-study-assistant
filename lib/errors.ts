export function serviceError(error: unknown): { error: string; status: number } {
  const details = error as { status?: number; code?: string } | null;
  if (details?.status === 402) return { error: "The AI provider requires more credits for this request. Check your API balance or key spending limit.", status: 503 };
  if (details?.status === 401 || details?.code === "invalid_api_key") return { error: "OpenAI rejected the API key. Replace OPENAI_API_KEY in .env.local with a valid key, then restart the server.", status: 503 };
  if (details?.status === 429) return { error: "OpenAI quota or rate limit reached. Check your API billing and try again later.", status: 503 };
  if (details?.code === "ECONNREFUSED") return { error: "PostgreSQL is not running or cannot be reached. Start your database and check DB_HOST and DB_PORT in .env.local.", status: 503 };
  if (details?.code === "28P01") return { error: "PostgreSQL rejected the database credentials. Check DB_USER and DB_PASSWORD in .env.local.", status: 503 };
  if (details?.code === "3D000") return { error: "The configured PostgreSQL database does not exist. Create it or correct DB_NAME in .env.local.", status: 503 };
  if (details?.code === "0A000") return { error: "PostgreSQL needs the pgvector extension installed to store study notes.", status: 503 };
  return { error: "The request failed. Check your OpenAI and database configuration, then try again.", status: 500 };
}
