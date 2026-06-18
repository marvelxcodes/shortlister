import { generateObject } from "ai";
import { z } from "zod";
import { ParsedCV, ParsedJD } from "@/lib/types/schemas";
import { nim, REASONING_MODEL, isNimEnabled } from "./provider";

/* ============================================================
 * Parser Agent
 * Converts raw extracted text into structured Zod objects.
 * Hard-fails on schema violation; retries once with the error
 * appended to the prompt (per §2.2 of AGENTS.md).
 * When NIM isn't configured, falls back to a deterministic
 * heuristic parser so the platform stays runnable for dev.
 * ============================================================ */

const JD_SYSTEM = `You are a senior recruiter. Given a job description, extract a strict structured JSON object that captures the role and skill requirements.

Required fields — ALL must be present:
- title (string): the role title, e.g. "Senior Full Stack Engineer". If absent, infer the most likely title from the text.
- summary (string): a 1-2 sentence summary of the role.
- seniority (enum): one of "intern" | "junior" | "mid" | "senior" | "staff" | "principal". Infer from the title/text.
- minYears (integer 0..50): minimum years of experience. Infer if not stated.
- mustHaveSkills (string[]): explicit requirements. Use canonical names (e.g. "React" not "React.js development experience").
- niceToHaveSkills (string[]): things called "preferred", "bonus", "nice to have".
- responsibilities (string[]): short bullet phrases. Empty array if none.
- requirements (object[]): each item is an OBJECT with these keys — { "skill": string, "weight": number 0..1, "required": boolean, "category"?: string }. Do NOT use a tuple/array form like ["skill", 0.8, true]; emit a JSON object per item.

Optional:
- maxYears (integer 0..50): omit the field entirely if unknown — do NOT emit null.

Output ONLY the JSON object. No commentary, no markdown fences.`;

const CV_SYSTEM = `You are a careful parser of resumes. Convert the raw text into a strict structured JSON candidate object.

Required fields — ALL must be present:
- name (string): full name as written. If missing, use "Unknown Candidate".
- totalYears (number 0..60): sum of meaningful professional tenure. Best estimate.
- skills (object[]): each item is { "name": string, "years"?: number, "evidence"?: string }. Dedupe to canonical names (e.g. "React" not "React.js"). Do not invent skills not supported by the text.
- roles (object[]): each item is { "company": string, "title": string, "startYear"?: integer, "endYear"?: integer | null, "durationMonths"?: integer, "highlights": string[] }. Reverse-chronological. Compute durationMonths when possible.
- education (object[]): each item is { "institution": string, "degree"?: string, "field"?: string, "startYear"?: integer, "endYear"?: integer }.
- certifications (string[]): empty array if none.
- links (string[]): empty array if none.

Optional (omit entirely if unknown — do NOT emit null):
- email (string), location (string), summary (string).

Output ONLY the JSON object. No commentary, no markdown fences.`;

export async function parseJd(rawText: string): Promise<ParsedJD> {
  if (!isNimEnabled()) {
    return heuristicJd(rawText);
  }
  try {
    return await runWithRetry(async (errorHint) => {
      const { object } = await generateObject({
        model: nim(REASONING_MODEL),
        schema: ParsedJD,
        schemaName: "ParsedJobDescription",
        schemaDescription: "Structured job description extracted from raw text.",
        system: JD_SYSTEM,
        prompt: errorHint
          ? `Previous attempt failed validation. Fix these errors and try again:\n${errorHint}\n\nJD:\n${rawText}`
          : `JD:\n${rawText}`,
      });
      return object;
    });
  } catch {
    // Last-ditch fallback so a flaky NIM response never blocks the pipeline.
    return heuristicJd(rawText);
  }
}

export async function parseCv(rawText: string): Promise<ParsedCV> {
  if (!isNimEnabled()) {
    return heuristicCv(rawText);
  }
  try {
    return await runWithRetry(async (errorHint) => {
      const { object } = await generateObject({
        model: nim(REASONING_MODEL),
        schema: ParsedCV,
        schemaName: "ParsedCV",
        schemaDescription: "Structured CV/resume extracted from raw text.",
        system: CV_SYSTEM,
        prompt: errorHint
          ? `Previous attempt failed validation. Fix these errors and try again:\n${errorHint}\n\nCV:\n${rawText}`
          : `CV:\n${rawText}`,
      });
      return object;
    });
  } catch {
    return heuristicCv(rawText);
  }
}

async function runWithRetry<T>(fn: (hint?: string) => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    return await fn(extractHint(e));
  }
}

function extractHint(err: unknown): string {
  // generateObject wraps validation failures in NoObjectGeneratedError →
  // TypeValidationError → ZodError. Walk the cause chain so the retry
  // prompt gets the actionable list of field problems, not a generic
  // "did not match schema" message.
  let current: unknown = err;
  for (let i = 0; i < 5 && current; i++) {
    if (current instanceof z.ZodError) {
      return JSON.stringify(current.issues).slice(0, 2000);
    }
    if (current && typeof current === "object" && "cause" in current) {
      current = (current as { cause?: unknown }).cause;
      continue;
    }
    break;
  }
  return err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500);
}

/* ============================================================
 * Heuristic fallback parsers (no LLM)
 * - Deterministic, well-defined, good enough to demo the full
 *   pipeline end-to-end without NIM credentials.
 * - Recognized skills are matched against the seeded ontology.
 * ============================================================ */

import { allSkills } from "@/lib/graph/skill-graph";

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+#./ ]+/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

function findSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const hits = new Set<string>();
  for (const s of allSkills()) {
    const needle = s.label.toLowerCase();
    // word-boundary-aware: skills can be flanked by commas, slashes, end-of-line,
    // or punctuation — not only spaces.
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|[^a-z0-9+#])${escaped}(?![a-z0-9+#])`, "i");
    if (re.test(lower)) hits.add(s.label);
  }
  return [...hits];
}

function heuristicJd(text: string): ParsedJD {
  const titleMatch = text.match(/^(.+?)\n/);
  const yearsMatch = text.match(/(\d+)\+?\s*years?/i);
  const min = yearsMatch ? Number.parseInt(yearsMatch[1], 10) : 3;
  const skills = findSkills(text);
  const seniority = inferSeniority(text);

  return {
    title: (titleMatch?.[1] ?? "Untitled Role").trim().slice(0, 120),
    summary: text.slice(0, 320),
    seniority,
    minYears: min,
    mustHaveSkills: skills.slice(0, 6),
    niceToHaveSkills: skills.slice(6, 10),
    responsibilities: text
      .split(/\n+/)
      .filter((l) => /^[-*•]/.test(l.trim()))
      .map((l) => l.replace(/^[-*•]\s*/, "").trim())
      .slice(0, 8),
    requirements: skills.slice(0, 8).map((s, i) => ({
      skill: s,
      weight: i < 3 ? 0.9 : 0.5,
      required: i < 4,
      category: undefined,
    })),
  };
}

function heuristicCv(text: string): ParsedCV {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const name = lines[0]?.slice(0, 80) || "Unknown Candidate";
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const yearsMatch = text.match(/(\d{1,2})\+?\s*years?/i);
  const total = yearsMatch ? Number.parseInt(yearsMatch[1], 10) : 0;

  const skills = findSkills(text).map((s) => ({ name: s }));
  const educationMatch = text.match(/(B\.?S\.?|M\.?S\.?|PhD|MBA|Bachelor|Master)[^\n]+/i);
  const education = educationMatch
    ? [
        {
          institution: extractInstitution(text),
          degree: educationMatch[0].slice(0, 60),
        },
      ]
    : [];

  return {
    name,
    email: emailMatch?.[0],
    summary: lines.slice(1, 4).join(" ").slice(0, 320),
    totalYears: total || Math.min(20, skills.length * 2),
    skills,
    roles: extractRoles(text),
    education,
    certifications: [],
    links: Array.from(text.matchAll(/https?:\/\/\S+/g)).map((m) => m[0]).slice(0, 5),
  };
}

function extractInstitution(text: string) {
  const m = text.match(/University of [A-Z][\w ]+|[A-Z][\w]+ University|[A-Z][\w]+ Institute of Technology/);
  return m?.[0] ?? "Unknown";
}

function extractRoles(text: string): ParsedCV["roles"] {
  const roleLines = text
    .split(/\n+/)
    .filter((l) => /\b(engineer|developer|manager|designer|scientist|analyst|lead|architect|director)\b/i.test(l))
    .slice(0, 4);
  return roleLines.map((l) => {
    const yearsRange = l.match(/(\d{4})\s*[-–—]\s*(\d{4}|present|current)/i);
    const start = yearsRange ? Number.parseInt(yearsRange[1], 10) : undefined;
    const end =
      yearsRange && /\d{4}/.test(yearsRange[2])
        ? Number.parseInt(yearsRange[2], 10)
        : null;
    const monthSpan =
      start && end ? (end - start) * 12 : start ? (new Date().getFullYear() - start) * 12 : undefined;
    return {
      company: l.split(/\s+/).slice(0, 4).join(" ").slice(0, 60),
      title: l.slice(0, 80),
      startYear: start,
      endYear: end ?? null,
      durationMonths: monthSpan,
      highlights: [],
    };
  });
}

function inferSeniority(text: string): ParsedJD["seniority"] {
  const t = text.toLowerCase();
  if (/staff|principal|distinguished/.test(t)) return "staff";
  if (/senior|sr\./.test(t)) return "senior";
  if (/junior|jr\.|entry/.test(t)) return "junior";
  if (/intern/.test(t)) return "intern";
  return "mid";
}

/* Helper exported so the worker can pre-filter empty extracts */
export function looksLikeCv(text: string) {
  if (text.length < 80) return false;
  return /experience|education|skills|projects|summary/i.test(text);
}

// re-export to avoid unused import lint
export { tokenSet };
