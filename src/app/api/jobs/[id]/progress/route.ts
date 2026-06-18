import { getJob, listCandidatesForJob } from "@/lib/db/store";
import { finalizeJobIfReady } from "@/lib/workers/pipeline";
import { kickWorker } from "@/lib/workers/server-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const job = await getJob(id);
  if (!job) return Response.json({ ok: false }, { status: 404 });

  await finalizeJobIfReady(id);
  // Keep the in-mem queue draining if the user is staring at the page.
  if (job.status === "processing") void kickWorker();

  const cands = await listCandidatesForJob(id);
  return Response.json({
    job,
    candidates: cands.map((c) => ({
      id: c.id,
      filename: c.filename,
      status: c.status,
      rank: c.rank,
      error: c.error,
      score: c.score,
      cv: c.cv
        ? {
            name: c.cv.name,
            location: c.cv.location,
            totalYears: c.cv.totalYears,
            education: c.cv.education,
            roles: c.cv.roles.slice(0, 2),
          }
        : undefined,
    })),
  });
}
