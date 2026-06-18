import Link from "next/link";
import { Briefcase01 as Briefcase, Plus } from "@untitledui/icons";
import { listJobs } from "@/lib/db/store";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty";
import { JobsTable } from "@/components/jobs/jobs-table";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await listJobs();
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Jobs"
        description="All shortlister runs across the workspace."
        actions={
          <Link
            href="/jobs/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-gradient-to-b from-brand-300 via-brand-400 to-brand-500 px-5 text-[13.5px] font-semibold text-ink shadow-[var(--shadow-brand)]"
          >
            <Plus className="h-[15px] w-[15px]" /> New job
          </Link>
        }
      />
      {jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-5 w-5" />}
          title="Nothing here yet"
          description="Spin up the first run to see scored candidates and an automatic audit."
          action={
            <Link
              href="/jobs/new"
              className="inline-flex h-11 items-center gap-1.5 rounded-full bg-gradient-to-b from-brand-300 via-brand-400 to-brand-500 px-6 text-[13.5px] font-semibold text-ink shadow-[var(--shadow-brand)]"
            >
              <Plus className="h-[15px] w-[15px]" /> Start a job
            </Link>
          }
        />
      ) : (
        <JobsTable jobs={jobs} />
      )}
    </div>
  );
}
