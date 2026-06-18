import pLimit from "p-limit";
import { archiveQueue, readQueueBatch } from "@/lib/db/store";
import { finalizeJobIfReady, processCandidate } from "@/lib/workers/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = Number(process.env.WORKER_BATCH_SIZE ?? "5");
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? "3");

/**
 * The worker route is fired every few seconds by pg_cron + pg_net (prod)
 * or by manual POSTs (dev). It reads a batch, processes each message in
 * parallel under p-limit, archives on success and surfaces failures via
 * the candidate row's `error` field.
 */
export async function POST(req: Request) {
  const secret = process.env.WORKER_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const messages = await readQueueBatch(BATCH_SIZE);
  if (messages.length === 0) {
    return Response.json({ ok: true, processed: 0 });
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
  return Response.json({
    ok: true,
    processed: ok,
    failed,
    errors: results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => String(r.reason).slice(0, 200)),
  });
}

export async function GET() {
  return Response.json({ ok: true, info: "Shortlister worker. POST to drain." });
}
