import { extractText } from "@/lib/ai/extractor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { ok: false, error: "Attach a JD file under the 'file' field" },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return Response.json(
      { ok: false, error: "Empty file" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { ok: false, error: `File too large (${file.size} > ${MAX_BYTES})` },
      { status: 413 },
    );
  }

  const lower = file.name.toLowerCase();
  if (
    !lower.endsWith(".pdf") &&
    !lower.endsWith(".docx") &&
    !lower.endsWith(".txt") &&
    !lower.endsWith(".md")
  ) {
    return Response.json(
      { ok: false, error: "Only PDF, DOCX, TXT or MD are supported" },
      { status: 415 },
    );
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = await extractText(bytes, file.name);
    return Response.json({
      ok: true,
      filename: file.name,
      bytes: file.size,
      text,
    });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Failed to extract text",
      },
      { status: 500 },
    );
  }
}
