"use client";

import Link from "next/link";
import { ArrowUpRight, Award01 as Award } from "@untitledui/icons";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score-bar";
import { StatusPill } from "@/components/ui/status-pill";
import { formatScore } from "@/lib/utils/format";
import type { CandidateStatus, ScoreBreakdown } from "@/lib/types/schemas";

export interface RankRow {
  id: string;
  filename: string;
  status: CandidateStatus;
  rank?: number;
  score?: ScoreBreakdown;
  cv?: {
    name: string;
    location?: string;
    totalYears?: number;
    education?: Array<{ institution: string; degree?: string }>;
  };
}

export function RankingTable({
  rows,
  jobId,
  blindMode,
}: {
  rows: RankRow[];
  jobId: string;
  blindMode: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-surface-2 text-left text-[11.5px] uppercase tracking-wider text-muted">
            <th className="px-5 py-3 font-medium">#</th>
            <th className="px-3 py-3 font-medium">Candidate</th>
            <th className="px-3 py-3 font-medium">Overall</th>
            <th className="px-3 py-3 font-medium">Semantic</th>
            <th className="px-3 py-3 font-medium">Skill graph</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-5 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const name = c.cv?.name ?? c.filename;
            const eduDisplay =
              c.cv?.education?.[0]?.institution ?? "—";
            const isTop = c.rank === 1;
            return (
              <tr
                key={c.id}
                className="border-b border-border last:border-0 hover:bg-surface-2/50"
              >
                <td className="px-5 py-3.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-2 text-[11.5px] font-semibold tnum text-ink-2">
                    {isTop ? (
                      <Award className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      c.rank ?? "·"
                    )}
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={name} masked={blindMode} />
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ink">
                        {blindMode ? `Candidate ${c.rank ?? "—"}` : name}
                      </div>
                      <div className="truncate text-[11.5px] text-muted">
                        {c.cv?.totalYears != null
                          ? `${c.cv.totalYears} yrs`
                          : "—"}
                        {" · "}
                        {blindMode ? "School redacted" : eduDisplay}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <div className="flex w-[110px] flex-col gap-1.5">
                    <span className="text-[15px] font-semibold tnum">
                      {c.score ? formatScore(c.score.overall) : "—"}
                    </span>
                    {c.score ? <ScoreBar value={c.score.overall} size="sm" /> : null}
                  </div>
                </td>
                <td className="px-3 py-3.5">
                  <span className="tnum">
                    {c.score ? formatScore(c.score.semantic, 0) : "—"}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <span className="tnum">
                    {c.score ? formatScore(c.score.skillGraph, 0) : "—"}
                  </span>
                </td>
                <td className="px-3 py-3.5">
                  <StatusPill status={c.status} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/jobs/${jobId}/candidates/${c.id}`}
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
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-[12.5px] text-muted">
          No candidates yet.
        </div>
      ) : null}
    </div>
  );
}

export function ScoreLegend() {
  return (
    <div className="flex flex-wrap gap-2 text-[11px]">
      <Badge tone="brand" dot>
        score = 0.5·semantic + 0.4·graph − 0.1·gap
      </Badge>
    </div>
  );
}
