"use client";

import * as React from "react";
import {
  Briefcase01 as Briefcase,
  FilterFunnel01 as Filter,
  Loading01 as Loader2,
  RefreshCw01 as RefreshCw,
  Scan as ScanSearch,
  Stars02 as Sparkles,
} from "@untitledui/icons";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kpi } from "@/components/ui/kpi";
import { ScoreDistribution } from "@/components/charts/score-distribution";
import { RankingTable, type RankRow } from "@/components/jobs/ranking-table";
import { AuditPanel } from "@/components/jobs/audit-panel";
import { formatScore } from "@/lib/utils/format";
import type { AuditResult, JobStatus } from "@/lib/types/schemas";

interface ProgressPayload {
  job: {
    id: string;
    title: string;
    status: JobStatus;
    blindMode: boolean;
    audit?: AuditResult;
    jd: {
      title: string;
      seniority: string;
      minYears: number;
      mustHaveSkills: string[];
      niceToHaveSkills: string[];
      summary: string;
    };
  };
  candidates: RankRow[];
}

export function JobDetailClient({
  initial,
}: {
  initial: ProgressPayload;
}) {
  const [state, setState] = React.useState<ProgressPayload>(initial);
  const [refreshing, setRefreshing] = React.useState(false);

  const isLive =
    state.job.status === "processing" || state.job.status === "auditing";

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/jobs/${state.job.id}/progress`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as ProgressPayload;
        setState(data);
      }
    } finally {
      setRefreshing(false);
    }
  }, [state.job.id]);

  React.useEffect(() => {
    if (!isLive) return;
    const t = setInterval(refresh, 1200);
    return () => clearInterval(t);
  }, [isLive, refresh]);

  const candidates = state.candidates;
  const done = candidates.filter((c) => c.status === "done").length;
  const failed = candidates.filter((c) => c.status === "failed").length;
  const top = candidates.find((c) => c.rank === 1);
  const candidateMap = Object.fromEntries(
    candidates.map((c) => [
      c.id,
      state.job.blindMode
        ? `Candidate ${c.rank ?? "?"}`
        : c.cv?.name ?? c.filename,
    ]),
  );

  const dist = bucketize(
    candidates
      .map((c) => c.score?.overall)
      .filter((v): v is number => typeof v === "number"),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12.5px] text-muted">
            <Briefcase className="h-3.5 w-3.5" />
            <span>Job</span>
            <span>·</span>
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">
              {state.job.id.slice(0, 8)}
            </span>
          </div>
          <h1 className="mt-1.5 text-[24px] font-semibold tracking-tight">
            {state.job.title || state.job.jd.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone="brand" dot>
              {state.job.jd.seniority}
            </Badge>
            <Badge tone="info">{state.job.jd.minYears}+ yrs</Badge>
            {state.job.blindMode ? (
              <Badge tone="amber" dot>
                Blind mode
              </Badge>
            ) : null}
            <StatusChip status={state.job.status} live={isLive} />
          </div>
        </div>
        <Button onClick={refresh} variant="outline" disabled={refreshing}>
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Candidates"
          icon={Briefcase}
          value={candidates.length}
          hint="in batch"
          tone="brand"
        />
        <Kpi
          label="Processed"
          icon={ScanSearch}
          value={`${done}/${candidates.length}`}
          delta={
            candidates.length
              ? (done / candidates.length) * 100 - 50
              : undefined
          }
          tone="teal"
        />
        <Kpi
          label="Top match"
          icon={Sparkles}
          value={top?.score ? formatScore(top.score.overall) : "—"}
          hint={top ? (state.job.blindMode ? "blinded" : top.cv?.name) : "—"}
          tone="amber"
        />
        <Kpi
          label="Failures"
          icon={Filter}
          value={failed}
          hint={failed ? "review logs" : "all clear"}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle icon={<Sparkles className="h-3.5 w-3.5" />}>
              Ranked shortlist
            </CardTitle>
            <span className="text-[11.5px] text-muted">
              {state.job.blindMode
                ? "Names + schools hidden in UI"
                : "Full identifying data shown"}
            </span>
          </CardHeader>
          <CardBody className="space-y-4">
            <RankingTable
              rows={candidates}
              jobId={state.job.id}
              blindMode={state.job.blindMode}
            />
            <div className="text-[11px] leading-snug text-muted">
              Scoring formula: w<sub>v</sub>·cos(JD, CV) + w<sub>g</sub>
              ·jaccard(skills) − w<sub>e</sub>·gap. Skill nodes are expanded
              one hop in the knowledge graph so "Next.js" matches a JD asking
              for "React".
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <AuditPanel audit={state.job.audit} candidateMap={candidateMap} />
          <Card>
            <CardHeader>
              <CardTitle icon={<ScanSearch className="h-3.5 w-3.5" />}>
                Score distribution
              </CardTitle>
            </CardHeader>
            <CardBody>
              {dist.some((d) => d.count > 0) ? (
                <ScoreDistribution data={dist} />
              ) : (
                <div className="grid h-[180px] place-items-center text-[12px] text-muted">
                  Awaiting scoring…
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle icon={<Briefcase className="h-3.5 w-3.5" />}>
                Role summary
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-[12.5px]">
              <p className="leading-snug text-ink-2">
                {state.job.jd.summary}
              </p>
              <div>
                <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-2">
                  Must-have
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {state.job.jd.mustHaveSkills.map((s) => (
                    <Badge tone="brand" key={s}>
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              {state.job.jd.niceToHaveSkills.length > 0 ? (
                <div>
                  <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted-2">
                    Nice-to-have
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {state.job.jd.niceToHaveSkills.map((s) => (
                      <Badge tone="info" key={s}>
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status, live }: { status: JobStatus; live: boolean }) {
  if (status === "processing")
    return (
      <Badge tone="info" dot>
        <Loader2 className="-ml-0.5 mr-0.5 h-3 w-3 animate-spin" /> Processing
      </Badge>
    );
  if (status === "auditing")
    return (
      <Badge tone="amber" dot>
        Auditing
      </Badge>
    );
  if (status === "ready")
    return (
      <Badge tone="success" dot>
        Ready
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge tone="danger" dot>
        Failed
      </Badge>
    );
  return (
    <Badge tone="neutral" dot={live}>
      Draft
    </Badge>
  );
}

function bucketize(values: number[]) {
  const labels = ["0-20", "20-40", "40-60", "60-80", "80-100"];
  const buckets = labels.map((b) => ({ bucket: b, count: 0 }));
  for (const v of values) {
    const i = Math.min(4, Math.max(0, Math.floor(v / 0.2)));
    buckets[i].count += 1;
  }
  return buckets;
}
