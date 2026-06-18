import Link from "next/link";
import {
  ArrowLeft,
  Award01 as Award,
  Briefcase01 as Briefcase,
  GraduationHat01 as GraduationCap,
  MessageSquare01 as MessageSquare,
  ShieldTick as ShieldCheck,
  Stars02 as Sparkles,
  Target01 as Target,
} from "@untitledui/icons";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Kpi } from "@/components/ui/kpi";
import { ScoreBar } from "@/components/ui/score-bar";
import { SkillRadar } from "@/components/charts/skill-radar";
import type { Candidate, Job } from "@/lib/types/domain";
import { formatScore } from "@/lib/utils/format";
import { resolveSkill, labelOf } from "@/lib/graph/skill-graph";

export function CandidateDetail({
  job,
  candidate,
}: {
  job: Job;
  candidate: Candidate;
}) {
  const blind = job.blindMode;
  const displayName = blind
    ? `Candidate ${candidate.rank ?? "?"}`
    : candidate.cv?.name ?? candidate.filename;

  const radarAxes = buildRadarAxes(job, candidate);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href={`/jobs/${job.id}`}
            className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-ink-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to {job.title || job.jd.title}
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <Avatar name={displayName} masked={blind} size={48} />
            <div>
              <h1 className="text-[24px] font-semibold tracking-tight">
                {displayName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
                <span>
                  {candidate.cv?.totalYears ?? "—"} yrs experience
                </span>
                {candidate.cv?.location ? (
                  <>
                    <span>·</span>
                    <span>{candidate.cv.location}</span>
                  </>
                ) : null}
                <span>·</span>
                <span className="font-mono text-[11px]">
                  {candidate.filename}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RankBadge rank={candidate.rank} />
          {candidate.score ? (
            <div className="rounded-[12px] border border-border bg-surface px-3 py-2 text-right">
              <div className="text-[10.5px] uppercase tracking-wider text-muted">
                Overall
              </div>
              <div className="text-[22px] font-semibold tnum">
                {formatScore(candidate.score.overall)}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi
          label="Semantic match"
          icon={Target}
          value={candidate.score ? formatScore(candidate.score.semantic, 0) : "—"}
          tone="brand"
          hint="cosine(JD, CV)"
        />
        <Kpi
          label="Skill graph"
          icon={Sparkles}
          value={candidate.score ? formatScore(candidate.score.skillGraph, 0) : "—"}
          tone="teal"
          hint="1-hop jaccard"
        />
        <Kpi
          label="Pedigree"
          icon={GraduationCap}
          value={candidate.score ? formatScore(candidate.score.pedigree, 0) : "—"}
          tone="amber"
          hint="tenure + edu"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle icon={<MessageSquare className="h-3.5 w-3.5" />}>
                Justification
              </CardTitle>
              <Badge tone="brand" dot>
                Delta-Based RAG
              </Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-[13.5px] leading-relaxed text-ink-2">
                {candidate.insights?.justification ??
                  "Insights are still being generated."}
              </p>
              {candidate.insights ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Section
                    title="Strengths"
                    items={candidate.insights.strengths}
                    tone="success"
                  />
                  <Section
                    title="Gaps & risks"
                    items={candidate.insights.risks}
                    tone="warning"
                  />
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={<MessageSquare className="h-3.5 w-3.5" />}>
                Tailored interview questions
              </CardTitle>
              <Badge tone="info">
                {candidate.insights?.interviewQuestions.length ?? 0} qs
              </Badge>
            </CardHeader>
            <CardBody className="space-y-3">
              {candidate.insights?.interviewQuestions.map((q, i) => (
                <div
                  key={`${q.question}-${i}`}
                  className="rounded-[12px] border border-border bg-surface-2 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-[13.5px] font-semibold text-ink">
                        Q{i + 1}. {q.question}
                      </div>
                      {q.probes.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-[12.5px] text-muted">
                          {q.probes.map((p, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-1.5"
                            >
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-500" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={difficultyTone(q.difficulty)} dot>
                        {q.difficulty}
                      </Badge>
                      {q.targetGap ? (
                        <span className="text-[10.5px] text-muted">
                          probes: {q.targetGap}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )) ?? (
                <p className="text-[12.5px] text-muted">
                  Questions appear once the insights agent runs.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle icon={<Sparkles className="h-3.5 w-3.5" />}>
                Skill alignment
              </CardTitle>
            </CardHeader>
            <CardBody>
              {radarAxes.length >= 3 ? (
                <SkillRadar data={radarAxes} />
              ) : (
                <p className="text-[12.5px] text-muted">
                  Add more skills to the JD to render a radar.
                </p>
              )}
              <div className="mt-3 grid grid-cols-1 gap-2">
                <SubScore
                  label="Semantic"
                  value={candidate.score?.semantic ?? 0}
                />
                <SubScore
                  label="Skill graph"
                  value={candidate.score?.skillGraph ?? 0}
                />
                <SubScore
                  label="Pedigree"
                  value={candidate.score?.pedigree ?? 0}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={<Briefcase className="h-3.5 w-3.5" />}>
                Career
              </CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {candidate.cv?.roles.length === 0 ? (
                <p className="text-[12.5px] text-muted">No roles parsed.</p>
              ) : (
                candidate.cv?.roles.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-[10px] border border-border bg-surface-2 p-3 text-[12.5px]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-ink-2">
                        {r.title}
                      </div>
                      <span className="text-muted tnum">
                        {r.startYear ?? "?"}–{r.endYear ?? "now"}
                      </span>
                    </div>
                    <div className="text-muted">
                      {blind ? "Employer redacted" : r.company}
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                Matched · Missing
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-2">
                Matched
              </div>
              <div className="mb-4 flex flex-wrap gap-1.5">
                {candidate.score?.matchedSkills.length ? (
                  candidate.score.matchedSkills.map((s) => (
                    <Badge tone="success" key={s}>
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[12px] text-muted">—</span>
                )}
              </div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-2">
                Missing
              </div>
              <div className="flex flex-wrap gap-1.5">
                {candidate.score?.missingSkills.length ? (
                  candidate.score.missingSkills.map((s) => (
                    <Badge tone="warning" key={s}>
                      {s}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[12px] text-muted">—</span>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SubScore({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[11.5px]">
        <span className="text-muted">{label}</span>
        <span className="font-semibold tnum">
          {(value * 100).toFixed(0)}
        </span>
      </div>
      <ScoreBar value={value} size="sm" />
    </div>
  );
}

function Section({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "success" | "warning";
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-[12px] border border-border bg-surface-2 p-3">
      <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-muted-2">
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-[12.5px]">
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                tone === "success" ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span className="text-ink-2">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RankBadge({ rank }: { rank?: number }) {
  if (!rank) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-[12px] font-semibold text-amber-700">
      <Award className="h-3.5 w-3.5" /> Rank #{rank}
    </span>
  );
}

function difficultyTone(d: string) {
  return d === "hard" ? "danger" : d === "easy" ? "success" : "info";
}

/**
 * Build a radar chart comparing the JD's "ideal" coverage per skill node
 * vs the candidate's coverage. Each axis is a canonical skill that's
 * either matched or missing.
 */
function buildRadarAxes(job: Job, candidate: Candidate) {
  const jdSkills = [
    ...job.jd.mustHaveSkills,
    ...job.jd.niceToHaveSkills,
  ].slice(0, 6);
  const matched = new Set(candidate.score?.matchedSkills ?? []);

  return jdSkills
    .map((raw) => {
      const id = resolveSkill(raw);
      const label = id ? labelOf(id) : raw;
      return {
        axis: label,
        jd: 100,
        candidate: matched.has(label) ? 85 : 25,
      };
    })
    .filter((x, idx, arr) => arr.findIndex((y) => y.axis === x.axis) === idx);
}
