import { EMBEDDING_MODEL, isNimEnabled } from "./provider";

const EMBED_DIM = 1024;

/**
 * Embedding service.
 * - Uses NIM (nv-embedqa-e5-v5 by default) when an API key is present.
 * - Falls back to a deterministic hashed-bag-of-words embedding so the
 *   matcher remains useful for local dev / evals without credentials.
 *
 * `nv-embedqa-e5-v5` is an asymmetric retrieval model: the JD is the
 * `query` side and CVs are the `passage` side. Callers must pass the
 * correct kind or NIM rejects the request with HTTP 400.
 */
export type EmbedKind = "query" | "passage";

const NIM_BASE_URL =
  process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1";

export async function embedText(
  text: string,
  kind: EmbedKind = "passage",
): Promise<number[]> {
  if (!isNimEnabled()) return hashEmbed(text);
  const [v] = await nimEmbed([text], kind);
  return v;
}

export async function embedTexts(
  texts: string[],
  kind: EmbedKind = "passage",
): Promise<number[][]> {
  if (!isNimEnabled()) return texts.map(hashEmbed);
  return nimEmbed(texts, kind);
}

async function nimEmbed(texts: string[], kind: EmbedKind): Promise<number[][]> {
  const res = await fetch(`${NIM_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.NVIDIA_NIM_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      input_type: kind,
      encoding_format: "float",
      truncate: "END",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`NIM embeddings failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return json.data.map((d) => d.embedding);
}

/** Cosine similarity in [-1, 1]; clamps to [0, 1] for our scoring. */
export function cosine(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    aMag += a[i] * a[i];
    bMag += b[i] * b[i];
  }
  if (aMag === 0 || bMag === 0) return 0;
  const raw = dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
  return Math.max(0, raw);
}

/**
 * Deterministic, hash-bucket embedding. Each token is hashed into K
 * buckets, contributing its TF weight. The result is L2-normalized so
 * cosine similarity behaves sensibly. Not as good as a real model, but
 * good enough to demonstrate semantic-style ranking on synthetic CVs.
 */
function hashEmbed(text: string): number[] {
  const vec = new Float32Array(EMBED_DIM);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9+#./ ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
  for (const t of tokens) {
    const h = fnv1a(t);
    vec[h % EMBED_DIM] += 1;
    // bigram-ish via second hash for a touch more discrimination
    vec[(h * 2654435761) >>> 0 ? (h * 2654435761) >>> 0 : 1 % EMBED_DIM] += 0.5;
  }
  // L2 normalize
  let mag = 0;
  for (let i = 0; i < EMBED_DIM; i++) mag += vec[i] * vec[i];
  mag = Math.sqrt(mag) || 1;
  const out: number[] = new Array(EMBED_DIM);
  for (let i = 0; i < EMBED_DIM; i++) out[i] = vec[i] / mag;
  return out;
}

function fnv1a(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
