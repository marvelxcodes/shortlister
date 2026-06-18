# Shortlister — Architecture & GenAI Documentation

A GenAI-native recruitment augmentation platform. Recruiters upload a Job Description and a batch of CVs; the system parses, embeds, scores, audits, and explains the shortlist — targeting < 60 s end-to-end for 20 CVs.

This document is a deep dive into how the system is wired, with an emphasis on the **GenAI and AI subsystems** (the Parser, Matcher, Insights, and Auditor agents, plus the embedding and skill-graph engines that back them).

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Next.js 16 (App Router)                  │
│                                                                  │
│   ┌────────────┐    ┌────────────────┐    ┌──────────────────┐   │
│   │  /jobs/new │ →  │ Server Action  │ →  │ /api/jobs (POST) │   │
│   │  wizard UI │    │  ingest + JD   │    │  form-data ingest│   │
│   └────────────┘    │  parse + embed │    └──────────────────┘   │
│                     └────────────────┘                           │
│                              │                                   │
│                              ▼                                   │
│                  ┌─────────────────────┐                         │
│                  │   pgmq queue        │  (Supabase Queues)      │
│                  │   `cv_jobs`         │                         │
│                  └─────────────────────┘                         │
│                              │                                   │
│                              │   pg_cron + pg_net tick           │
│                              ▼                                   │
│                  ┌─────────────────────┐                         │
│                  │   /api/worker       │  (Node runtime)         │
│                  │   drain + fan-out   │                         │
│                  └─────────────────────┘                         │
│                              │                                   │
│        per-CV pipeline ── parse → embed → score → insights       │
│                              │                                   │
│                              ▼                                   │
│                  ┌─────────────────────┐                         │
│                  │  Postgres + pgvector│                         │
│                  │  jobs / candidate_  │ ── Supabase Realtime    │
│                  │  jobs               │      → Dashboard UI     │
│                  └─────────────────────┘                         │
│                              │                                   │
│                              ▼                                   │
│                  ┌─────────────────────┐                         │
│                  │  Auditor (math only)│                         │
│                  │  pedigree-vs-skill  │                         │
│                  └─────────────────────┘                         │
└──────────────────────────────────────────────────────────────────┘
```

Everything — UI, server actions, AI pipeline, worker — lives in **one Next.js codebase running the Node.js runtime**. There is no separate Python service. The heavy lifting that would normally need its own backend (queueing, vectors, cron) is delegated to **Supabase** (Postgres + pgvector + pgmq + pg_cron + Realtime).

### Key design rules

- **LLMs do translation, not math.** Embeddings + graph walks + cosine + jaccard are deterministic; the LLM is only used for schema-constrained extraction (`generateObject`) and natural-language synthesis.
- **Schema-first.** Every LLM output goes through a Zod schema. Validation failures retry once with the error appended to the prompt (`src/lib/ai/parser.ts:95`).
- **Graceful degradation.** Every AI surface (parsing, embedding, insights) has a deterministic heuristic fallback so the app stays runnable without NIM credentials.
- **Stateless across function boundaries.** Vercel functions share no filesystem, so raw CV text is written to the candidate row at ingest and re-read by the worker.

---

## 2. Multi-Agent System

The platform follows a **Hub-and-Spoke Multi-Agent Architecture**. The orchestrator (Next.js server action + background worker) coordinates four specialized agents.

### 2.1 Orchestrator (`src/lib/workers/server-actions.ts`, `src/app/api/worker/route.ts`)

Two functions, two phases:

1. **Ingest phase — `createJobAndEnqueue`** (`src/lib/workers/server-actions.ts:34`)
   - Parses the JD synchronously (LLM call).
   - Embeds the JD synchronously (one embedding call).
   - Extracts text from every CV in parallel (`unpdf` / `mammoth`).
   - Writes each candidate row with `raw_text` already populated.
   - Enqueues one `pgmq` message per CV onto `cv_jobs`.
   - Flips the job to `processing`.

2. **Drain phase — `/api/worker`** (`src/app/api/worker/route.ts`)
   - Reads up to `WORKER_BATCH_SIZE` (default 5) messages with a 60 s visibility timeout.
   - Fans out concurrently with `p-limit(WORKER_CONCURRENCY)` (default 3).
   - On success: archives the pgmq message; on failure: lets the visibility timeout redeliver.
   - Calls `finalizeJobIfReady` for every touched job to trigger ranking + audit.

The worker is triggered by three sources (`src/app/api/worker/route.ts:12`):
- **Dev:** in-process `kickWorker()` POST after ingest.
- **Production:** Supabase `pg_cron` + `pg_net` ticks the URL every 15 s.
- **Backup:** `vercel.json` cron GET every minute (signed with `CRON_SECRET`).

Auth is gated by `WORKER_SECRET` or `CRON_SECRET` — either bearer token is accepted (`src/app/api/worker/route.ts:53`).

### 2.2 Parser Agent (`src/lib/ai/parser.ts`)

**Role:** Convert raw extracted text → strict structured JSON (`ParsedJD` or `ParsedCV`).

**Stack:** Vercel AI SDK `generateObject` against a Zod schema, NIM-hosted reasoning model (default `nvidia/llama-3.3-nemotron-super-49b-v1`).

Two prompts, both built with a "ALL required fields must be present" preamble plus an explicit shape contract:

- **JD prompt** (`src/lib/ai/parser.ts:15`) — extracts title, summary, seniority enum, min/max years, must/nice-to-have skills, responsibilities, and a weighted `requirements[]`.
- **CV prompt** (`src/lib/ai/parser.ts:32`) — extracts name, email, summary, total years, skills, roles (with `durationMonths` computed), education, certifications, links.

Both prompts explicitly forbid `null` for unknown optional fields ("omit entirely") because NIM models occasionally emit `null` where Zod expects undefined.

**Schema-violation retry** (`src/lib/ai/parser.ts:95`):

```
attempt 1: prompt → generateObject → success ✓
                                  → ZodError → attempt 2 with the
                                               serialized issues
                                               appended to the prompt
```

`extractHint` walks the error cause chain (`NoObjectGeneratedError → TypeValidationError → ZodError`) to surface actionable per-field issues instead of "did not match schema" — see `src/lib/ai/parser.ts:103`.

**Heuristic fallback** (`src/lib/ai/parser.ts:155, 183`). When `NVIDIA_NIM_API_KEY` is absent or the LLM throws twice, deterministic regex-based extractors take over:

- Skill recognition reuses the seeded skill ontology (`allSkills()`) with word-boundary-aware matching (`src/lib/ai/parser.ts:141`).
- Seniority is inferred from staff/principal/senior/junior/intern tokens.
- Roles are pulled from lines containing recognized job titles; tenure is derived from `YYYY-YYYY` ranges.

This keeps the entire pipeline runnable for evals and demos without credentials.

### 2.3 Matcher Agent (`src/lib/scoring/matcher.ts`)

**Role:** Score every candidate deterministically. **No LLM involvement.**

**Scoring formula** (`src/lib/scoring/matcher.ts:35`):

```
score = w_v · cosine(JD_embedding, CV_embedding)
      + w_g · jaccard(JD_skills, expand_one_hop(CV_skills))
      - w_e · experience_penalty
```

Default weights: `w_v = 0.5, w_g = 0.4, w_e = 0.1`. Stored per-job on `jobs.weights` so recruiters can tune.

**Component details:**

| Component                | What it measures                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `semantic`               | Cosine similarity between the JD embedding (query-side) and the CV embedding (passage-side). Clamped to [0,1].                                         |
| `skillGraph`             | Jaccard overlap between resolved JD skill node IDs and the CV's skill nodes expanded one hop in the ontology. Picks up siblings ("Next.js" ⇄ "React"). |
| `experiencePenalty`      | `min(1, max(0, minYears − totalYears) / max(3, minYears))` — only penalizes underexperience.                                                           |
| `pedigree`               | `min(1, 0.5·hasDegree + 0.5·min(1, avgRoleMonths/36))` — a soft proxy used **only by the auditor**, not folded into the overall score.                 |
| `matched / missing / expanded skills` | Returned as label arrays so downstream agents (Insights) can name them in natural language.                                                 |

**One-hop expansion** (`src/lib/graph/skill-graph.ts:135`): for each CV skill node, include direct skill-neighbors plus siblings within the same category. This is what lets a CV listing "Next.js" satisfy a JD asking for "React" — they share the `frontend` category, and the ontology declares `nextjs.related = [react]`.

Math budget: < 100 ms per CV. The graph walk and jaccard are O(skills × neighbors) on a graph of ~hundreds of nodes — trivial.

### 2.4 Auditor Agent (`src/lib/scoring/auditor.ts`)

**Role:** Flag shortlists with pedigree skew and surface non-traditional candidates.

**The platform never infers protected attributes.** Instead it audits on two measurable proxies:

1. **Pedigree-vs-skill skew** (`src/lib/scoring/auditor.ts:57`). Warn when the shortlist median pedigree subscore is in the top quartile (≥ 0.75) but the median skill subscore sits in the middle (0.4..0.65). Indicates the funnel is picking on schools/employers over measured skill.

2. **Non-traditional surfacing** (`src/lib/scoring/auditor.ts:60`). For any candidate at or above the 80th percentile on skill match:
   - `high_skill_no_degree` if no education on record.
   - `high_skill_non_faang` if no prior employer in the curated `FAANG` set (Google, Meta, Amazon, Apple, Netflix, Microsoft, NVIDIA, OpenAI, Anthropic, Stripe, Uber, Airbnb, LinkedIn — `src/lib/scoring/auditor.ts:16`).

A **blind mode** flag on each job masks names, schools, and employer names in the UI; the underlying data is still stored.

The auditor runs once when all candidates for a job have settled (`finalizeJobIfReady` in `src/lib/workers/pipeline.ts:98`). Postgres trigger `maybe_finalize_job` (migration `0001_init.sql`) flips the job to `auditing` automatically when no candidate is still pending.

### 2.5 Insights Agent (`src/lib/ai/insights.ts`) — Delta-Based RAG

**Role:** Generate the ranking justification, strengths, risks, and four tailored interview questions.

**Key idea — Delta-Based RAG.** The LLM **never sees the raw CV**. It receives only:

- the JD title, seniority, must/nice-to-have skills,
- the candidate's **matched** skill labels (from the matcher),
- the candidate's **missing** skill labels (the gaps),
- the three subscores as percentages.

This is the "delta" — the difference between what the JD wants and what the CV proved. Prompt construction at `src/lib/ai/insights.ts:51`:

```
Role: Senior Full Stack Engineer (senior, 5+ yrs)
Must-have: React, Node.js, PostgreSQL
Nice-to-have: TypeScript, AWS
Candidate: Jane Doe · 6 yrs experience
Matched skills: React, Node.js, TypeScript
Missing skills (gaps): PostgreSQL, AWS
Subscores → semantic 78%, skill-graph 65%, pedigree 80%.
```

**Why this matters:**
- Tiny prompt — ~1.5 KB vs ~20 KB for a full CV. Latency stays in the 6 s p95 budget.
- Grounded — the LLM can only justify the score using the deterministic match output, so it cannot hallucinate skills or experience the matcher did not surface.
- Reproducible — given the same score breakdown, the LLM produces a near-identical narrative.

**Output schema** (`CandidateInsights` in `src/lib/types/schemas.ts:92`):

```ts
{
  justification: string,             // 3–5 sentences
  strengths: string[],
  risks: string[],
  interviewQuestions: [{             // exactly 4 items
    question: string,
    probes: string[],                // 1–3 follow-ups
    targetGap?: string,              // the missing skill being probed
    difficulty: "easy" | "medium" | "hard"
  }]
}
```

The interview questions are explicitly probing the **gaps**, not the candidate's strengths — that is the whole point of a calibration interview.

**Heuristic fallback** (`src/lib/ai/insights.ts:72`): a hand-rolled justification template plus generic "Walk us through a project where you applied {gap}…" questions keyed on the missing skills.

---

## 3. The GenAI Layer in Detail

### 3.1 Provider abstraction (`src/lib/ai/provider.ts`)

A single thin wrapper around `createOpenAICompatible` from `@ai-sdk/openai-compatible`:

```ts
export const nim = createOpenAICompatible({
  name: "nvidia-nim",
  baseURL: NIM_BASE_URL,            // default https://integrate.api.nvidia.com/v1
  apiKey: process.env.NVIDIA_NIM_API_KEY,
  supportsStructuredOutputs: true,  // critical
});
```

`supportsStructuredOutputs: true` is **load-bearing** (`src/lib/ai/provider.ts:11`). Without it, the AI SDK does not forward `response_format: { type: "json_schema" }` to NIM, so the Nemotron model is left to guess the shape — and frequently produces invalid JSON. With it, NIM enforces the schema server-side.

Two models, both swappable via env:

- `NIM_REASONING_MODEL` — defaults to `nvidia/llama-3.3-nemotron-super-49b-v1`. Used by Parser + Insights via `generateObject`.
- `NIM_EMBEDDING_MODEL` — defaults to `nvidia/nv-embedqa-e5-v5`. Used by the embed module.

`isNimEnabled()` gates every call site so the platform degrades gracefully.

### 3.2 Embeddings (`src/lib/ai/embed.ts`)

`nv-embedqa-e5-v5` is an **asymmetric retrieval embedder** — it ships two encoders, one for queries and one for passages. The wire format requires `input_type: "query" | "passage"`; NIM returns HTTP 400 otherwise.

The pipeline gets this right by labeling each side:

- **JD → `embedText(text, "query")`** (`src/lib/workers/server-actions.ts:44`)
- **CV → `embedText(text, "passage")`** (`src/lib/workers/pipeline.ts:48`)

Embeddings are 1024-dim and stored in pgvector columns (`jobs.jd_embedding`, `candidate_jobs.cv_embedding`).

**pgvector serialization gotcha** (`src/lib/db/store.ts:326`). Supabase returns pgvector columns as the textual literal `"[0.1, 0.2, ...]"`, not a `number[]`. Without parsing, downstream cosine math returns `NaN` (string indexing yields chars). `parseVector` JSON-parses the string back into a number array.

**Cosine implementation** (`src/lib/ai/embed.ts:63`). Stock dot-product / magnitude formula, clamped to `[0, 1]` so negative similarities (rare for sentence embeddings) don't pull the overall score below zero.

**Hash-bucket fallback** (`src/lib/ai/embed.ts:84`). When NIM isn't configured, every token is FNV1a-hashed into a 1024-dim bag-of-words vector, L2-normalized. Not as good as a real embedder, but enough to demonstrate semantic-style ranking on synthetic CVs and run the eval harness in CI.

### 3.3 Text extraction (`src/lib/ai/extractor.ts`)

Pure parsing, no LLM:

- `.pdf` → `unpdf` (Node + edge-safe).
- `.docx` → `mammoth.extractRawText` (passing a real `Buffer` because mammoth's `buffer` field is strict).
- `.txt` / `.md` → `TextDecoder`.

Cleanup normalizes line endings, drops soft hyphens, collapses repeated blank lines. Whitespace mangling here directly degrades parser quality, so the cleanup is conservative.

### 3.4 Skill knowledge graph (`src/lib/graph/skill-graph.ts` + `data/skills/ontology.json`)

The graph is built lazily on first access from a versioned JSON ontology:

```
discipline ── category ── skill ── (related) ── skill
```

Built with `graphology` as an **undirected, single-edge graph**. Three indices are maintained alongside the graph:

- `aliasIndex` — `{ id, label, all aliases } → node id`. Lowercased, punctuation-collapsed.
- `labelIndex` — `{ canonical label } → node id`.
- `_graph` — the full graph itself.

**Public API:**

| Function           | Purpose                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| `resolveSkill`     | Free-text → canonical node id (or null).                                      |
| `resolveSkills`    | Bulk resolve; returns `{ resolved, unknown }`.                                |
| `expandOneHop`     | For each node, add direct skill-neighbors + siblings via the category parent. |
| `jaccard`          | Set-based overlap, used by the matcher.                                       |
| `labelOf`          | Node id → human label, for UI and Insights prompts.                           |
| `categoryOf`       | Skill node → parent category label.                                           |
| `allSkills`        | All `kind: "skill"` nodes — drives the heuristic skill matcher.               |

The ontology is **version-controlled JSON**, intentionally human-editable (`data/skills/ontology.json`). Adding a new skill is a PR, not a deploy.

### 3.5 Eval harness (`src/lib/evals/run.ts` + `evals/fixtures/*.json`)

Each fixture is `{ jd, candidates: [{ cv, expectedRank }] }`. The harness re-runs the scoring pipeline (embed → matcher → auditor) and asserts that the top-ranked candidate matches `expectedRank: 1`. Auditor is also invoked to assert shape stability.

Exposed at `/api/evals` and runnable via `bun run evals` (curls the route to disk). This is what catches regressions when prompts or scoring weights change.

---

## 4. Data Model & Persistence

### 4.1 Tables (`supabase/migrations/0001_init.sql`)

**`jobs`**
```
id uuid PK
title text
status text         -- draft|processing|auditing|ready|failed
jd_raw text
jd jsonb            -- ParsedJD
jd_embedding vector(1024)
weights jsonb       -- {semantic, graph, experience}
blind_mode bool
audit jsonb         -- AuditResult
metadata jsonb
```

**`candidate_jobs`** (one row per CV — both the durable record and the progress channel)
```
id uuid PK
job_id uuid → jobs.id ON DELETE CASCADE
filename text
status text         -- queued|extracting|parsing|embedding|scoring|insights|done|failed
error text
rank int
cv jsonb            -- ParsedCV
cv_embedding vector(1024)
score jsonb         -- ScoreBreakdown
insights jsonb      -- CandidateInsights
raw_text text       -- extracted CV plaintext (migration 0006)
```

Both tables are published to `supabase_realtime` so the dashboard subscribes and auto-updates as the pipeline progresses — **no SSE handler is implemented in the app**.

### 4.2 Queue

`pgmq.create('cv_jobs')` defines a Postgres-backed queue. The worker uses three RPCs exposed in the `public` schema by migration `0004_pgmq_public_wrappers.sql`:

| RPC            | Use                                                                       |
| -------------- | ------------------------------------------------------------------------- |
| `pgmq_send`    | Push `{ candidateId, jobId }` from the ingest server action.              |
| `pgmq_read`    | Drain up to N messages with a 60 s visibility timeout.                    |
| `pgmq_archive` | Mark a message as completed on per-CV success.                            |

On failure the worker does **not** archive; pgmq re-delivers after the VT expires, giving free retry semantics.

### 4.3 Cron

`pg_cron` schedules `tick_worker()` every 15 s (`*/15 * * * * *`). `pg_net` does an HTTP POST to `app.worker_url` with `Authorization: Bearer ${app.worker_secret}`. Both GUCs must be set via:

```sql
alter database postgres set app.worker_url    = 'https://<deploy>/api/worker';
alter database postgres set app.worker_secret = '<matches WORKER_SECRET>';
```

If unset, `tick_worker()` no-ops — a safe default for fresh projects.

### 4.4 Triggers

- `touch_updated_at` — bumps `updated_at` on every row update.
- `maybe_finalize_job` — when a `candidate_jobs` row transitions to `done|failed`, checks if any siblings are still pending. If none, flips `jobs.status = 'auditing'`, which is then noticed by `finalizeJobIfReady` on the next worker tick.

### 4.5 Local-dev memory store (`src/lib/db/memory-store.ts`, `src/lib/db/store.ts`)

Every CRUD function routes through `useSupabase()` (= "is `SUPABASE_SERVICE_ROLE` set?"). When false, a file-backed in-process store handles jobs, candidates, embeddings, and the queue. This makes `bun run dev` work zero-config.

---

## 5. End-to-End Request Flow

```
recruiter → POST /api/jobs (multipart: title, jd, cvs[])
              │
              ▼
   createJobAndEnqueue
     1. parseJd(jdRaw)              [LLM • ~8 s p95]
     2. createJob(...)              [DB insert]
     3. embedText(jd, "query")      [LLM • ~1 s]
     4. setJobEmbedding(...)        [DB update]
     5. parallel extractText(cv)    [unpdf / mammoth • ~2 s each]
     6. createCandidate(rawText)    [DB insert per CV]
     7. enqueueCandidate            [pgmq.send per CV]
     8. updateJobStatus("processing")
              │
              ▼
   kickWorker() (best effort)  ───► /api/worker (Node, 60 s budget)
              │
              ▼
   drain():
     readQueueBatch(5)
       p-limit(3) ─ for each message ─ processCandidate(candidateId):
         status=parsing  → parseCv(text)           [LLM • ~8 s]
         status=embedding→ embedText(cv, "passage")[LLM • ~1 s]
         status=scoring  → scoreCandidate(...)     [math • <100 ms]
         status=insights → generateInsights(...)   [LLM • ~6 s]
         status=done
       archiveQueue(msg_id)
     for each touched job:
       finalizeJobIfReady(jobId):
         if all done → rankCandidates → auditShortlist → setJobAudit → status=ready
              │
              ▼
   candidate_jobs / jobs row changes → Supabase Realtime → Dashboard repaints
```

**Latency budget (per CV, parallelized):**

| Stage          | p95 budget |
| -------------- | ---------- |
| Extract        | 2 s        |
| Parse (LLM)    | 8 s        |
| Embed          | 1 s        |
| Score (math)   | < 100 ms   |
| Insights (LLM) | 6 s        |
| Audit (batch)  | 1 s        |

20 CVs × per-CV path (~14 s p95) fan out at `WORKER_CONCURRENCY=3` → < 60 s with headroom.

---

## 6. Frontend Surface

### Pages (App Router)
- `/` — dashboard landing.
- `/jobs` — list with `JobsTable`.
- `/jobs/new` — upload wizard (`src/components/jobs/upload-wizard.tsx`).
- `/jobs/[id]` — job detail with rankings, audit panel, candidate drill-down.
- `/jobs/[id]/candidates/[cid]` — candidate detail with insights + interview questions.
- `/candidates`, `/audit`, `/insights`, `/pricing`, `/help`.

### API routes
- `POST /api/jobs` — ingest (multipart).
- `POST /api/jobs/extract-jd` — extract JD text from an uploaded PDF/DOCX for the wizard.
- `GET  /api/jobs/[id]/progress` — fallback progress polling for environments without Realtime.
- `POST/GET /api/worker` — drain endpoint.
- `GET  /api/notifications` — derived from job state.
- `GET  /api/evals` — eval harness runner.

### Visualization
- `score-distribution.tsx`, `skill-radar.tsx`, `pipeline-chart.tsx` — all `recharts`.
- `audit-panel.tsx` — surfaces auditor flags with rationales.

---

## 7. Configuration Reference

### Environment

| Variable                          | Purpose                                                             |
| --------------------------------- | ------------------------------------------------------------------- |
| `NVIDIA_NIM_API_KEY`              | Enables LLM + embedding calls. Absent → heuristic fallback path.    |
| `NVIDIA_NIM_BASE_URL`             | Default `https://integrate.api.nvidia.com/v1`.                      |
| `NIM_REASONING_MODEL`             | Default `nvidia/llama-3.3-nemotron-super-49b-v1`.                   |
| `NIM_EMBEDDING_MODEL`             | Default `nvidia/nv-embedqa-e5-v5`.                                  |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL (client + server).                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Anon key for client Realtime subscriptions.                         |
| `SUPABASE_SERVICE_ROLE`           | Server-only. Gates `useSupabase()` → switches off the memory store. |
| `WORKER_SECRET`                   | Bearer token for `/api/worker` from dev kicker + Supabase tick.     |
| `CRON_SECRET`                     | Bearer token Vercel forwards on cron invocations.                   |
| `WORKER_BATCH_SIZE`               | Default 5.                                                          |
| `WORKER_CONCURRENCY`              | Default 3.                                                          |
| `WORKER_URL`                      | Override target deployment (useful for preview deploys).            |

### Tunable per-job knobs

- `weights.semantic / graph / experience` — scoring formula weights.
- `blindMode` — masks name/school/employer in the UI.
- `metadata` — non-scoring fields (department, employment type, etc.) for UX only.

---

## 8. Tech Stack Summary

| Concern               | Choice                                                       |
| --------------------- | ------------------------------------------------------------ |
| Framework             | Next.js 16.2.9 (App Router, React 19)                        |
| Runtime               | Node.js (every AI/data route)                                |
| UI                    | Tailwind CSS v4, Untitled UI icons, Framer Motion, Recharts  |
| AI SDK                | `ai` (Vercel AI SDK) + `@ai-sdk/openai-compatible`           |
| LLM provider          | NVIDIA NIM (Llama 3.3 Nemotron family + `nv-embedqa-e5-v5`)  |
| Schema validation     | Zod v4                                                       |
| PDF / DOCX            | `unpdf`, `mammoth`                                           |
| Graph                 | `graphology` over `data/skills/ontology.json`                |
| Database              | Supabase Postgres                                            |
| Vector store          | `pgvector` (1024-dim) — same Postgres instance               |
| Queue                 | Supabase `pgmq` (queue: `cv_jobs`)                           |
| Worker trigger        | `pg_cron` + `pg_net` + Vercel cron (belt + suspenders)       |
| Realtime              | Supabase Realtime on `jobs` + `candidate_jobs`               |
| Concurrency           | `p-limit` inside the worker                                  |
| Lint / format         | Biome                                                        |
| Eval harness          | `/api/evals` + JSON fixtures in `evals/fixtures/`            |

---

## 9. File Map (where to look)

```
src/lib/ai/
  provider.ts        NIM client, model IDs, isNimEnabled gate
  extractor.ts       PDF/DOCX → text (unpdf + mammoth)
  parser.ts          generateObject for JD/CV + heuristic fallback
  embed.ts           NIM embeddings (query/passage) + cosine + hash fallback
  insights.ts        Delta-Based RAG prompt + generateObject

src/lib/scoring/
  matcher.ts         Deterministic semantic + graph + penalty math
  auditor.ts         Pedigree-vs-skill skew + non-traditional flags

src/lib/graph/
  skill-graph.ts     graphology build + resolveSkills + one-hop expansion

src/lib/workers/
  server-actions.ts  Ingest server action (parseJd + embed + enqueue)
  pipeline.ts        processCandidate stage machine + finalizeJobIfReady

src/lib/types/
  schemas.ts         Zod schemas for ParsedJD, ParsedCV, ScoreBreakdown,
                     CandidateInsights, AuditResult, status enums
  domain.ts          App-level Job / Candidate / JobSummary types

src/lib/db/
  store.ts           Supabase-or-memory CRUD with pgvector serialization
  supabase-server.ts Service-role client factory
  memory-store.ts    File-backed dev store
  env.ts             hasNim / hasSupabase / hasSupabaseService gates
  database.types.ts  Generated Supabase types

src/app/api/
  jobs/route.ts             POST multipart ingest
  jobs/extract-jd/route.ts  POST JD file → text
  jobs/[id]/progress/route.ts  Fallback progress endpoint
  worker/route.ts           POST + GET drain endpoint
  evals/route.ts            Eval harness runner
  notifications/route.ts    Notifications derived from job state

supabase/migrations/         Schema, RLS, pgmq wrappers, metadata, raw_text
data/skills/ontology.json    Versioned skill knowledge graph
evals/fixtures/*.json        Regression fixtures
```
