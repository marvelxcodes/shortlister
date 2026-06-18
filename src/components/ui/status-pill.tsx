import type { CandidateStatus } from "@/lib/types/schemas";
import { Badge } from "./badge";

const map: Record<CandidateStatus, { label: string; tone: Parameters<typeof Badge>[0]["tone"] }> = {
  queued: { label: "Queued", tone: "neutral" },
  extracting: { label: "Extracting", tone: "info" },
  parsing: { label: "Parsing", tone: "info" },
  embedding: { label: "Embedding", tone: "info" },
  scoring: { label: "Scoring", tone: "info" },
  insights: { label: "Insights", tone: "amber" },
  done: { label: "Ready", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
};

export function StatusPill({
  status,
  dot = true,
}: {
  status: CandidateStatus;
  dot?: boolean;
}) {
  const cfg = map[status];
  return (
    <Badge tone={cfg.tone} dot={dot}>
      {cfg.label}
    </Badge>
  );
}
