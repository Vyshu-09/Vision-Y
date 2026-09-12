# UniPolicy AI — project spec (session 1)

See the original Cursor build prompt. Implementation notes:

- Backend: Node.js + Express + TypeScript (justified: same language as frontend, composable agent modules, Node test runner).
- Vector search: local hashed embeddings + cosine similarity over `policy_clauses`.
- Postgres + pgvector schema is in `backend/src/db/schema.sql`; runtime store is in-memory for the first working demo.
- LLM calls go through `backend/src/llm/llmClient.ts` only.
