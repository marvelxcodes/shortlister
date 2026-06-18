# Shortlister

**AI-Augmented Recruitment Platform — Screen 1,000 CVs. Surface the 10 who matter. Explain why.**

Built for *Assignment 5 · HR AI* (15 + 3 marks). A GenAI-native recruitment
augmentation SaaS that replaces brittle keyword filtering with deep semantic
understanding, deterministic scoring, transparent explanations, and a bias
audit.

```
Recruiter uploads JD + 20 CVs
        │
        ▼
   Parser ──► Matcher ──► Auditor ──► Insights
    (LLM)   (math+graph)  (math)    (Delta-RAG)
        │                                 │
        ▼                                 ▼
  Ranked shortlist ◄────  Justifications + interview questions
```

---

## How Shortlister meets the assignment

### Required core features

| # | Spec feature | Shortlister implementation | Code |
| - | ------------ | -------------------------- | ---- |
| 1 | **JD parser** — hard skills, soft skills, experience, must-have vs nice-to-have | NIM Nemotron with strict Zod schema, structured-outputs enforced, retry loop with Zod-issue-aware repair hints, heuristic fallback for offline dev | [`src/lib/ai/parser.ts`](src/lib/ai/parser.ts) ([schemas.ts](src/lib/types/schemas.ts)) |
| 2 | **Batch CV ingestion** — PDF / DOCX, structured candidate profiles | `unpdf` + `mammoth` text extraction; structured parse to ParsedCV (skills, roles, tenure, education, certifications, links); multi-file `<Dropzone>` with up to 20 CVs per batch | [`src/lib/ai/extractor.ts`](src/lib/ai/extractor.ts) · [`src/components/jobs/dropzone.tsx`](src/components/jobs/dropzone.tsx) |
| 3 | **Semantic scoring** — not keyword, score breakdown per requirement | `score = w_v·cosine(JD,CV) + w_g·jaccard(JD,CV_expanded) − w_e·gap` using NIM `nv-embedqa-e5-v5` asymmetric embeddings (JD=query, CV=passage) and a one-hop walk over a hand-curated skill knowledge graph (so "Next.js" matches a JD asking for "React") | [`src/lib/scoring/matcher.ts`](src/lib/scoring/matcher.ts) · [`src/lib/graph/skill-graph.ts`](src/lib/graph/skill-graph.ts) · [`data/skills/`](data/skills/) |
| 4 | **Explainable rankings** — per-candidate justification of fit, gaps, what to explore | Delta-Based RAG: the LLM never sees the raw CV, only (JD requirements, matched skill nodes, missing skill nodes, subscores). Small prompts, deterministic grounding, no hallucinated facts | [`src/lib/ai/insights.ts`](src/lib/ai/insights.ts) |
| 5 | **Bias / diversity flags** — homogeneous shortlist warnings, non-traditional surfacing | Pedigree-vs-skill median delta + non-traditional flag for high-skill candidates without a formal degree or FAANG-tier employer. Optional **blind mode** masks name / school / employer in the UI without stripping the underlying data | [`src/lib/scoring/auditor.ts`](src/lib/scoring/auditor.ts) · [`src/components/jobs/audit-panel.tsx`](src/components/jobs/audit-panel.tsx) |
| 6 | **Interview question generator** — tailored to the candidate, probing claimed skills + gaps | The Insights agent emits 4 questions per candidate, each anchored to a specific missing skill node ("targetGap") with 1–3 probes and a difficulty hint. Drives the per-candidate detail page | [`src/lib/ai/insights.ts`](src/lib/ai/insights.ts) · [`src/app/jobs/[id]/candidates/[cid]/page.tsx`](src/app/jobs/%5Bid%5D/candidates/%5Bcid%5D/page.tsx) |

### Success metrics

| Metric | How Shortlister hits it | How to verify |
| ------ | ----------------------- | ------------- |
| **Strong candidates surface above weak ones** | Eval harness pins top-1 across fixtures; deterministic math, no LLM in the ranking path | `bun run evals` against [`evals/fixtures/`](evals/fixtures/) |
| **Per-candidate, non-generic explanations** | Delta-RAG conditions on each candidate's own matched + missing skill nodes; same prompt with different inputs → different output. The LLM is forbidden from inventing facts not present in the inputs | Compare the `insights.justification` field across two candidates for the same job |
| **Tailored interview questions** | Each `interviewQuestions[i].targetGap` references a concrete missing skill from the matcher | Open `/jobs/<id>/candidates/<cid>` for any candidate |
| **20+ CVs end-to-end in under 60 s** | Per-stage budget bounded; fan-out via `pgmq` + `p-limit` (CONCURRENCY=3 by default), heavy math kept off the LLM. JD parse is once, CV parse + insight is the LLM path; everything else is `< 100 ms` per CV | The `/jobs/[id]` page shows realized stage timings live |
| **Bias flag triggers on a skewed batch** | Auditor raises `pedigree_skew` when the shortlist's pedigree-subscore median is top-quartile while skill-subscore median is mid; per-candidate `high_skill_no_degree` and `high_skill_non_faang` flags | Upload a JD + CV batch where all candidates are from elite schools but with shallow skill match — the audit panel lights up |

### Bonus design decisions

- **AI is reserved for what only AI can do.** The Matcher and Auditor are pure math — no LLM hallucinations in the ranking path. The LLM only does (a) structured parsing into a Zod schema and (b) natural-language synthesis from already-deterministic inputs.
- **Asymmetric retrieval embeddings.** JDs are embedded as `input_type: query`, CVs as `input_type: passage`. Most reference recruitment systems get this wrong and degrade silently.
- **One-hop graph expansion.** Eliminates the canonical false-negative: "candidate has Next.js, JD asks for React → no match."
- **Blind-mode without data loss.** Name, school, and employer are masked in the UI, but the underlying scoring sees everything. Recruiters can toggle without re-running.
- **Pre-computed schema-aware retry.** When the LLM returns invalid JSON, the next attempt is fed the exact Zod issue list as a repair hint.

---

## Try it (60 seconds)

```bash
bun install
bun dev
# → http://localhost:3000/jobs/new
```

Paste a JD, drop a few CVs (`.pdf`, `.docx`, `.txt`), submit. Without NIM
credentials the app runs in offline mode (heuristic parser + hash-bag
embedding) so the full pipeline is still demonstrable.

---

## Architecture

Hub-and-spoke multi-agent pipeline, all running inside Next.js Node-runtime
routes — no separate Python service.

| Stage | Tech | File |
| ----- | ---- | ---- |
| Ingest (Server Action) | Next.js Server Action + FormData (20 MB body cap) | [`src/lib/workers/server-actions.ts`](src/lib/workers/server-actions.ts) |
| Text extract (inline at ingest) | `unpdf` (PDF), `mammoth` (DOCX) | [`src/lib/ai/extractor.ts`](src/lib/ai/extractor.ts) |
| JD parse | NIM Nemotron + Zod `generateObject` w/ structured outputs | [`src/lib/ai/parser.ts`](src/lib/ai/parser.ts) |
| Embeddings | NIM `nv-embedqa-e5-v5`, asymmetric query/passage | [`src/lib/ai/embed.ts`](src/lib/ai/embed.ts) |
| Queue | `pgmq` (Supabase) in prod, in-memory in dev | [`src/lib/db/store.ts`](src/lib/db/store.ts) |
| Worker | Route handler + `p-limit`, drains a batch per tick | [`src/app/api/worker/route.ts`](src/app/api/worker/route.ts) |
| Worker tick | `pg_cron` + `pg_net` every 15 s, calls `/api/worker` with the configured secret | [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) · [`supabase/migrations/0002_worker_config.sql`](supabase/migrations/0002_worker_config.sql) |
| Matcher (math) | Cosine + 1-hop skill-graph jaccard + experience penalty | [`src/lib/scoring/matcher.ts`](src/lib/scoring/matcher.ts) |
| Auditor (math) | Pedigree-vs-skill median delta + non-traditional flags | [`src/lib/scoring/auditor.ts`](src/lib/scoring/auditor.ts) |
| Insights | Delta-Based RAG (matched + missing skill nodes only) | [`src/lib/ai/insights.ts`](src/lib/ai/insights.ts) |
| Progress UI | Server Component + polling `/api/jobs/[id]/progress` | [`src/components/jobs/job-detail-client.tsx`](src/components/jobs/job-detail-client.tsx) |
| Notifications | Job-state-derived feed surfaced in the top bar | [`src/app/api/notifications/route.ts`](src/app/api/notifications/route.ts) |

### Per-stage performance budget (per CV, parallelized)

| Stage | Budget (p95) | Notes |
| ----- | ------------ | ----- |
| Text extract | 2 s | `unpdf` / `mammoth` on Node, no LLM |
| JD parse | 8 s | One `generateObject` call, once per job |
| Embedding | 1 s | One NIM call per CV; JD embedded once upfront |
| Matcher | < 100 ms | pgvector cosine + in-memory graph walk |
| Insights | 6 s | Streamed; partial output shown live |
| Auditor | 1 s | Runs once after every candidate settles |

With 20 CVs fanned out under `p-limit=3`, the whole batch fits inside the
60 s target with headroom.

---

## Tech stack

- **Next.js 16** (App Router, Server Actions, React Compiler)
- **Tailwind 4** + custom design system (Untitled UI flavoured)
- **NVIDIA NIM** for both reasoning and embeddings (`@ai-sdk/openai-compatible`)
- **Vercel AI SDK** with `generateObject` + Zod for schema-grounded parsing
- **Supabase Postgres** with `pgvector` (embeddings) and `pgmq` (queue) — single datastore, no separate vector DB
- **`graphology`** for the skill knowledge graph (seeded JSON in [`data/skills/`](data/skills/), version-controlled and editable)
- **`p-limit`** for in-worker concurrency control
- **Bun** as the package manager and dev runtime

---

## Deploying to Vercel

Shortlister is built to deploy directly on Vercel with Supabase as the
backing store.

### One-time setup

1. Push the repo to GitHub and import it as a Vercel project.
2. Set environment variables in the Vercel dashboard (see [`.env.example`](.env.example)):

   - `NVIDIA_NIM_API_KEY`, `NIM_REASONING_MODEL`, `NIM_EMBEDDING_MODEL`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`
   - `WORKER_SECRET` (gates `/api/worker`)
   - `CRON_SECRET` (Vercel signs cron pings with this)

3. Apply the schema:

   ```bash
   supabase db push
   ```

4. Optionally enable the in-database `pg_cron` tick for redundancy:

   ```sql
   alter database postgres set app.worker_url    = 'https://<your-deploy>.vercel.app/api/worker';
   alter database postgres set app.worker_secret = 'WORKER_SECRET-value';
   ```

### What `vercel.json` and `next.config.ts` already do for you

- `vercel.json` pins per-route `maxDuration` (60 s — within the Hobby plan cap; raise to 300 s on Pro if you want larger batches per invocation).
- The worker is driven by **`pg_cron` inside Supabase** every 15 s — no Vercel cron needed (Hobby is limited to one cron run per day, which is too coarse for this pipeline). Pro users can add a Vercel cron as a redundant safety net.
- `next.config.ts` raises the Server Action body cap to **20 MB** (so a 20-CV batch fits) and marks `unpdf` + `mammoth` as `serverExternalPackages` so their native/wasm assets resolve on Vercel's Node runtime.
- CV text is extracted at ingest and persisted on the candidate row (`raw_text`), so the worker — a separate function invocation with its own ephemeral `/tmp` — never needs a shared filesystem.

---

## Local dev mode (no credentials)

With no env vars set, Shortlister falls back to:

- File-backed in-memory store under `.next/cache/store.json`
- Deterministic hash-bag-of-words embedding (sufficient for ranking demos)
- Heuristic regex CV/JD parser
- In-process queue drained on demand by the `kickWorker()` server action

This means a fresh `git clone && bun install && bun dev` is enough to
demo the full pipeline end-to-end.

---

## Evals

```bash
bun dev
bun run evals
```

Runs every fixture in [`evals/fixtures/*.json`](evals/fixtures/). Each
defines a JD, a set of CVs, and the expected ranking. The harness
asserts that the top candidate is correctly identified — extend with
Spearman or weighted-Tau as needed.

---

## File map

```
src/
├── app/
│   ├── (dashboard pages)         # Overview, Jobs, Candidates, Audit, Job detail
│   └── api/
│       ├── jobs/route.ts         # POST: ingest job + CVs
│       ├── jobs/[id]/progress    # GET: live polling endpoint
│       ├── jobs/extract-jd       # POST: extract JD text from a file
│       ├── worker/route.ts       # POST/GET: drain the pgmq queue (Vercel cron target)
│       ├── notifications         # GET: derived top-bar notifications
│       └── evals                 # GET: run the eval harness
├── lib/
│   ├── ai/        # parser, extractor, embeddings, insights
│   ├── scoring/   # matcher (math), auditor (math)
│   ├── graph/     # skill knowledge graph
│   ├── workers/   # ingest server action, pipeline (process one CV)
│   ├── db/        # Supabase store + in-memory fallback
│   └── types/     # Zod schemas and TypeScript types
└── components/    # All UI, Tailwind 4 + custom design tokens

supabase/
└── migrations/    # Schema + pgmq wrappers + pg_cron tick

evals/
└── fixtures/      # JD + expected ranking JSON

data/
└── skills/        # The seeded skill ontology
```

See [`AGENTS.md`](AGENTS.md) for the full architecture spec and design rationale.
