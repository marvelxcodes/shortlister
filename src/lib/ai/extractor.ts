import mammoth from "mammoth";

/** Extract plaintext from a CV file (PDF or DOCX). */
export async function extractText(
  buffer: ArrayBuffer | Uint8Array,
  filename: string,
): Promise<string> {
  const buf = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const lower = filename.toLowerCase();

  if (lower.endsWith(".pdf")) {
    const { extractText: extractPdf } = await import("unpdf");
    const out = await extractPdf(buf);
    const text = Array.isArray(out.text) ? out.text.join("\n") : out.text;
    return cleanup(text);
  }
  if (lower.endsWith(".docx")) {
    // mammoth wants a Buffer-like; pass the Uint8Array via `buffer` field
    const { value } = await mammoth.extractRawText({
      buffer: Buffer.from(buf),
    });
    return cleanup(value);
  }
  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return cleanup(new TextDecoder().decode(buf));
  }
  throw new Error(`Unsupported file type: ${filename}`);
}

function cleanup(s: string) {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/­/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
