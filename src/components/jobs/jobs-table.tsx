import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase01 as Briefcase,
  CheckCircle as CheckCircle2,
  AlertCircle as CircleAlert,
  Loading01 as Loader2,
} from "@untitledui/icons";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatScore } from "@/lib/utils/format";
import type { JobSummary } from "@/lib/types/domain";
import { format } from "date-fns";

export function JobsTable({ jobs }: { jobs: JobSummary[] }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-surface-2 text-left text-[11.5px] uppercase tracking-wider text-muted">
            <th className="px-5 py-3 font-medium">Role</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-3 py-3 font-medium">Pipeline</th>
            <th className="px-3 py-3 font-medium">Top match</th>
            <th className="px-3 py-3 font-medium">Audit</th>
            <th className="px-5 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => {
            const pct =
              j.candidateCount === 0
                ? 0
                : Math.round((j.doneCount / j.candidateCount) * 100);
            return (
              <tr
                key={j.id}
                className="border-b border-border last:border-0 hover:bg-surface-2/50"
              >
                <td className="px-5 py-3.5">
                  <Link
                    href={`/jobs/${j.id}`}
                    className="flex items-center gap-3"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                      <Briefcase className="h-[16px] w-[16px]" />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-semibold text-ink">
                        {j.title || j.jd.title}
                      </span>
                      <span className="text-[11.5px] text-muted">
                        {j.jd.seniority} · {j.candidateCount} CVs ·{" "}
                        {format(new Date(j.createdAt), "MMM d, yyyy")}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3.5">
                  <JobStatusBadge status={j.status} />
                </td>
                <td className="px-3 py-3.5">
                  <div className="flex w-[180px] flex-col gap-1">
                    <Progress value={pct} tone="brand" />
                    <div className="flex items-center justify-between text-[11px] text-muted">
                      <span>
                        {j.doneCount}/{j.candidateCount} done
                      </span>
                      <span className="tnum font-semibold text-ink-2">
                        {pct}%
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold tnum">
                      {j.topScore && j.topScore > 0
                        ? formatScore(j.topScore)
                        : "—"}
                    </span>
                    {j.topScore && j.topScore > 0 ? (
                      <Badge tone="success" dot>
                        ranked
                      </Badge>
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  {j.audit ? (
                    j.audit.pedigreeSkewWarning ? (
                      <Badge tone="warning" dot>
                        Pedigree skew
                      </Badge>
                    ) : (
                      <Badge tone="success" dot>
                        Balanced
                      </Badge>
                    )
                  ) : (
                    <span className="text-[12px] text-muted">—</span>
                  )}
                  {j.flagged && j.flagged > 0 ? (
                    <span className="ml-1 text-[11.5px] text-muted">
                      · {j.flagged} flag{j.flagged === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/jobs/${j.id}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[12px] font-medium text-ink-2 hover:bg-surface-2"
                  >
                    Open
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function JobStatusBadge({ status }: { status: JobSummary["status"] }) {
  switch (status) {
    case "draft":
      return <Badge tone="neutral">Draft</Badge>;
    case "processing":
      return (
        <Badge tone="info" dot>
          <Loader2 className="-ml-0.5 mr-0.5 h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case "auditing":
      return (
        <Badge tone="amber" dot>
          Auditing
        </Badge>
      );
    case "ready":
      return (
        <Badge tone="success" dot>
          <CheckCircle2 className="-ml-0.5 mr-0.5 h-3 w-3" />
          Ready
        </Badge>
      );
    case "failed":
      return (
        <Badge tone="danger" dot>
          <CircleAlert className="-ml-0.5 mr-0.5 h-3 w-3" />
          Failed
        </Badge>
      );
  }
}
