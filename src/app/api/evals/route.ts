import { runEvals } from "@/lib/evals/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const results = await runEvals(process.cwd());
  const passed = results.filter((r) => r.pass).length;
  return Response.json({
    ok: results.every((r) => r.pass),
    passed,
    total: results.length,
    results,
  });
}
