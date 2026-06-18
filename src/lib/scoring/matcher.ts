import type { ParsedCV, ParsedJD, ScoreBreakdown } from "@/lib/types/schemas";
import { cosine } from "@/lib/ai/embed";
import {
  expandOneHop,
  jaccard,
  labelOf,
  resolveSkills,
} from "@/lib/graph/skill-graph";

/* ============================================================
 * Matcher Agent (deterministic math)
 *
 *   score = w_v · cosine(JD, CV)
 *         + w_g · jaccard(skills_JD, skills_CV_expanded)
 *         - w_e · experience_penalty
 *
 * Weights tunable per job. Returns a ScoreBreakdown including
 * matched / missing / expanded sets so the Insights agent has
 * everything it needs without re-reading the resume.
 * ============================================================ */

export interface MatcherWeights {
  semantic: number;
  graph: number;
  experience: number;
}

export function scoreCandidate(input: {
  jd: ParsedJD;
  cv: ParsedCV;
  jdEmbedding: number[];
  cvEmbedding: number[];
  weights?: MatcherWeights;
}): ScoreBreakdown {
  const w = input.weights ?? { semantic: 0.5, graph: 0.4, experience: 0.1 };

  const semantic = cosine(input.jdEmbedding, input.cvEmbedding);

  const jdSkills = resolveSkills([
    ...input.jd.mustHaveSkills,
    ...input.jd.niceToHaveSkills,
    ...input.jd.requirements.map((r) => r.skill),
  ]);
  const cvSkills = resolveSkills(input.cv.skills.map((s) => s.name));

  const expanded = expandOneHop(cvSkills.resolved);

  const matchedIds = expanded.filter((id) => jdSkills.resolved.includes(id));
  const missingIds = jdSkills.resolved.filter((id) => !expanded.includes(id));

  const skillGraph = jaccard(jdSkills.resolved, expanded);

  // Experience penalty: 0 when totalYears >= minYears, ramping up to 1 when
  // candidate has 0 yrs vs a 10+ yrs role.
  const minYears = input.jd.minYears ?? 0;
  const gap = Math.max(0, minYears - input.cv.totalYears);
  const experiencePenalty = Math.min(1, gap / Math.max(3, minYears));

  // Pedigree subscore: education depth + average tenure per role.
  const edu = input.cv.education.length > 0 ? 0.5 : 0;
  const avgMonths =
    input.cv.roles.reduce((acc, r) => acc + (r.durationMonths ?? 0), 0) /
    Math.max(1, input.cv.roles.length);
  const tenure = Math.min(1, avgMonths / 36); // 3 yrs avg → 1
  const pedigree = Math.min(1, edu + 0.5 * tenure);

  const overall = clamp01(
    w.semantic * semantic + w.graph * skillGraph - w.experience * experiencePenalty,
  );

  return {
    semantic,
    skillGraph,
    experiencePenalty,
    pedigree,
    overall,
    matchedSkills: matchedIds.map(labelOf),
    missingSkills: missingIds.map(labelOf),
    expandedSkills: expanded.map(labelOf),
  };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
