import { test } from "node:test";
import assert from "node:assert/strict";
import { calculate } from "../lib/calculator";
import { splitDocument } from "../lib/documents";
import { serviceError } from "../lib/errors";
import { extractPdfText } from "../lib/pdf";
import { pdfFixture } from "./pdf-fixture";
import { retrievalQuery, retrievalMessages } from "../lib/rag";
import { hashPassword, verifyPassword, tokenHash } from "../lib/password";
test("passwords use distinct salts and sessions use one-way hashes", async () => {
  const first = await hashPassword("TestPassword123");
  const second = await hashPassword("TestPassword123");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("TestPassword123", first), true);
  assert.equal(await verifyPassword("wrong", first), false);
  assert.equal(await verifyPassword("wrong", "invalid"), false);
  assert.notEqual(tokenHash("session-token"), "session-token");
});
test("RAG uses user follow-up context and includes retrieved evidence before generation", () => {
  const query = retrievalQuery([{ role: "user", content: "man howa bilal" }, { role: "assistant", content: "An unsupported biography" }, { role: "user", content: "la bilal chouichou" }]);
  assert.equal(query, "man howa bilal\nla bilal chouichou");
  const messages = retrievalMessages(query, "[Source: cv.pdf]\nBilal is a developer.");
  assert.equal(messages[0].role, "assistant");
  assert.equal(messages[1].role, "tool");
  assert.ok(JSON.stringify(messages).includes("cv.pdf"));
  assert.equal(retrievalQuery([{ role: "user", content: "x".repeat(9000) }]).length, 8000);
});
test("PDF extraction reads text, handles empty pages, and rejects malformed files", async () => {
  assert.match(await extractPdfText(pdfFixture()), /ORBIT-824/);
  assert.equal((await extractPdfText(pdfFixture(""))).trim(), "");
  await assert.rejects(() => extractPdfText(Buffer.from("not a PDF")));
  await assert.rejects(() => extractPdfText(Buffer.from("%PDF-1.4 broken")));
});
test("service failures explain configuration problems without exposing secrets", () => {
  assert.match(serviceError({ status: 401, message: "secret-key" }).error, /Replace OPENAI_API_KEY/);
  assert.match(serviceError({ code: "ECONNREFUSED" }).error, /Start your database/);
  assert.equal(serviceError({ status: 401 }).status, 503);
  assert.ok(!serviceError(new Error("secret-key")).error.includes("secret-key"));
});
test("calculator preserves arithmetic and rejects code and assignments", () => {
  assert.equal(calculate("(450 * 12) + 85"), "5485");
  assert.equal(calculate("sqrt(16) + pow(2, 3)"), "12");
  for (const expression of ['import("fs")', "a = 4", "sqrt.constructor", "1 / 0", "999!"]) assert.throws(() => calculate(expression));
});
test("documents support CRLF, skip blank text, and bound long paragraphs", () => {
  assert.deepEqual(splitDocument(" first\r\n\r\nsecond "), ["first", "second"]);
  assert.deepEqual(splitDocument(" \n\n "), []);
  assert.deepEqual(splitDocument("abcdef", 3), ["abc", "def"]);
});
