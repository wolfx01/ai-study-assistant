import { randomUUID } from "node:crypto";
import { currentUser, sameOrigin } from "@/lib/auth";
import { pool } from "@/lib/db";
export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Please log in." }, { status: 401 });
  const result = await pool().query("SELECT id,title,updated_at FROM conversations WHERE user_id=$1 ORDER BY updated_at DESC", [user.id]);
  return Response.json({ conversations: result.rows });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Please log in." }, { status: 401 });
  const result = await pool().query("INSERT INTO conversations(id,user_id) VALUES($1,$2) RETURNING id,title,messages", [randomUUID(), user.id]);
  return Response.json({ conversation: result.rows[0] });
}
