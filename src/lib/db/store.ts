import { readStore, withStore } from "./memory-store";
import { getServiceSupabase } from "./supabase-server";
import { hasSupabaseService } from "./env";
import type {
  Candidate,
  Job,
  JobMetadata,
  JobSummary,
} from "@/lib/types/domain";
import type {
  AuditResult,
  CandidateInsights,
  CandidateStatus,
  JobStatus,
  ParsedCV,
  ParsedJD,
  ScoreBreakdown,
} from "@/lib/types/schemas";
import { uid } from "@/lib/utils/id";

/* ============================================================
 * Generic CRUD: every operation routes to Supabase if present,
 * otherwise falls back to the file-backed memory store.
 * ============================================================ */

const useSupabase = () => hasSupabaseService();

/* ---------------- Jobs ---------------- */

export async function createJob(input: {
  title: string;
  jd: ParsedJD;
  jdRaw: string;
  blindMode?: boolean;
  metadata?: JobMetadata;
}): Promise<Job> {
  const id = uid("job");
  const now = new Date().toISOString();
  const job: Job = {
    id,
    title: input.title,
    createdAt: now,
    status: "draft",
    jd: input.jd,
    jdRaw: input.jdRaw,
    weights: { semantic: 0.5, graph: 0.4, experience: 0.1 },
    blindMode: input.blindMode ?? false,
    metadata: input.metadata,
  };

  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    const { data, error } = await sb
      .from("jobs")
      .insert({
        id,
        title: job.title,
        status: job.status,
        jd: job.jd,
        jd_raw: job.jdRaw,
        weights: job.weights,
        blind_mode: job.blindMode,
        metadata: (job.metadata ?? null) as never,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToJob(data);
  }

  await withStore((s) => {
    s.jobs[id] = job;
  });
  return job;
}

export async function getJob(id: string): Promise<Job | null> {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    const { data } = await sb.from("jobs").select("*").eq("id", id).maybeSingle();
    return data ? rowToJob(data) : null;
  }
  return readStore((s) => s.jobs[id] ?? null);
}

export async function updateJobStatus(id: string, status: JobStatus) {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    await sb.from("jobs").update({ status }).eq("id", id);
    return;
  }
  await withStore((s) => {
    if (s.jobs[id]) s.jobs[id].status = status;
  });
}

export async function setJobAudit(id: string, audit: AuditResult) {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    await sb.from("jobs").update({ audit, status: "ready" }).eq("id", id);
    return;
  }
  await withStore((s) => {
    if (s.jobs[id]) {
      s.jobs[id].audit = audit;
      s.jobs[id].status = "ready";
    }
  });
}

export async function setJobEmbedding(id: string, embedding: number[]) {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    await sb.from("jobs").update({ jd_embedding: embedding }).eq("id", id);
    return;
  }
  await withStore((s) => {
    s.jdEmbeddings[id] = embedding;
  });
}

export async function getJobEmbedding(id: string): Promise<number[] | null> {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    const { data } = await sb
      .from("jobs")
      .select("jd_embedding")
      .eq("id", id)
      .maybeSingle();
    return (data?.jd_embedding as number[] | null) ?? null;
  }
  return readStore((s) => s.jdEmbeddings[id] ?? null);
}

export async function listJobs(): Promise<JobSummary[]> {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    const { data: jobs } = await sb
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: candidates } = await sb
      .from("candidate_jobs")
      .select("job_id,status,score");
    const grouped = new Map<string, Candidate[]>();
    for (const c of candidates ?? []) {
      const arr = grouped.get(c.job_id as string) ?? [];
      arr.push({ ...(c as unknown as Candidate) });
      grouped.set(c.job_id as string, arr);
    }
    return (jobs ?? []).map((j) => summarize(rowToJob(j), grouped.get(j.id) ?? []));
  }
  return readStore((s) => {
    const out: JobSummary[] = [];
    for (const j of Object.values(s.jobs)) {
      const cands = Object.values(s.candidates).filter((c) => c.jobId === j.id);
      out.push(summarize(j, cands));
    }
    return out.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });
}

function summarize(j: Job, cands: Candidate[]): JobSummary {
  const doneCount = cands.filter((c) => c.status === "done").length;
  const failedCount = cands.filter((c) => c.status === "failed").length;
  const topScore = cands.reduce(
    (m, c) => Math.max(m, c.score?.overall ?? 0),
    0,
  );
  return {
    ...j,
    candidateCount: cands.length,
    doneCount,
    failedCount,
    topScore,
    flagged: j.audit?.flags.length ?? 0,
  };
}

/* -------------- Candidates -------------- */

export async function createCandidate(input: {
  jobId: string;
  filename: string;
}): Promise<Candidate> {
  const id = uid("cand");
  const now = new Date().toISOString();
  const c: Candidate = {
    id,
    jobId: input.jobId,
    filename: input.filename,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    const { data, error } = await sb
      .from("candidate_jobs")
      .insert({
        id,
        job_id: input.jobId,
        filename: input.filename,
        status: "queued",
      })
      .select()
      .single();
    if (error) throw error;
    return rowToCandidate(data);
  }
  await withStore((s) => {
    s.candidates[id] = c;
  });
  return c;
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    const { data } = await sb
      .from("candidate_jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? rowToCandidate(data) : null;
  }
  return readStore((s) => s.candidates[id] ?? null);
}

export async function listCandidatesForJob(jobId: string): Promise<Candidate[]> {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    const { data } = await sb
      .from("candidate_jobs")
      .select("*")
      .eq("job_id", jobId)
      .order("rank", { ascending: true, nullsFirst: false });
    return (data ?? []).map(rowToCandidate);
  }
  return readStore((s) =>
    Object.values(s.candidates)
      .filter((c) => c.jobId === jobId)
      .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)),
  );
}

export async function setCandidateStatus(
  id: string,
  status: CandidateStatus,
  error?: string,
) {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    await sb
      .from("candidate_jobs")
      .update({ status, error: error ?? null })
      .eq("id", id);
    return;
  }
  await withStore((s) => {
    const c = s.candidates[id];
    if (!c) return;
    c.status = status;
    c.error = error;
    c.updatedAt = new Date().toISOString();
  });
}

export async function setCandidateCv(id: string, cv: ParsedCV) {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    await sb.from("candidate_jobs").update({ cv }).eq("id", id);
    return;
  }
  await withStore((s) => {
    if (s.candidates[id]) s.candidates[id].cv = cv;
  });
}

export async function setCandidateEmbedding(id: string, embedding: number[]) {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    await sb.from("candidate_jobs").update({ cv_embedding: embedding }).eq("id", id);
    return;
  }
  await withStore((s) => {
    s.cvEmbeddings[id] = embedding;
  });
}

export async function getCandidateEmbedding(id: string): Promise<number[] | null> {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    const { data } = await sb
      .from("candidate_jobs")
      .select("cv_embedding")
      .eq("id", id)
      .maybeSingle();
    return (data?.cv_embedding as number[] | null) ?? null;
  }
  return readStore((s) => s.cvEmbeddings[id] ?? null);
}

export async function setCandidateScore(id: string, score: ScoreBreakdown) {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    await sb.from("candidate_jobs").update({ score }).eq("id", id);
    return;
  }
  await withStore((s) => {
    if (s.candidates[id]) s.candidates[id].score = score;
  });
}

export async function setCandidateInsights(
  id: string,
  insights: CandidateInsights,
) {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    await sb.from("candidate_jobs").update({ insights }).eq("id", id);
    return;
  }
  await withStore((s) => {
    if (s.candidates[id]) s.candidates[id].insights = insights;
  });
}

export async function rankCandidates(jobId: string) {
  const cands = await listCandidatesForJob(jobId);
  const ranked = [...cands]
    .filter((c) => c.score)
    .sort((a, b) => (b.score?.overall ?? 0) - (a.score?.overall ?? 0));
  for (let i = 0; i < ranked.length; i++) {
    const id = ranked[i].id;
    if (useSupabase()) {
      const sb = getServiceSupabase()!;
      await sb.from("candidate_jobs").update({ rank: i + 1 }).eq("id", id);
    } else {
      await withStore((s) => {
        if (s.candidates[id]) s.candidates[id].rank = i + 1;
      });
    }
  }
}

/* -------------- Queue -------------- */

export async function enqueueCandidate(candidateId: string, jobId: string) {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    await sb.rpc("pgmq_send", { qname: "cv_jobs", msg: { candidateId, jobId } });
    return;
  }
  await withStore((s) => {
    s.queue.push({ candidateId, jobId });
  });
}

export async function readQueueBatch(limit = 5) {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    const { data } = await sb.rpc("pgmq_read", {
      qname: "cv_jobs",
      vt: 60,
      qty: limit,
    });
    return (data ?? []) as Array<{
      msg_id: number;
      message: { candidateId: string; jobId: string };
    }>;
  }
  return readStore((s) => s.queue.slice(0, limit)).then((items) =>
    items.map((m, i) => ({ msg_id: i, message: m })),
  );
}

export async function archiveQueue(msgId: number) {
  if (useSupabase()) {
    const sb = getServiceSupabase()!;
    await sb.rpc("pgmq_archive", { qname: "cv_jobs", msg_id: msgId });
    return;
  }
  await withStore((s) => {
    s.queue.splice(msgId, 1);
  });
}

/* -------------- helpers -------------- */

type JobRow = Record<string, unknown>;
function rowToJob(r: JobRow): Job {
  return {
    id: r.id as string,
    title: r.title as string,
    createdAt: r.created_at as string,
    status: r.status as JobStatus,
    jd: r.jd as ParsedJD,
    jdRaw: r.jd_raw as string,
    weights: (r.weights as Job["weights"]) ?? {
      semantic: 0.5,
      graph: 0.4,
      experience: 0.1,
    },
    audit: (r.audit as AuditResult | undefined) ?? undefined,
    blindMode: Boolean(r.blind_mode),
    metadata: (r.metadata as JobMetadata | undefined) ?? undefined,
  };
}

function rowToCandidate(r: JobRow): Candidate {
  return {
    id: r.id as string,
    jobId: r.job_id as string,
    filename: r.filename as string,
    status: r.status as CandidateStatus,
    error: (r.error as string | undefined) ?? undefined,
    cv: (r.cv as ParsedCV | undefined) ?? undefined,
    score: (r.score as ScoreBreakdown | undefined) ?? undefined,
    insights: (r.insights as CandidateInsights | undefined) ?? undefined,
    rank: (r.rank as number | undefined) ?? undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}
