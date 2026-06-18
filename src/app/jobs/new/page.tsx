import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { UploadWizard } from "@/components/jobs/upload-wizard";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "New job · Shortlister",
};

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="New shortlister run"
        description="Paste a JD and drop a batch of CVs. The platform parses, embeds, scores and audits the lot — typically under 60 s for 20 CVs."
        meta={
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand" dot>
              Multi-agent
            </Badge>
            <Badge tone="info" dot>
              NVIDIA NIM
            </Badge>
            <Badge tone="amber" dot>
              Bias-audited
            </Badge>
          </div>
        }
      />
      <UploadWizard />
    </div>
  );
}
