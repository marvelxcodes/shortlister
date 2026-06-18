import { notFound } from "next/navigation";
import { getJob, listCandidatesForJob } from "@/lib/db/store";
import { JobDetailClient } from "@/components/jobs/job-detail-client";
import type { RankRow } from "@/components/jobs/ranking-table";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();
  const candidates = await listCandidatesForJob(id);

  const initial = {
    job: {
      id: job.id,
      title: job.title,
      status: job.status,
      blindMode: job.blindMode,
      audit: job.audit,
      jd: {
        title: job.jd.title,
        seniority: job.jd.seniority,
        minYears: job.jd.minYears,
        mustHaveSkills: job.jd.mustHaveSkills,
        niceToHaveSkills: job.jd.niceToHaveSkills,
        summary: job.jd.summary,
      },
    },
    candidates: candidates.map<RankRow>((c) => ({
      id: c.id,
      filename: c.filename,
      status: c.status,
      rank: c.rank,
      score: c.score,
      cv: c.cv
        ? {
            name: c.cv.name,
            location: c.cv.location,
            totalYears: c.cv.totalYears,
            education: c.cv.education,
          }
        : undefined,
    })),
  };

  return (
    <div className="mx-auto max-w-7xl">
      <JobDetailClient initial={initial} />
    </div>
  );
}
