import Link from "next/link";
import { Users01 as Users2, Stars02 as Sparkles } from "@untitledui/icons";
import { listJobs, listCandidatesForJob } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score-bar";
import { EmptyState } from "@/components/ui/empty";
import { formatScore } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function CandidatesPage() {
  const jobs = await listJobs();
  const rows = (
    await Promise.all(
      jobs.map(async (j) => {
        const cands = await listCandidatesForJob(j.id);
        return cands
          .filter((c) => c.status === "done")
          .map((c) => ({ job: j, candidate: c }));
      }),
    )
  )
    .flat()
    .sort(
      (a, b) =>
        (b.candidate.score?.overall ?? 0) - (a.candidate.score?.overall ?? 0),
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Candidates"
        description="Every scored candidate across the workspace, ranked by overall match."
      />
      <Card>
        <CardHeader>
          <CardTitle icon={<Users2 className="h-3.5 w-3.5" />}>
            Top matches
          </CardTitle>
          <Badge tone="brand" dot>
            {rows.length}
          </Badge>
        </CardHeader>
        <CardBody>
          {rows.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title="No scored candidates yet"
              description="Run a job to populate this view."
            />
          ) : (
            <ul className="divide-y divide-border">
              {rows.slice(0, 50).map(({ job, candidate }) => {
                const name = job.blindMode
                  ? `Candidate ${candidate.rank ?? "?"}`
                  : candidate.cv?.name ?? candidate.filename;
                return (
                  <li key={candidate.id}>
                    <Link
                      href={`/jobs/${job.id}/candidates/${candidate.id}`}
                      className="flex items-center gap-4 px-1 py-3 hover:bg-surface-2/50"
                    >
                      <Avatar name={name} masked={job.blindMode} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold text-ink">
                          {name}
                        </div>
                        <div className="truncate text-[12px] text-muted">
                          {job.title || job.jd.title} · rank #
                          {candidate.rank ?? "?"}
                        </div>
                      </div>
                      <div className="w-[160px]">
                        <ScoreBar
                          value={candidate.score?.overall ?? 0}
                          size="sm"
                        />
                      </div>
                      <div className="w-[60px] text-right font-semibold tnum">
                        {formatScore(candidate.score?.overall ?? 0)}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
