"use server";

import {
  createCandidate,
  createJob,
  enqueueCandidate,
  setJobEmbedding,
  updateJobStatus,
} from "@/lib/db/store";
import { parseJd } from "@/lib/ai/parser";
import { embedText } from "@/lib/ai/embed";
import { extractText } from "@/lib/ai/extractor";
import { jdProfileText } from "@/lib/workers/pipeline";
import type { JobMetadata } from "@/lib/types/domain";
import { revalidatePath } from "next/cache";

export interface CreateJobInput {
  title: string;
  jdRaw: string;
  blindMode?: boolean;
  metadata?: JobMetadata;
  files: Array<{ filename: string; data: Uint8Array }>;
}

/**
 * Ingest server action — runs in the Server Action context.
 * 1) Parses + embeds the JD synchronously (so the worker has it).
 * 2) Extracts CV text inline (Vercel has no shared filesystem between
 *    the ingest function and the worker function — storing the text on
 *    the candidate row keeps the pipeline stateless across invocations).
 * 3) Enqueues each CV onto pgmq (or the in-mem queue).
 * 4) Flips the parent job into 'processing'.
 */
export async function createJobAndEnqueue(input: CreateJobInput) {
  const jd = await parseJd(input.jdRaw);
  const job = await createJob({
    title: input.title || jd.title,
    jd,
    jdRaw: input.jdRaw,
    blindMode: input.blindMode,
    metadata: input.metadata,
  });

  const jdEmbedding = await embedText(jdProfileText(jd), "query");
  await setJobEmbedding(job.id, jdEmbedding);

  // Extract in parallel — bounded only by the slowest file, not the count.
  const extracted = await Promise.all(
    input.files.map(async (f) => {
      try {
        const text = await extractText(f.data, f.filename);
        return { filename: f.filename, text, error: null as string | null };
      } catch (e) {
        return {
          filename: f.filename,
          text: "",
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }),
  );

  for (const f of extracted) {
    const cand = await createCandidate({
      jobId: job.id,
      filename: f.filename,
      rawText: f.text,
    });
    await enqueueCandidate(cand.id, job.id);
  }

  await updateJobStatus(job.id, "processing");
  revalidatePath("/");
  revalidatePath("/jobs");
  return { jobId: job.id };
}

/**
 * Best-effort worker kick. On Vercel each function is isolated, so
 * `localhost` is the wrong target — the deployed URL lives at
 * `VERCEL_URL` (also exposed without protocol). In production the
 * vercel.json cron tick is the source of truth; this kick only matters
 * for dev where we want the dashboard to update without waiting a
 * minute for a cron fire.
 */
export async function kickWorker() {
  const url = workerUrl();
  if (!url) return;
  try {
    const secret = process.env.WORKER_SECRET;
    await fetch(url, {
      method: "POST",
      headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
    });
  } catch {
    /* best-effort */
  }
}

function workerUrl(): string | null {
  // Allow explicit override (useful for preview deploys that want to
  // target their own deployment, not a shared one).
  const override = process.env.WORKER_URL;
  if (override) return override.replace(/\/$/, "") + "/api/worker";

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}/api/worker`;

  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}/api/worker`;
}
