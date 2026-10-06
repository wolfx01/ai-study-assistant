# AI Study Assistant

Next.js App Router + TypeScript application. React chat UI, `/api/chat`, and `/api/upload` run together; no Python server is required. Uses OpenAI tool calling and PostgreSQL with pgvector for study note retrieval.

## Run locally

1. Install Node.js 20.9+ and run `npm install` (or `pnpm install`).
2. Copy `.env.example` to `.env.local`, then set `OPENAI_API_KEY` and your database credentials. You can reuse values from `api_chat/.env`. Never put the key in a `NEXT_PUBLIC_` variable.
3. Set the same strong password in `DB_PASSWORD` and `CHATBOT_DB_PASSWORD`, then run `docker compose --env-file .env.local up -d --wait`. This project's dedicated `chatbottest-postgres` container uses host port **5434** and its own `chatbottest_study-data` volume. Set `DB_HOST=127.0.0.1`, `DB_PORT=5434`, `DB_NAME=chatdb`, and `DB_USER=study`. The app creates the documents table if missing and uses PostgreSQL real arrays with cosine similarity. Existing pgvector tables are also supported when connecting to a PostgreSQL installation with that extension.
4. Run `npm run dev` and open http://localhost:3000.

`npm run build` creates a production build; `npm start` serves it. `npm run typecheck` and `npm test` verify the code.

## Features

- Register with name, email, and an 8–128 character password; log in and log out. Passwords use salted scrypt hashes. Opaque sessions are stored as SHA-256 hashes in PostgreSQL and expire after seven days. Cookies are HttpOnly and SameSite=Lax; set `AUTH_COOKIE_SECURE=true` on HTTPS deployments. Authentication attempts are limited per email in the current server process.
- Conversations and complete message histories are stored in PostgreSQL under the authenticated user's ID. The sidebar lists only that user's conversations; the server supplies the latest 40 messages to the assistant and checks ownership for every read and write.
- Uploaded documents and all RAG searches are scoped to the authenticated user. Files uploaded before accounts existed are preserved with no owner and are excluded from searches; re-upload them after signing in. Legacy browser history is not imported into arbitrary accounts.
- Upload UTF-8 `.txt` or `.md` notes (200 KB maximum), or text-based `.pdf` files (10 MB maximum; up to 200 chunks). PDF text is extracted on the server before embedding. Scanned PDFs require OCR first; password-protected or malformed PDFs are rejected. Uploads use embeddings and an atomic database transaction.
- Search notes, perform arithmetic without JavaScript/Python eval, and retrieve UTC date/time through tools.
- RAG runs before every answer: the last three user questions form the retrieval query, PostgreSQL ranks document chunks by embedding cosine similarity, and the top three chunks are passed to the model as tool evidence. The assistant is instructed to prioritize relevant document facts and cite filenames. Additional tool searches remain available for follow-ups.
- `OPENAI_MODEL` optionally overrides the default `gpt-4o-mini`.
- OpenRouter is supported: set `OPENAI_BASE_URL=https://openrouter.ai/api/v1`, `OPENAI_MODEL=openai/gpt-4o-mini`, and `OPENAI_EMBEDDING_MODEL=openai/text-embedding-3-small`, with an OpenRouter key in `OPENAI_API_KEY`.

The original `chat/` and `api_chat/` files remain as a migration reference and are not used by Next.js. Login, registration, session revocation, ownership checks, and same-origin mutation checks are enforced in API routes. Email verification and password recovery are not implemented.
