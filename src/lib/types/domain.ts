import type {
  AuditResult,
  CandidateInsights,
  CandidateStatus,
  JobStatus,
  ParsedCV,
  ParsedJD,
  ScoreBreakdown,
} from "./schemas";

export type WorkMode = "remote" | "hybrid" | "onsite";
export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship";

export interface JobMetadata {
  department?: string;
  seniority?: string;
  employmentType?: EmploymentType;
  workMode?: WorkMode;
  location?: string;
  headcount?: number;
  hiringManager?: string;
  jdSource?: { kind: "paste" } | { kind: "upload"; filename: string };
}

export interface Job {
  id: string;
  title: string;
  createdAt: string;
  status: JobStatus;
  jd: ParsedJD;
  jdRaw: string;
  weights: { semantic: number; graph: number; experience: number };
  audit?: AuditResult;
  blindMode: boolean;
  metadata?: JobMetadata;
}

export interface Candidate {
  id: string;
  jobId: string;
  filename: string;
  status: CandidateStatus;
  error?: string;
  rawText?: string;
  cv?: ParsedCV;
  score?: ScoreBreakdown;
  insights?: CandidateInsights;
  rank?: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobSummary extends Job {
  candidateCount: number;
  doneCount: number;
  failedCount: number;
  topScore?: number;
  flagged?: number;
}
