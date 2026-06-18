import type { Candidate } from "@/lib/types/domain";
import type { AuditResult } from "@/lib/types/schemas";

/* ============================================================
 * Auditor Agent
 *
 *  - No protected attributes are inferred. The audit reasons over
 *    measurable proxies only (pedigree score vs skill score).
 *  - Pedigree-vs-skill delta: warn when every shortlisted candidate
 *    sits top-quartile on pedigree but only middle-quartile on skill.
 *  - Non-traditional surfacing: candidates with skill ≥ 80th pct
 *    but no degree or no FAANG-tier employer get flagged for
 *    explicit recruiter attention.
 * ============================================================ */

const FAANG = new Set([
  "google",
  "alphabet",
  "meta",
  "facebook",
  "amazon",
  "apple",
  "netflix",
  "microsoft",
  "nvidia",
  "openai",
  "anthropic",
  "stripe",
  "uber",
  "airbnb",
  "linkedin",
]);

export function auditShortlist(candidates: Candidate[]): AuditResult {
  const scored = candidates.filter((c) => c.score && c.status === "done");
  if (scored.length === 0) {
    return {
      pedigreeSkewWarning: false,
      pedigreeMedian: 0,
      skillMedian: 0,
      flags: [],
      shortlistCount: 0,
    };
  }

  const skill = scored
    .map((c) => c.score?.skillGraph ?? 0)
    .sort((a, b) => a - b);
  const pedi = scored.map((c) => c.score?.pedigree ?? 0).sort((a, b) => a - b);

  const skillMedian = median(skill);
  const pedigreeMedian = median(pedi);
  const p80skill = quantile(skill, 0.8);

  // Skew rule: pedigree median is in the top quartile (>0.75) while skill
  // median sits in the middle (0.4..0.65).
  const skew = pedigreeMedian >= 0.75 && skillMedian < 0.65 && skillMedian > 0.4;

  const flags: AuditResult["flags"] = [];
  for (const c of scored) {
    const s = c.score?.skillGraph ?? 0;
    if (s < p80skill || !c.cv) continue;

    const hasDegree = (c.cv.education?.length ?? 0) > 0;
    const employers = (c.cv.roles ?? []).map((r) => normCompany(r.company));
    const hasFaang = employers.some((e) => FAANG.has(e));

    if (!hasDegree) {
      flags.push({
        candidateId: c.id,
        kind: "high_skill_no_degree",
        rationale:
          "Skill graph match is in the top 20% of the shortlist but the candidate has no formal degree on record.",
      });
    } else if (!hasFaang) {
      flags.push({
        candidateId: c.id,
        kind: "high_skill_non_faang",
        rationale:
          "Top-20% skill match without prior FAANG-tier employer — worth surfacing for non-traditional hire potential.",
      });
    }
  }

  if (skew) {
    for (const c of scored.slice(0, 3)) {
      flags.push({
        candidateId: c.id,
        kind: "pedigree_skew",
        rationale:
          "Shortlist over-indexes on pedigree (top quartile) versus measured skill (middle quartile).",
      });
    }
  }

  return {
    pedigreeSkewWarning: skew,
    pedigreeSkewDescription: skew
      ? `Pedigree median ${(pedigreeMedian * 100).toFixed(0)} vs skill median ${(skillMedian * 100).toFixed(0)} — consider widening the funnel.`
      : undefined,
    pedigreeMedian,
    skillMedian,
    flags,
    shortlistCount: scored.length,
  };
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base] + (sorted[base + 1] ?? sorted[base] - sorted[base]) * rest;
}

function normCompany(c: string) {
  return c
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|co|corp|corporation|gmbh)\b\.?/g, "")
    .trim();
}
