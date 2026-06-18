import Link from "next/link";
import {
  Briefcase01 as Briefcase,
  Users01 as Users2,
  Stars02 as Sparkles,
  ShieldTick as ShieldCheck,
  ArrowUpRight,
  Scan as ScanText,
  Target01 as Target,
} from "@untitledui/icons";
import { listJobs } from "@/lib/db/store";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { JobsTable } from "@/components/jobs/jobs-table";
import { PageHeader } from "@/components/layout/page-header";
import { ScoreDistribution } from "@/components/charts/score-distribution";
import { PipelineChart } from "@/components/charts/pipeline-chart";
import { formatScore } from "@/lib/utils/format";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const jobs = await listJobs();

  const totalCandidates = jobs.reduce((a, j) => a + j.candidateCount, 0);
  const totalDone = jobs.reduce((a, j) => a + j.doneCount, 0);
  const totalFailed = jobs.reduce((a, j) => a + j.failedCount, 0);
  const totalInFlight = Math.max(0, totalCandidates - totalDone - totalFailed);
  const totalFlagged = jobs.reduce((a, j) => a + (j.flagged ?? 0), 0);

  const jobsInFlight = jobs.filter(
    (j) => j.status === "processing" || j.status === "auditing",
  ).length;
  const jobsReady = jobs.filter((j) => j.status === "ready").length;

  // Average best-match across roles that have at least one scored candidate.
  // More representative than max(topScore) — one outlier role can't dominate.
  const scoredJobs = jobs.filter((j) => (j.topScore ?? 0) > 0);
  const avgTopScore =
    scoredJobs.length === 0
      ? 0
      : scoredJobs.reduce((a, j) => a + (j.topScore ?? 0), 0) /
        scoredJobs.length;

  const completionPct =
    totalCandidates === 0 ? 0 : (totalDone / totalCandidates) * 100;

  const labels = ["0-20", "20-40", "40-60", "60-80", "80-100"];
  const dist = labels.map((bucket) => ({ bucket, count: 0 }));
  for (const j of jobs) {
    const topProxy = j.topScore ?? 0;
    if (topProxy === 0) continue;
    const idx = Math.min(
      labels.length - 1,
      Math.max(0, Math.floor(topProxy / 0.2)),
    );
    dist[idx].count += j.doneCount;
  }

  const pipelineData = [
    { stage: "Queued", value: totalInFlight },
    { stage: "Done", value: totalDone, highlight: true },
    { stage: "Failed", value: totalFailed },
    { stage: "Flagged", value: totalFlagged },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Data Overview"
        description={`Last update: ${format(new Date(), "MMM d, h:mm a")}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Open roles"
          icon={Briefcase}
          value={jobs.length}
          hint={
            jobs.length === 0
              ? "start a job to populate"
              : `${jobsInFlight} in flight · ${jobsReady} ready`
          }
          tone="brand"
        />
        <Kpi
          label="CVs evaluated"
          icon={Users2}
          value={
            totalCandidates === 0
              ? 0
              : `${totalDone}/${totalCandidates}`
          }
          hint={
            totalCandidates === 0
              ? "no uploads yet"
              : `${completionPct.toFixed(0)}% complete · ${totalInFlight} in flight`
          }
          tone="success"
        />
        <Kpi
          label="Avg top match"
          icon={Target}
          value={avgTopScore > 0 ? formatScore(avgTopScore) : "—"}
          hint={
            scoredJobs.length === 0
              ? "no scored roles yet"
              : `mean of best match across ${scoredJobs.length} role${scoredJobs.length === 1 ? "" : "s"}`
          }
          tone="brand"
        />
        <Kpi
          label="Audit findings"
          icon={ShieldCheck}
          value={totalFlagged}
          hint={
            jobs.length === 0
              ? "—"
              : totalFlagged === 0
                ? "all clear"
                : `across ${jobs.filter((j) => (j.flagged ?? 0) > 0).length} role${jobs.filter((j) => (j.flagged ?? 0) > 0).length === 1 ? "" : "s"} · needs review`
          }
          tone={totalFlagged > 0 ? "danger" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle icon={<ScanText className="h-3.5 w-3.5" />}>
              Pipeline throughput
            </CardTitle>
            <Badge tone="brand" dot>
              live
            </Badge>
          </CardHeader>
          <CardBody>
            <PipelineChart data={pipelineData} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle icon={<Sparkles className="h-3.5 w-3.5" />}>
              Score distribution
            </CardTitle>
            <span className="text-[11px] text-muted">
              overall match · all jobs
            </span>
          </CardHeader>
          <CardBody>
            {totalDone > 0 ? (
              <ScoreDistribution data={dist} />
            ) : (
              <div className="grid h-[180px] place-items-center text-[12px] text-muted">
                Run a job to populate the distribution.
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle icon={<Briefcase className="h-3.5 w-3.5" />}>
            Recent jobs
          </CardTitle>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-700 hover:text-brand-800"
          >
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardBody>
          {jobs.length === 0 ? (
            <EmptyState
              icon={<Briefcase className="h-5 w-5" />}
              title="No jobs yet"
              description="Create your first shortlister run to see ranked candidates, gaps, and an automatic bias audit."
              action={
                <Link
                  href="/jobs/new"
                  className="inline-flex h-11 items-center gap-1.5 rounded-full bg-gradient-to-b from-brand-300 via-brand-400 to-brand-500 px-6 text-[13.5px] font-semibold text-ink shadow-[var(--shadow-brand)]"
                >
                  Start a job
                </Link>
              }
            />
          ) : (
            <JobsTable jobs={jobs.slice(0, 8)} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
