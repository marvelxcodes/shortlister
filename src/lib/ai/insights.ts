import { generateObject } from "ai";
import type { ParsedCV, ParsedJD, ScoreBreakdown } from "@/lib/types/schemas";
import { CandidateInsights } from "@/lib/types/schemas";
import { nim, REASONING_MODEL, isNimEnabled } from "./provider";

/* ============================================================
 * Insights Agent (Delta-Based RAG)
 *
 * The LLM never sees the raw CV. It is fed only:
 *   - the JD requirements list,
 *   - the candidate's matched skill nodes,
 *   - the candidate's missing skill nodes.
 *
 * This keeps prompts small + grounded in the deterministic match.
 * ============================================================ */

const SYS = `You are a senior hiring manager assistant. Given (a) the role requirements, (b) the candidate's matched skills, and (c) the gaps, produce a strict JSON object.

Required fields — ALL must be present:
- justification (string): 3-5 sentence ranking justification grounded only in the inputs.
- strengths (string[]): a few crisp bullet phrases.
- risks (string[]): a few crisp bullet phrases referencing the gaps.
- interviewQuestions (object[]): exactly 4 items, each an OBJECT with keys { "question": string, "probes": string[] (1-3 items), "targetGap"?: string, "difficulty": "easy" | "medium" | "hard" }.

You must not invent facts about the candidate not present in the inputs. Output ONLY the JSON object — no commentary, no markdown fences.`;

export async function generateInsights(input: {
  jd: ParsedJD;
  cv: ParsedCV;
  score: ScoreBreakdown;
}): Promise<CandidateInsights> {
  if (!isNimEnabled()) return heuristicInsights(input);

  const prompt = buildPrompt(input);
  try {
    const { object } = await generateObject({
      model: nim(REASONING_MODEL),
      schema: CandidateInsights,
      schemaName: "CandidateInsights",
      schemaDescription:
        "Hiring justification, strengths, risks, and 4 tailored interview questions.",
      system: SYS,
      prompt,
    });
    return object;
  } catch {
    return heuristicInsights(input);
  }
}

function buildPrompt(input: {
  jd: ParsedJD;
  cv: ParsedCV;
  score: ScoreBreakdown;
}) {
  return [
    `Role: ${input.jd.title} (${input.jd.seniority}, ${input.jd.minYears}+ yrs)`,
    `Must-have: ${input.jd.mustHaveSkills.join(", ") || "—"}`,
    `Nice-to-have: ${input.jd.niceToHaveSkills.join(", ") || "—"}`,
    `Candidate: ${input.cv.name} · ${input.cv.totalYears} yrs experience`,
    `Matched skills: ${input.score.matchedSkills.join(", ") || "—"}`,
    `Missing skills (gaps): ${input.score.missingSkills.join(", ") || "—"}`,
    `Subscores → semantic ${pct(input.score.semantic)}, skill-graph ${pct(input.score.skillGraph)}, pedigree ${pct(input.score.pedigree)}.`,
  ].join("\n");
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

/* -------- Heuristic fallback (no LLM) -------- */
function heuristicInsights(input: {
  jd: ParsedJD;
  cv: ParsedCV;
  score: ScoreBreakdown;
}): CandidateInsights {
  const matched = input.score.matchedSkills;
  const missing = input.score.missingSkills;
  const sem = Math.round(input.score.semantic * 100);
  const graph = Math.round(input.score.skillGraph * 100);

  const justification =
    matched.length === 0
      ? `${input.cv.name} shows limited overlap with the ${input.jd.title} requirements. Semantic match sits at ${sem}% with a skill-graph score of ${graph}%, driven by gaps in ${missing.slice(0, 3).join(", ") || "the core requirements"}.`
      : `${input.cv.name} aligns with the ${input.jd.title} role primarily through ${matched.slice(0, 3).join(", ")}. Semantic match ${sem}%, skill-graph ${graph}%${
          missing.length > 0
            ? `; gaps remain in ${missing.slice(0, 2).join(", ")}.`
            : "."
        }`;

  return {
    justification,
    strengths: matched.slice(0, 4).map((s) => `Demonstrated ${s} experience`),
    risks: missing.slice(0, 3).map((s) => `No evidence of ${s}`),
    interviewQuestions: missing.slice(0, 4).map((gap, i) => ({
      question: `Walk us through a project where you applied ${gap} in production.`,
      probes: [
        `What scale did you operate at?`,
        `What trade-offs did you weigh?`,
      ],
      targetGap: gap,
      difficulty: (["easy", "medium", "hard"] as const)[Math.min(2, i)],
    })),
  };
}
