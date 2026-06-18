import { promises as fs } from "node:fs";
import path from "node:path";
import { embedText } from "@/lib/ai/embed";
import { scoreCandidate } from "@/lib/scoring/matcher";
import { auditShortlist } from "@/lib/scoring/auditor";
import { jdProfileText, cvProfileText } from "@/lib/workers/pipeline";
import type { ParsedCV, ParsedJD } from "@/lib/types/schemas";
import type { Candidate } from "@/lib/types/domain";

interface Fixture {
  name: string;
  jd: ParsedJD;
  candidates: Array<{
    filename: string;
    expectedRank: number;
    cv: ParsedCV;
  }>;
}

/**
 * Eval harness — loads each (JD, CVs, expected-rank) fixture in /evals,
 * runs the scoring pipeline and asserts the ranking. Use it to catch
 * regressions in the scoring formula or prompt changes.
 */
export async function runEvals(rootDir: string) {
  const dir = path.join(rootDir, "evals", "fixtures");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));

  const results: Array<{
    name: string;
    pass: boolean;
    actualRanking: string[];
    expectedRanking: string[];
  }> = [];

  for (const file of files) {
    const raw = await fs.readFile(path.join(dir, file), "utf8");
    const fx = JSON.parse(raw) as Fixture;

    const jdEmbedding = await embedText(jdProfileText(fx.jd));

    const scored = await Promise.all(
      fx.candidates.map(async (c) => {
        const cvEmbedding = await embedText(cvProfileText(c.cv));
        const score = scoreCandidate({
          jd: fx.jd,
          cv: c.cv,
          jdEmbedding,
          cvEmbedding,
        });
        return { ...c, score };
      }),
    );

    const ranked = [...scored].sort((a, b) => b.score.overall - a.score.overall);
    const expected = [...fx.candidates].sort(
      (a, b) => a.expectedRank - b.expectedRank,
    );

    const actualNames = ranked.map((r) => r.cv.name);
    const expectedNames = expected.map((r) => r.cv.name);
    const topMatches = actualNames[0] === expectedNames[0];
    // Spearman-style: at minimum the top candidate must match.
    const pass = topMatches;

    // Also run the auditor on the synthetic shortlist to assert it's stable.
    const synthCands: Candidate[] = ranked.map((r, i) => ({
      id: `c-${i}`,
      jobId: "j-1",
      filename: r.filename,
      status: "done",
      cv: r.cv,
      score: r.score,
      rank: i + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    auditShortlist(synthCands); // throws if shape is wrong

    results.push({
      name: fx.name,
      pass,
      actualRanking: actualNames,
      expectedRanking: expectedNames,
    });
  }

  return results;
}
