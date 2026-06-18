import { AlertTriangle, ShieldTick as ShieldCheck, Stars01 as Sparkle } from "@untitledui/icons";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { AuditResult } from "@/lib/types/schemas";

export function AuditPanel({
  audit,
  candidateMap,
}: {
  audit: AuditResult | undefined;
  candidateMap: Record<string, string>;
}) {
  if (!audit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle icon={<ShieldCheck className="h-3.5 w-3.5" />}>
            Bias & diversity audit
          </CardTitle>
          <Badge tone="neutral">Pending</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-[12.5px] text-muted">
            The auditor runs automatically once every candidate has settled. It
            flags pedigree skew (measurable proxies only — no protected
            attributes are inferred) and surfaces non-traditional high-skill
            candidates.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<ShieldCheck className="h-3.5 w-3.5" />}>
          Bias & diversity audit
        </CardTitle>
        {audit.pedigreeSkewWarning ? (
          <Badge tone="warning" dot>
            Skew detected
          </Badge>
        ) : (
          <Badge tone="success" dot>
            Balanced
          </Badge>
        )}
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Metric
            label="Skill median"
            value={audit.skillMedian}
            tone="brand"
          />
          <Metric
            label="Pedigree median"
            value={audit.pedigreeMedian}
            tone="amber"
          />
        </div>

        {audit.pedigreeSkewWarning && audit.pedigreeSkewDescription ? (
          <div className="flex gap-2 rounded-[12px] border border-amber-100 bg-amber-50/60 p-3 text-[12.5px]">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span className="text-ink-2">
              {audit.pedigreeSkewDescription}
            </span>
          </div>
        ) : null}

        <div>
          <div className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-ink-2">
            <Sparkle className="h-3.5 w-3.5 text-brand-600" />
            Surfaced for explicit review
          </div>
          {audit.flags.length === 0 ? (
            <p className="text-[12px] text-muted">
              No non-traditional candidates flagged in this shortlist.
            </p>
          ) : (
            <ul className="space-y-2">
              {audit.flags.map((f, i) => (
                <li
                  key={`${f.candidateId}-${i}`}
                  className="flex items-start gap-2 rounded-[10px] border border-border bg-surface-2 p-2.5 text-[12.5px]"
                >
                  <div className="mt-0.5 shrink-0">
                    <FlagDot kind={f.kind} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-ink-2">
                      {candidateMap[f.candidateId] ?? f.candidateId}
                    </div>
                    <div className="text-muted">{f.rationale}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "brand" | "amber";
}) {
  return (
    <div className="rounded-[12px] border border-border bg-surface-2 p-3">
      <div className="text-[11.5px] uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className="mt-1 text-[20px] font-semibold tnum">
        {(value * 100).toFixed(0)}
      </div>
      <Progress
        value={value * 100}
        tone={tone === "amber" ? "amber" : "brand"}
        className="mt-2"
      />
    </div>
  );
}

function FlagDot({ kind }: { kind: string }) {
  const tone =
    kind === "pedigree_skew"
      ? "bg-amber-500"
      : kind === "high_skill_no_degree"
        ? "bg-brand-500"
        : "bg-teal-500";
  return <span className={`block h-2 w-2 rounded-full ${tone}`} />;
}
