import { promises as fs } from "node:fs";
import path from "node:path";
import type { Candidate, Job } from "@/lib/types/domain";

/**
 * File-backed in-memory store. Used when Supabase env vars are absent so
 * the app remains fully runnable for local demos & evals. Persisted to
 * .next/cache/store.json (gitignored) so dev refresh keeps state.
 */

interface StoreShape {
  jobs: Record<string, Job>;
  candidates: Record<string, Candidate>;
  queue: { candidateId: string; jobId: string }[];
  jdEmbeddings: Record<string, number[]>;
  cvEmbeddings: Record<string, number[]>;
}

const FILE = path.join(process.cwd(), ".next", "cache", "store.json");

let writeChain: Promise<void> = Promise.resolve();

// We always re-read from disk because Next.js dev spawns multiple worker
// processes (page render vs. API route may be in different workers). The
// file is small, and this is dev-mode only — production uses Supabase.
async function load(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as StoreShape;
  } catch {
    return {
      jobs: {},
      candidates: {},
      queue: [],
      jdEmbeddings: {},
      cvEmbeddings: {},
    };
  }
}

async function flush(s: StoreShape) {
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(s, null, 2), "utf8");
  } catch {
    /* best-effort */
  }
}

// Serialize writes so concurrent withStore() calls don't lose updates
// when two workers fight for the same row.
export async function withStore<T>(fn: (s: StoreShape) => T | Promise<T>) {
  let result: T;
  const next = writeChain.then(async () => {
    const s = await load();
    result = await fn(s);
    await flush(s);
  });
  writeChain = next.catch(() => undefined);
  await next;
  // biome-ignore lint/style/noNonNullAssertion: assigned above
  return result!;
}

export async function readStore<T>(fn: (s: StoreShape) => T | Promise<T>) {
  const s = await load();
  return fn(s);
}

export async function resetStore() {
  await flush({
    jobs: {},
    candidates: {},
    queue: [],
    jdEmbeddings: {},
    cvEmbeddings: {},
  });
}
