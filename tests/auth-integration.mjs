import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
const base = 'http://localhost:3107';
const marker = randomUUID();
const emails = [`test-a-${marker}@example.com`, `test-b-${marker}@example.com`];
const password = 'Integration123!';
const pool = new pg.Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
async function request(path, body, cookie, extra = {}) {
  const response = await fetch(base + path, { method: body === undefined ? 'GET' : 'POST', headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...extra }, body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body) });
  const data = await response.json();
  return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0], headers: response.headers };
}
try {
  assert.equal((await request('/api/conversations')).status, 401);
  assert.equal((await request('/api/upload', new FormData())).status, 401);
  assert.equal((await request('/api/chat', {})).status, 401);
  const a = await request('/api/auth/register', { name: 'Test A', email: emails[0], password });
  const b = await request('/api/auth/register', { name: 'Test B', email: emails[1], password });
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.match(a.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(a.headers.get('set-cookie'), /SameSite=lax/i);
  assert.equal((await request('/api/auth/register', { name: 'Duplicate', email: emails[0], password })).status, 409);
  assert.equal((await request('/api/auth/login', { email: emails[0], password: 'WrongPassword' })).status, 401);
  assert.equal((await request('/api/auth/login', { email: emails[0].toUpperCase(), password })).status, 200);
  const created = await request('/api/conversations', {}, a.cookie);
  const id = created.data.conversation.id;
  assert.equal((await request(`/api/conversations/${id}`, undefined, b.cookie)).status, 404);
  assert.equal((await request('/api/chat', { conversationId: id, query: 'hello' }, b.cookie)).status, 404);
  assert.equal((await request('/api/conversations', undefined, b.cookie)).data.conversations.length, 0);
  assert.equal((await request('/api/conversations', {}, a.cookie, { Origin: 'https://untrusted.example' })).status, 403);
  const form = new FormData(); form.append('file', new Blob(['Private test note: the verification word is NEBULA-492.']), 'private-test.txt');
  assert.equal((await request('/api/upload', form, a.cookie)).status, 200);
  const answer = await request('/api/chat', { conversationId: id, query: 'What verification word is in private-test.txt? Cite the filename.' }, a.cookie);
  assert.equal(answer.status, 200); assert.match(answer.data.response, /NEBULA-492/);
  const history = await request(`/api/conversations/${id}`, undefined, a.cookie);
  assert.equal(history.data.conversation.messages.length, 2);
  const bChat = await request('/api/conversations', {}, b.cookie);
  const bAnswer = await request('/api/chat', { conversationId: bChat.data.conversation.id, query: 'What verification word is in private-test.txt?' }, b.cookie);
  assert.equal(bAnswer.status, 200); assert.ok(!bAnswer.data.response.includes('NEBULA-492'));
  await request('/api/auth/logout', {}, a.cookie);
  assert.equal((await request('/api/conversations', undefined, a.cookie)).status, 401);
  const login = await request('/api/auth/login', { email: emails[0], password });
  assert.equal((await request(`/api/conversations/${id}`, undefined, login.cookie)).data.conversation.messages.length, 2);
  await pool.query('UPDATE sessions SET expires_at=NOW()-INTERVAL \'1 second\' WHERE user_id=$1', [b.data.user.id]);
  assert.equal((await request('/api/conversations', undefined, b.cookie)).status, 401);
  console.log('PASS: registration, login, logout, expiry, saved history, cross-user conversation/document isolation, and origin protection.');
} finally {
  await pool.query('DELETE FROM users WHERE email=ANY($1::text[])', [emails]);
  await pool.end();
}
