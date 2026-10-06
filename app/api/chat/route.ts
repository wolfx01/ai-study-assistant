import { askAgent, type Message } from "@/lib/agent";
import { serviceError } from "@/lib/errors";
import { currentUser, sameOrigin, validId } from "@/lib/auth";
import { pool } from "@/lib/db";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const user = await currentUser();
  if (!user) return Response.json({ error: "Please log in." }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!validId(body?.conversationId) || typeof body?.query !== "string" || !body.query.trim() || body.query.length > 8000) return Response.json({ error: "Provide a conversation and a question of up to 8,000 characters." }, { status: 400 });
  const connection = await pool().connect();
  try {
    await connection.query("BEGIN");
    const result = await connection.query("SELECT messages FROM conversations WHERE id=$1 AND user_id=$2 FOR UPDATE", [body.conversationId, user.id]);
    if (!result.rows.length) { await connection.query("ROLLBACK"); return Response.json({ error: "Conversation not found." }, { status: 404 }); }
    const previous: Message[] = result.rows[0].messages;
    const history: Message[] = [...previous, { role: "user", content: body.query.trim() }];
    const response = await askAgent(history.slice(-40), user.id);
    history.push({ role: "assistant", content: response });
    await connection.query("UPDATE conversations SET messages=$1::jsonb,title=CASE WHEN messages='[]'::jsonb THEN $2 ELSE title END,updated_at=NOW() WHERE id=$3 AND user_id=$4", [JSON.stringify(history), body.query.trim().slice(0,70), body.conversationId, user.id]);
    await connection.query("COMMIT");
    return Response.json({ response, messages: history });
  } catch (error) { await connection.query("ROLLBACK"); const failure = serviceError(error); return Response.json({ error: failure.error }, { status: failure.status }); }
  finally { connection.release(); }
}
