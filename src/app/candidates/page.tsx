import Link from "next/link";
import {
  Users01 as Users2,
  Stars02 as Sparkles,
  MessageChatCircle as Quote,
  ArrowRight as ArrowRight,
} from "@untitledui/icons";
import { listJobs, listCandidatesForJob } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score-bar";
import { EmptyState } from "@/components/ui/empty";
import { formatScore } from "@/lib/utils/format";
import { JobSelector } from "@/components/candidates/job-selector";

export const dynamic = "force-dynamic";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const jobs = await listJobs();
  const { job: requestedJobId } = await searchParams;

  if (jobs.length === 0) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Candidates"
          description="Pick a job to see its ranked candidates and explainability."
        />
        <Card>
          <CardBody>
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title="No jobs yet"
              description="Create a job to get started."
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  const selected = jobs.find((j) => j.id === requestedJobId) ?? jobs[0];
  const candidates = await listCandidatesForJob(selected.id);

  const ranked = candidates
    .filter((c) => c.status === "done")
    .sort((a, b) => (b.score?.overall ?? 0) - (a.score?.overall ?? 0));

  const jobLabel = selected.title || selected.jd.title;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Candidates"
        description="Ranked candidates and per-candidate Insights for the selected job."
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <JobSelector
          jobs={jobs.map((j) => ({
            id: j.id,
            title: j.title || j.jd.title || "Untitled job",
          }))}
          selectedId={selected.id}
        />
        <Link
          href={`/jobs/${selected.id}`}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-700 hover:underline"
        >
          open job <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={<Users2 className="h-3.5 w-3.5" />}>
            {jobLabel}
          </CardTitle>
          <Badge tone="brand" dot>
            {ranked.length} ranked
          </Badge>
        </CardHeader>
        <CardBody>
          {ranked.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-5 w-5" />}
              title="No scored candidates yet"
              description="Once the worker finishes scoring, ranked candidates appear here."
            />
          ) : (
            <ul className="space-y-3">
              {ranked.slice(0, 50).map((candidate) => {
                const name = selected.blindMode
                  ? `Candidate ${candidate.rank ?? "?"}`
                  : candidate.cv?.name ?? candidate.filename;
                const overall = candidate.score?.overall ?? 0;
                const justification = candidate.insights?.justification;
                const strengths = candidate.insights?.strengths ?? [];
                const risks = candidate.insights?.risks ?? [];
                return (
                  <li
                    key={candidate.id}
                    className="rounded-[14px] border border-border bg-surface transition hover:border-border-strong"
                  >
                    <Link
                      href={`/jobs/${selected.id}/candidates/${candidate.id}`}
                      className="block px-4 py-3.5"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar name={name} masked={selected.blindMode} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[14px] font-semibold text-ink">
                              {name}
                            </span>
                            <Badge tone="neutral">
                              Rank #{candidate.rank ?? "?"}
                            </Badge>
                          </div>
                          <div className="mt-0.5 truncate text-[11.5px] text-muted">
                            {candidate.cv?.totalYears != null
                              ? `${candidate.cv.totalYears} yrs experience`
                              : "—"}
                            {candidate.cv?.location
                              ? ` · ${candidate.cv.location}`
                              : ""}
                          </div>
                        </div>
                        <div className="w-[180px]">
                          <ScoreBar value={overall} size="sm" />
                        </div>
                        <div className="w-[58px] text-right text-[15px] font-semibold tnum text-ink">
                          {formatScore(overall)}
                        </div>
                      </div>

                      {(justification || strengths.length || risks.length) && (
                        <div className="mt-3 rounded-[10px] border border-border bg-[rgba(14,46,30,0.03)] px-3.5 py-3">
                          {justification ? (
                            <div className="flex gap-2 text-[12.5px] leading-relaxed text-ink-2">
                              <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" />
                              <p className="line-clamp-3">{justification}</p>
                            </div>
                          ) : (
                            <div className="text-[12px] text-muted">
                              Justification not generated yet.
                            </div>
                          )}
                          {(strengths.length > 0 || risks.length > 0) && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {strengths.slice(0, 4).map((s) => (
                                <Badge key={`s-${s}`} tone="brand">
                                  {s}
                                </Badge>
                              ))}
                              {risks.slice(0, 3).map((r) => (
                                <Badge key={`r-${r}`} tone="neutral">
                                  ⚠ {r}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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
