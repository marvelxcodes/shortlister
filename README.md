# Shortlister — GenAI Recruitment Augmentation

A Next.js + Supabase app that replaces brittle keyword filtering with deep semantic understanding. Recruiters upload a job description and a batch of CVs; the platform parses each CV into structured JSON via the Vercel AI SDK, scores candidates deterministically using cosine similarity on NIM embeddings plus a one-hop skill-graph match, fans the work out through a `pgmq` queue, audits the final shortlist for pedigree-vs-skill skew, and generates Delta-Based RAG justifications + tailored interview questions for the top picks.

See `AGENTS.md` for the full architecture spec.

---

## Quick start

```bash
bun install
bun run dev
# → http://localhost:3000
```

With no env vars, Shortlister runs in **local dev mode**:

- File-backed in-memory store under `.next/cache/store.json`
- Deterministic hash-bag-of-words embedding fallback
- Heuristic CV/JD parser
- In-process queue drained on demand

Open `/jobs/new`, paste a JD, drop a few CVs (PDF / DOCX / TXT) — the full pipeline runs end-to-end including the auditor.

## Wiring up production

Add to `.env.local`:

```ini
NVIDIA_NIM_API_KEY=...                        # enables real parsing + embeddings
NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1
NIM_REASONING_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1
NIM_EMBEDDING_MODEL=nvidia/nv-embedqa-e5-v5

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE=...                     # used by the worker route

WORKER_SECRET=...                             # gate the /api/worker endpoint
WORKER_BATCH_SIZE=5
WORKER_CONCURRENCY=3
```

Then apply the schema:

```bash
supabase db push supabase/migrations/0001_init.sql
# inside Supabase SQL editor, set the cron target:
alter database postgres set app.worker_url    = 'https://your-domain.com/api/worker';
alter database postgres set app.worker_secret = 'WORKER_SECRET';
```

## Architecture at a glance

| Stage           | Tech                             | Where                        |
| --------------- | -------------------------------- | ---------------------------- |
| Ingest          | Server Action + FormData         | `/api/jobs`                  |
| Text extract    | `unpdf` / `mammoth`              | `src/lib/ai/extractor.ts`    |
| Parser          | `generateObject` + Zod retry     | `src/lib/ai/parser.ts`       |
| Embeddings      | NIM `nv-embedqa-e5-v5`           | `src/lib/ai/embed.ts`        |
| Matcher         | Cosine + 1-hop graph jaccard     | `src/lib/scoring/matcher.ts` |
| Auditor         | Pedigree-vs-skill medians        | `src/lib/scoring/auditor.ts` |
| Insights        | Delta-Based RAG via NIM          | `src/lib/ai/insights.ts`     |
| Queue           | `pgmq` (Supabase) / in-mem       | `src/lib/db/store.ts`        |
| Worker          | Route handler + `p-limit`        | `/api/worker`                |
| Worker tick     | `pg_cron` + `pg_net`             | `supabase/migrations/`       |
| Progress UI     | `/api/jobs/[id]/progress`        | `JobDetailClient`            |

## Evals

```bash
bun run dev
bun run evals
```

Runs every fixture in `evals/fixtures/*.json`. Each defines a JD, a set of CVs, and the expected ranking. The harness asserts that the top candidate is correctly identified — extend with Spearman or weighted-Tau as needed.
