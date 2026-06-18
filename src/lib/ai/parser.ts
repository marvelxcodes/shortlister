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

const JD_SYSTEM = `You are a senior recruiter. Given a job description, extract a strict structured object that captures the required role and skills.
Rules:
- mustHaveSkills: the explicit requirements. Use canonical names (e.g. "React" not "React.js development experience").
- niceToHaveSkills: things called "preferred", "bonus", "nice to have".
- minYears / maxYears: extract from text. Reasonable inference is allowed.
- requirements: pairs of (skill, weight 0..1, required) using your judgement.
- No commentary, only JSON for the schema.`;

const CV_SYSTEM = `You are a careful parser of resumes. Convert the raw text into a structured candidate object.
Rules:
- name: full name as written. If missing, use "Unknown Candidate".
- totalYears: sum of meaningful professional tenure. Use your best estimate.
- skills: dedupe to canonical names (e.g. "React" not "React.js").
- roles: each in reverse-chronological order. Compute durationMonths when possible.
- highlights: short bullet summaries of impact (verbs first).
- Output JSON only for the schema. Do not invent skills that aren't supported by the text.`;

export async function parseJd(rawText: string): Promise<ParsedJD> {
  if (!isNimEnabled()) return heuristicJd(rawText);
  return runWithRetry(async (errorHint) => {
    const { object } = await generateObject({
      model: nim(REASONING_MODEL),
      schema: ParsedJD,
      system: JD_SYSTEM,
      prompt: errorHint
        ? `Previous attempt failed validation: ${errorHint}\n\nJD:\n${rawText}`
        : `JD:\n${rawText}`,
    });
    return object;
  });
}

export async function parseCv(rawText: string): Promise<ParsedCV> {
  if (!isNimEnabled()) return heuristicCv(rawText);
  return runWithRetry(async (errorHint) => {
    const { object } = await generateObject({
      model: nim(REASONING_MODEL),
      schema: ParsedCV,
      system: CV_SYSTEM,
      prompt: errorHint
        ? `Previous attempt failed validation: ${errorHint}\n\nCV:\n${rawText}`
        : `CV:\n${rawText}`,
    });
    return object;
  });
}

async function runWithRetry<T>(fn: (hint?: string) => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof z.ZodError) {
      return await fn(JSON.stringify(e.issues));
    }
    return await fn(msg);
  }
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
