import { currentUser, validId } from "@/lib/auth";
import { pool } from "@/lib/db";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Please log in." }, { status: 401 });
  const { id } = await context.params;
  if (!validId(id)) return Response.json({ error: "Not found." }, { status: 404 });
  const result = await pool().query("SELECT id,title,messages FROM conversations WHERE id=$1 AND user_id=$2", [id, user.id]);
  if (!result.rows.length) return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ conversation: result.rows[0] });
}
