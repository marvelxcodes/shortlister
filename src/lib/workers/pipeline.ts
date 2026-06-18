import {
  getCandidate,
  getJob,
  getJobEmbedding,
  rankCandidates,
  setCandidateCv,
  setCandidateEmbedding,
  setCandidateInsights,
  setCandidateScore,
  setCandidateStatus,
  setJobAudit,
  updateJobStatus,
  listCandidatesForJob,
} from "@/lib/db/store";
import { parseCv } from "@/lib/ai/parser";
import { embedText } from "@/lib/ai/embed";
import { scoreCandidate } from "@/lib/scoring/matcher";
import { generateInsights } from "@/lib/ai/insights";
import { auditShortlist } from "@/lib/scoring/auditor";

/**
 * Process one candidate end-to-end. Each stage transitions the row's
 * status so the dashboard can light up steps in real time. Errors are
 * caught and persisted, then re-thrown so the worker treats them as
 * a per-message failure (not the whole batch).
 *
 * Raw CV text is read from the candidate row (written during ingest by
 * the server action). Vercel functions have no shared filesystem, so
 * the previous fs-based handoff between ingest and worker is unsound.
 */
export async function processCandidate(candidateId: string) {
  const candidate = await getCandidate(candidateId);
  if (!candidate) throw new Error(`candidate ${candidateId} not found`);
  const job = await getJob(candidate.jobId);
  if (!job) throw new Error(`job ${candidate.jobId} not found`);

  try {
    const text = candidate.rawText ?? "";
    if (!text.trim()) {
      throw new Error("CV text missing on candidate row");
    }

    await setCandidateStatus(candidate.id, "parsing");
    const cv = await parseCv(text);
    await setCandidateCv(candidate.id, cv);

    await setCandidateStatus(candidate.id, "embedding");
    const cvEmbedding = await embedText(cvProfileText(cv), "passage");
    await setCandidateEmbedding(candidate.id, cvEmbedding);

    const jdEmbedding = (await getJobEmbedding(job.id)) ?? [];
    if (jdEmbedding.length === 0) {
      throw new Error("JD embedding not ready");
    }

    await setCandidateStatus(candidate.id, "scoring");
    const score = scoreCandidate({
      jd: job.jd,
      cv,
      jdEmbedding,
      cvEmbedding,
      weights: job.weights,
    });
    await setCandidateScore(candidate.id, score);

    await setCandidateStatus(candidate.id, "insights");
    const insights = await generateInsights({ jd: job.jd, cv, score });
    await setCandidateInsights(candidate.id, insights);

    await setCandidateStatus(candidate.id, "done");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await setCandidateStatus(candidate.id, "failed", msg);
    throw err;
  }
}

export function cvProfileText(cv: {
  name: string;
  summary?: string;
  skills: Array<{ name: string }>;
  roles: Array<{ title: string; company: string; highlights?: string[] }>;
}) {
  const lines: string[] = [cv.name];
  if (cv.summary) lines.push(cv.summary);
  lines.push("Skills: " + cv.skills.map((s) => s.name).join(", "));
  for (const r of cv.roles) {
    lines.push(`${r.title} at ${r.company}`);
    for (const h of r.highlights ?? []) lines.push(`- ${h}`);
  }
  return lines.join("\n");
}

/**
 * Run the auditor once all candidates for a job have finished.
 * Idempotent — safe to call repeatedly.
 */
export async function finalizeJobIfReady(jobId: string) {
  const job = await getJob(jobId);
  if (!job) return;
  const cands = await listCandidatesForJob(jobId);
  if (cands.length === 0) return;
  const pending = cands.filter(
    (c) => c.status !== "done" && c.status !== "failed",
  );
  if (pending.length > 0) return;
  await rankCandidates(jobId);
  const fresh = await listCandidatesForJob(jobId);
  const audit = auditShortlist(fresh);
  await setJobAudit(jobId, audit);
  await updateJobStatus(jobId, "ready");
}

/** JD-side helper: build a single text blob suitable for embedding. */
export function jdProfileText(jd: {
  title: string;
  summary: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  responsibilities: string[];
}) {
  const lines: string[] = [jd.title, jd.summary];
  lines.push("Must-have: " + jd.mustHaveSkills.join(", "));
  if (jd.niceToHaveSkills.length)
    lines.push("Nice-to-have: " + jd.niceToHaveSkills.join(", "));
  for (const r of jd.responsibilities) lines.push(`- ${r}`);
  return lines.join("\n");
}
