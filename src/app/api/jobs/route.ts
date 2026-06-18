import {
  createJobAndEnqueue,
  kickWorker,
} from "@/lib/workers/server-actions";
import type { JobMetadata } from "@/lib/types/domain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const form = await req.formData();
  const title = String(form.get("title") ?? "Untitled role");
  const jdRaw = String(form.get("jd") ?? "");
  const blindMode = form.get("blindMode") === "on";

  let metadata: JobMetadata | undefined;
  const metadataRaw = form.get("metadata");
  if (typeof metadataRaw === "string" && metadataRaw.trim()) {
    try {
      metadata = JSON.parse(metadataRaw) as JobMetadata;
    } catch {
      return Response.json(
        { ok: false, error: "metadata is not valid JSON" },
        { status: 400 },
      );
    }
  }

  const files: Array<{ filename: string; data: Uint8Array }> = [];
  for (const entry of form.getAll("cvs")) {
    if (entry instanceof File) {
      const buf = new Uint8Array(await entry.arrayBuffer());
      files.push({ filename: entry.name, data: buf });
    }
  }

  if (!jdRaw.trim()) {
    return Response.json({ ok: false, error: "JD is required" }, { status: 400 });
  }
  if (files.length === 0) {
    return Response.json({ ok: false, error: "At least one CV is required" }, { status: 400 });
  }

  const { jobId } = await createJobAndEnqueue({
    title,
    jdRaw,
    blindMode,
    metadata,
    files,
  });

  // Fire the worker so dev (in-mem queue) starts immediately. Prod relies on pg_cron.
  void kickWorker();

  return Response.json({ ok: true, jobId });
}
