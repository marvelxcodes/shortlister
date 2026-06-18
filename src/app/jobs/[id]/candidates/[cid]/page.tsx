import { notFound } from "next/navigation";
import { getCandidate, getJob } from "@/lib/db/store";
import { CandidateDetail } from "@/components/candidates/candidate-detail";

export const dynamic = "force-dynamic";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string; cid: string }>;
}) {
  const { id, cid } = await params;
  const [job, candidate] = await Promise.all([getJob(id), getCandidate(cid)]);
  if (!job || !candidate || candidate.jobId !== job.id) notFound();
  return (
    <div className="mx-auto max-w-7xl">
      <CandidateDetail job={job} candidate={candidate} />
    </div>
  );
}
