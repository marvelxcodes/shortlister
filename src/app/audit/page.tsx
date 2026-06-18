import Link from "next/link";
import { ShieldTick as ShieldCheck, AlertTriangle } from "@untitledui/icons";
import { listJobs } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const jobs = await listJobs();
  const audited = jobs.filter((j) => j.audit);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Bias & diversity audit"
        description="The platform reasons over measurable proxies only — no protected attributes are inferred from CVs."
      />
      {audited.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Audit reports will appear here"
              description="Finish a shortlister run to generate a pedigree-vs-skill analysis."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {audited.map((j) => (
            <Card key={j.id}>
              <CardHeader>
                <CardTitle icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                  {j.title || j.jd.title}
                </CardTitle>
                {j.audit?.pedigreeSkewWarning ? (
                  <Badge tone="warning" dot>
                    Skew
                  </Badge>
                ) : (
                  <Badge tone="success" dot>
                    Balanced
                  </Badge>
                )}
              </CardHeader>
              <CardBody className="space-y-3">
                <div>
                  <div className="flex justify-between text-[11.5px]">
                    <span className="text-muted">Skill median</span>
                    <span className="font-semibold tnum">
                      {((j.audit?.skillMedian ?? 0) * 100).toFixed(0)}
                    </span>
                  </div>
                  <Progress
                    value={(j.audit?.skillMedian ?? 0) * 100}
                    tone="brand"
                    className="mt-1"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11.5px]">
                    <span className="text-muted">Pedigree median</span>
                    <span className="font-semibold tnum">
                      {((j.audit?.pedigreeMedian ?? 0) * 100).toFixed(0)}
                    </span>
                  </div>
                  <Progress
                    value={(j.audit?.pedigreeMedian ?? 0) * 100}
                    tone="amber"
                    className="mt-1"
                  />
                </div>
                {j.audit?.pedigreeSkewDescription ? (
                  <div className="flex gap-2 rounded-[10px] border border-amber-100 bg-amber-50/60 p-2 text-[12px]">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                    <span>{j.audit.pedigreeSkewDescription}</span>
                  </div>
                ) : null}
                <Link
                  href={`/jobs/${j.id}`}
                  className="block text-center text-[12px] font-medium text-brand-700 hover:underline"
                >
                  Open job →
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
