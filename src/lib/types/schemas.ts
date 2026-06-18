import { z } from "zod";

/* ----- Job description ----- */
export const JobSeniority = z.enum([
  "intern",
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
]);

export const JdRequirement = z.object({
  skill: z.string().min(1),
  category: z.string().optional(),
  weight: z.number().min(0).max(1).default(0.5),
  required: z.boolean().default(true),
});

export const ParsedJD = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  seniority: JobSeniority,
  minYears: z.number().int().min(0).max(50),
  maxYears: z.number().int().min(0).max(50).optional(),
  mustHaveSkills: z.array(z.string()).default([]),
  niceToHaveSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  requirements: z.array(JdRequirement).default([]),
});
export type ParsedJD = z.infer<typeof ParsedJD>;

/* ----- CV ----- */
export const CvSkill = z.object({
  name: z.string().min(1),
  years: z.number().min(0).max(60).optional(),
  evidence: z.string().optional(),
});

export const CvRole = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  startYear: z.number().int().min(1950).max(2100).optional(),
  endYear: z.number().int().min(1950).max(2100).nullable().optional(),
  durationMonths: z.number().int().min(0).max(720).optional(),
  highlights: z.array(z.string()).default([]),
});

export const CvEducation = z.object({
  institution: z.string().min(1),
  degree: z.string().optional(),
  field: z.string().optional(),
  startYear: z.number().int().min(1900).max(2100).optional(),
  endYear: z.number().int().min(1900).max(2100).optional(),
});

export const ParsedCV = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  totalYears: z.number().min(0).max(60),
  skills: z.array(CvSkill).default([]),
  roles: z.array(CvRole).default([]),
  education: z.array(CvEducation).default([]),
  certifications: z.array(z.string()).default([]),
  links: z.array(z.string()).default([]),
});
export type ParsedCV = z.infer<typeof ParsedCV>;

/* ----- Scoring ----- */
export const ScoreBreakdown = z.object({
  semantic: z.number(), // cosine [0..1]
  skillGraph: z.number(), // jaccard expansion [0..1]
  experiencePenalty: z.number(), // [0..1]
  pedigree: z.number(), // [0..1]
  overall: z.number(), // weighted final [0..1]
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  expandedSkills: z.array(z.string()).default([]),
});
export type ScoreBreakdown = z.infer<typeof ScoreBreakdown>;

/* ----- Insights ----- */
export const InterviewQuestion = z.object({
  question: z.string().min(1),
  probes: z.array(z.string()).default([]),
  targetGap: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
});

export const CandidateInsights = z.object({
  justification: z.string().min(1),
  strengths: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  interviewQuestions: z.array(InterviewQuestion).default([]),
});
export type CandidateInsights = z.infer<typeof CandidateInsights>;

/* ----- Audit ----- */
export const AuditFlag = z.object({
  candidateId: z.string(),
  kind: z.enum([
    "high_skill_no_degree",
    "high_skill_non_faang",
    "pedigree_skew",
  ]),
  rationale: z.string(),
});

export const AuditResult = z.object({
  pedigreeSkewWarning: z.boolean(),
  pedigreeSkewDescription: z.string().optional(),
  pedigreeMedian: z.number(),
  skillMedian: z.number(),
  flags: z.array(AuditFlag).default([]),
  shortlistCount: z.number().int(),
});
export type AuditResult = z.infer<typeof AuditResult>;

/* ----- Domain ----- */
export const CandidateStatus = z.enum([
  "queued",
  "extracting",
  "parsing",
  "embedding",
  "scoring",
  "insights",
  "done",
  "failed",
]);
export type CandidateStatus = z.infer<typeof CandidateStatus>;

export const JobStatus = z.enum([
  "draft",
  "processing",
  "auditing",
  "ready",
  "failed",
]);
export type JobStatus = z.infer<typeof JobStatus>;
