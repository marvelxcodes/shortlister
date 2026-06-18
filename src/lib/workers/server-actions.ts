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
import { jdProfileText, writeUpload } from "@/lib/workers/pipeline";
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
 * 2) Persists all CV uploads.
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

  const jdEmbedding = await embedText(jdProfileText(jd));
  await setJobEmbedding(job.id, jdEmbedding);

  for (const f of input.files) {
    const cand = await createCandidate({
      jobId: job.id,
      filename: f.filename,
    });
    await writeUpload(cand.id, f.data);
    await enqueueCandidate(cand.id, job.id);
  }

  await updateJobStatus(job.id, "processing");
  revalidatePath("/");
  revalidatePath("/jobs");
  return { jobId: job.id };
}

export async function kickWorker() {
  // In dev (in-mem queue) we drain manually so the dashboard updates without
  // waiting for a cron tick. Fire-and-forget.
  try {
    const port = process.env.PORT ?? "3000";
    await fetch(`http://localhost:${port}/api/worker`, { method: "POST" });
  } catch {
    /* best-effort */
  }
}
