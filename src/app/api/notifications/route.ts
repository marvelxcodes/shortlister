import { listJobs } from "@/lib/db/store";
import { formatScore } from "@/lib/utils/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type NotificationKind = "success" | "info" | "warn" | "error";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  at: string;
}

/**
 * Notifications are derived from job state. Each item gets a stable id
 * (so the client can persist "read" state in localStorage without the
 * list shifting between visits), a kind for the icon/colour, and a
 * deep-link to the relevant job.
 */
export async function GET() {
  const jobs = await listJobs();
  const items: NotificationItem[] = [];

  for (const j of jobs) {
    const label = j.title || j.jd.title || "Untitled job";
    const href = `/jobs/${j.id}`;
    const at = j.createdAt;

    if (j.status === "ready") {
      items.push({
        id: `job-ready-${j.id}`,
        kind: "success",
        title: "Shortlist ready",
        body: `${label} · top score ${formatScore(j.topScore ?? 0)}`,
        href,
        at,
      });
    } else if (j.status === "processing" || j.status === "auditing") {
      items.push({
        id: `job-progress-${j.id}-${j.doneCount}`,
        kind: "info",
        title: j.status === "auditing" ? "Auditing shortlist" : "Processing CVs",
        body: `${label} · ${j.doneCount}/${j.candidateCount} candidates scored`,
        href,
        at,
      });
    } else if (j.status === "failed") {
      items.push({
        id: `job-failed-${j.id}`,
        kind: "error",
        title: "Job failed",
        body: label,
        href,
        at,
      });
    }

    if ((j.flagged ?? 0) > 0) {
      items.push({
        id: `job-flags-${j.id}-${j.flagged}`,
        kind: "warn",
        title: `${j.flagged} audit flag${j.flagged === 1 ? "" : "s"}`,
        body: label,
        href,
        at,
      });
    }

    if (j.failedCount > 0) {
      items.push({
        id: `job-cv-failed-${j.id}-${j.failedCount}`,
        kind: "warn",
        title: `${j.failedCount} CV${j.failedCount === 1 ? "" : "s"} failed to parse`,
        body: label,
        href,
        at,
      });
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return Response.json({ notifications: items.slice(0, 30) });
}
