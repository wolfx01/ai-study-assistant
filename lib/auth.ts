import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { pool, ensureSchema } from "./db";
import { tokenHash } from "./password";
export type User = { id: string; name: string; email: string };
export const sessionCookie = "study_session";
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  await ensureSchema();
  const result = await pool().query("SELECT u.id,u.name,u.email FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()", [tokenHash(token)]);
  return result.rows[0] ?? null;
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await pool().query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '7 days')", [tokenHash(token), userId]);
  (await cookies()).set(sessionCookie, token, { httpOnly: true, sameSite: "lax", secure: process.env.AUTH_COOKIE_SECURE === "true", path: "/", maxAge: 604800 });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
export function validId(id: unknown): id is string { return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id); }
