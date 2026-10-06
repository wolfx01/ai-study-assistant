import { Pool } from "pg";
import { getOpenAI } from "./openai";

const globalDB = globalThis as typeof globalThis & { studyPool?: Pool; studySchema?: Promise<void>; studyVector?: boolean };
export function pool() {
  return globalDB.studyPool ??= new Pool(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {
    host: process.env.DB_HOST ?? "localhost", port: Number(process.env.DB_PORT ?? 5432),
    database: process.env.DB_NAME ?? "chatdb", user: process.env.DB_USER ?? "postgres", password: process.env.DB_PASSWORD,
  });
}
export async function ensureSchema() {
  globalDB.studySchema ??= (async () => {
    await pool().query(`CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMPTZ NOT NULL);
      CREATE TABLE IF NOT EXISTS conversations (id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL DEFAULT 'New chat', messages JSONB NOT NULL DEFAULT '[]', updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
      CREATE INDEX IF NOT EXISTS conversations_user_idx ON conversations(user_id, updated_at DESC);`);
    const available = await pool().query("SELECT name FROM pg_available_extensions WHERE name = 'vector'");
    if (available.rows.length) await pool().query("CREATE EXTENSION IF NOT EXISTS vector");
    await pool().query(`CREATE TABLE IF NOT EXISTS documents (id SERIAL PRIMARY KEY, filename TEXT NOT NULL, content TEXT NOT NULL, embedding ${available.rows.length ? "vector(1536)" : "real[]"})`);
    await pool().query("ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE; CREATE INDEX IF NOT EXISTS documents_user_idx ON documents(user_id)");
    const column = await pool().query("SELECT udt_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'documents' AND column_name = 'embedding'");
    globalDB.studyVector = column.rows[0]?.udt_name === "vector";
  })().catch(error => { globalDB.studySchema = undefined; throw error; });
  await globalDB.studySchema;
}
export async function storeDocument(filename: string, chunks: string[], userId: string) {
  await ensureSchema();
  const embeddings = await getOpenAI().embeddings.create({ model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small", input: chunks });
  const connection = await pool().connect();
  try {
    await connection.query("BEGIN");
    for (const item of embeddings.data) {
      await connection.query(`INSERT INTO documents (filename, content, embedding, user_id) VALUES ($1, $2, $3::${globalDB.studyVector ? "vector" : "real[]"}, $4)`, [filename, chunks[item.index], globalDB.studyVector ? JSON.stringify(item.embedding) : item.embedding, userId]);
    }
    await connection.query("COMMIT");
  } catch (error) { await connection.query("ROLLBACK"); throw error; }
  finally { connection.release(); }
}
export async function searchDocuments(query: string, userId: string) {
  await ensureSchema();
  const documents = await pool().query("SELECT 1 FROM documents WHERE user_id=$1 LIMIT 1", [userId]);
  if (!documents.rows.length) return "No relevant study materials found.";
  const embedding = await getOpenAI().embeddings.create({ model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small", input: query });
  const queryVector = embedding.data[0].embedding;
  const result = globalDB.studyVector
    ? await pool().query("SELECT filename, content FROM documents WHERE user_id=$2 ORDER BY embedding <=> $1::vector LIMIT 3", [JSON.stringify(queryVector), userId])
    : await pool().query(`SELECT d.filename, d.content FROM documents d
        CROSS JOIN LATERAL (
          SELECT SUM(a::double precision*b::double precision) /
            NULLIF(SQRT(SUM(a::double precision*a::double precision))*SQRT(SUM(b::double precision*b::double precision)), 0) AS similarity
          FROM unnest(d.embedding, $1::real[]) AS components(a,b)
        ) score WHERE d.user_id=$2 ORDER BY score.similarity DESC NULLS LAST LIMIT 3`, [queryVector, userId]);
  return result.rows.map(row => `[Source: ${row.filename}]\n${row.content}`).join("\n\n---\n\n") || "No relevant study materials found.";
}
