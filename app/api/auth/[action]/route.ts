import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { currentUser, createSession, sessionCookie, sameOrigin } from "@/lib/auth";
import { hashPassword, verifyPassword, tokenHash } from "@/lib/password";
import { pool, ensureSchema } from "@/lib/db";
type Context = { params: Promise<{ action: string }> };
const attempts = new Map<string, { count: number; until: number }>();
export async function GET(_request: Request, context: Context) {
  if ((await context.params).action !== "me") return Response.json({ error: "Not found." }, { status: 404 });
  return Response.json({ user: await currentUser() });
}
export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const { action } = await context.params;
  if (!["login", "register", "logout"].includes(action)) return Response.json({ error: "Not found." }, { status: 404 });
  try {
    await ensureSchema();
    if (action === "logout") {
      const jar = await cookies(); const token = jar.get(sessionCookie)?.value;
      if (token) await pool().query("DELETE FROM sessions WHERE token_hash=$1", [tokenHash(token)]);
      jar.delete(sessionCookie); return Response.json({ success: true });
    }
    let body;
    try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = body?.password;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof password !== "string" || password.length < 8 || password.length > 128 || (action === "register" && (!name || name.length > 80))) return Response.json({ error: "Enter a valid email, name, and password of 8–128 characters." }, { status: 400 });
    for (const [key, value] of attempts) if (value.until < Date.now()) attempts.delete(key);
    const throttle = attempts.get(email) ?? { count: 0, until: Date.now() + 900000 };
    if (throttle.count >= 10) return Response.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    throttle.count++; attempts.set(email, throttle);
    let user;
    if (action === "register") {
      const result = await pool().query("INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4) RETURNING id,name,email", [randomUUID(), name, email, await hashPassword(password)]);
      user = result.rows[0];
    } else {
      const result = await pool().query("SELECT * FROM users WHERE email=$1", [email]);
      const found = result.rows[0];
      if (!found || !await verifyPassword(password, found.password_hash)) return Response.json({ error: "Incorrect email or password." }, { status: 401 });
      user = { id: found.id, name: found.name, email: found.email };
    }
    await createSession(user.id); attempts.delete(email);
    return Response.json({ user });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    return Response.json({ error: "Authentication failed. Please try again." }, { status: 500 });
  }
}
