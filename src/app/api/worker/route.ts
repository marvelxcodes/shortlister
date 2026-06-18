import pLimit from "p-limit";
import { archiveQueue, readQueueBatch } from "@/lib/db/store";
import { finalizeJobIfReady, processCandidate } from "@/lib/workers/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_SIZE = Number(process.env.WORKER_BATCH_SIZE ?? "5");
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? "3");

/**
 * The worker route is the drain endpoint. It is fired by three sources:
 *   - dev:    in-process `kickWorker()` POST
 *   - Supabase: pg_cron + pg_net POST every few seconds
 *   - Vercel: vercel.json cron GET every minute (signed with CRON_SECRET)
 */
async function drain() {
  const messages = await readQueueBatch(BATCH_SIZE);
  if (messages.length === 0) {
    return { ok: true as const, processed: 0, failed: 0, errors: [] };
  }

  const limit = pLimit(CONCURRENCY);
  const jobIds = new Set<string>();
  const results = await Promise.allSettled(
    messages.map((m) =>
      limit(async () => {
        jobIds.add(m.message.jobId);
        await processCandidate(m.message.candidateId);
        await archiveQueue(m.msg_id);
      }),
    ),
  );

  // Trigger the auditor + ranking when all candidates for a job have settled.
  for (const jid of jobIds) {
    await finalizeJobIfReady(jid);
  }

  const ok = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;
  return {
    ok: true as const,
    processed: ok,
    failed,
    errors: results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => String(r.reason).slice(0, 200)),
  };
}

function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const worker = process.env.WORKER_SECRET;
  const cron = process.env.CRON_SECRET;
  // If neither secret is configured, allow (useful for local dev).
  if (!worker && !cron) return true;
  if (worker && auth === `Bearer ${worker}`) return true;
  if (cron && auth === `Bearer ${cron}`) return true;
  return false;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await drain());
}

// Vercel cron defaults to GET. Same secret check.
export async function GET(req: Request) {
  if (!authorized(req)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  return Response.json(await drain());
}
