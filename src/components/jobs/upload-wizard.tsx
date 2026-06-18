"use client";

import * as React from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import {
  File02 as FileText,
  Briefcase01 as Briefcase,
  UploadCloud01 as UploadCloud,
  Stars02 as Sparkles,
  X,
  ShieldTick as ShieldCheck,
  MarkerPin01 as MapPin,
  Users01 as Users,
  User01 as User,
  BarChart04 as BarChart,
  Building07 as Building,
  MagicWand01 as Wand,
  CheckCircle,
} from "@untitledui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { formatBytes } from "@/lib/utils/format";
import type {
  EmploymentType,
  JobMetadata,
  WorkMode,
} from "@/lib/types/domain";

const EXAMPLE_JD = `Senior Full-Stack Engineer (Next.js + AI)

We're hiring a Senior Full-Stack Engineer to ship our AI-native recruitment platform.

Must-have:
- 5+ years building production web apps
- Deep TypeScript & React experience
- Comfort with Postgres, SQL and pgvector
- Experience integrating LLMs or vector search

Nice to have:
- Background in distributed systems
- Familiarity with Tailwind, Next.js App Router
- Experience with Vercel AI SDK or LangChain
`;

const SENIORITY_OPTIONS = [
  "Intern",
  "Junior",
  "Mid",
  "Senior",
  "Staff",
  "Principal",
  "Director",
] as const;

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
];

const WORK_MODES: { value: WorkMode; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
];

export function UploadWizard() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [jd, setJd] = React.useState(EXAMPLE_JD);
  const [blindMode, setBlindMode] = React.useState(true);
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);

  // Role metadata
  const [department, setDepartment] = React.useState("");
  const [seniority, setSeniority] = React.useState<string>("Senior");
  const [employmentType, setEmploymentType] =
    React.useState<EmploymentType>("full_time");
  const [workMode, setWorkMode] = React.useState<WorkMode>("hybrid");
  const [location, setLocation] = React.useState("");
  const [headcount, setHeadcount] = React.useState<number>(1);
  const [hiringManager, setHiringManager] = React.useState("");

  // JD upload state
  const [jdExtracting, setJdExtracting] = React.useState(false);
  const [jdSource, setJdSource] = React.useState<
    { kind: "paste" } | { kind: "upload"; filename: string; bytes: number }
  >({ kind: "paste" });

  const handleJdFile = React.useCallback(async (file: File) => {
    setJdExtracting(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/jobs/extract-jd", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        ok: boolean;
        text?: string;
        error?: string;
      };
      if (!data.ok || !data.text) {
        throw new Error(data.error ?? "Extraction failed");
      }
      setJd(data.text);
      setJdSource({
        kind: "upload",
        filename: file.name,
        bytes: file.size,
      });
      toast.success(`Extracted ${data.text.length.toLocaleString()} chars`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that file");
    } finally {
      setJdExtracting(false);
    }
  }, []);

  const jdDropzone = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    multiple: false,
    noClick: true,
    onDrop: (accepted) => {
      const f = accepted[0];
      if (f) void handleJdFile(f);
    },
  });

  const cvDropzone = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
      "text/markdown": [".md"],
    },
    multiple: true,
    onDrop: (accepted) => {
      setFiles((prev) => [...prev, ...accepted].slice(0, 50));
    },
  });

  async function submit() {
    if (!jd.trim()) return toast.error("Add a job description first.");
    if (files.length === 0) return toast.error("Upload at least one CV.");
    setBusy(true);
    try {
      const metadata: JobMetadata = {
        department: department.trim() || undefined,
        seniority: seniority || undefined,
        employmentType,
        workMode,
        location: location.trim() || undefined,
        headcount: Number.isFinite(headcount) && headcount > 0 ? headcount : undefined,
        hiringManager: hiringManager.trim() || undefined,
        jdSource:
          jdSource.kind === "upload"
            ? { kind: "upload", filename: jdSource.filename }
            : { kind: "paste" },
      };

      const fd = new FormData();
      fd.set("title", title);
      fd.set("jd", jd);
      if (blindMode) fd.set("blindMode", "on");
      fd.set("metadata", JSON.stringify(metadata));
      for (const f of files) fd.append("cvs", f);

      const res = await fetch("/api/jobs", { method: "POST", body: fd });
      const data = (await res.json()) as {
        ok: boolean;
        jobId?: string;
        error?: string;
      };
      if (!data.ok) throw new Error(data.error ?? "Upload failed");
      toast.success("Job created — running the pipeline");
      router.push(`/jobs/${data.jobId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle icon={<Briefcase className="h-3.5 w-3.5" />}>Role</CardTitle>
          <Badge tone="brand" dot>
            Step 1 of 2
          </Badge>
        </CardHeader>
        <CardBody className="space-y-5">
          <div>
            <Label htmlFor="title" hint="optional · we'll infer it from the JD">
              Job title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Full-Stack Engineer (Next.js + AI)"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="department">
                <span className="inline-flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-muted-2" />
                  Department
                </span>
              </Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Engineering, Product, Sales…"
              />
            </div>
            <div>
              <Label htmlFor="seniority">
                <span className="inline-flex items-center gap-1.5">
                  <BarChart className="h-3.5 w-3.5 text-muted-2" />
                  Seniority
                </span>
              </Label>
              <SelectField
                id="seniority"
                value={seniority}
                onChange={(v) => setSeniority(v)}
                options={SENIORITY_OPTIONS.map((s) => ({ value: s, label: s }))}
              />
            </div>
            <div>
              <Label htmlFor="employment">Employment type</Label>
              <SelectField
                id="employment"
                value={employmentType}
                onChange={(v) => setEmploymentType(v as EmploymentType)}
                options={EMPLOYMENT_OPTIONS}
              />
            </div>
            <div>
              <Label htmlFor="headcount" hint="open seats for this role">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-muted-2" />
                  Headcount
                </span>
              </Label>
              <Input
                id="headcount"
                type="number"
                min={1}
                max={50}
                value={headcount}
                onChange={(e) => setHeadcount(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="location">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-2" />
                  Location
                </span>
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Bengaluru · NYC · EU…"
              />
            </div>
            <div>
              <Label htmlFor="manager">
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-2" />
                  Hiring manager
                </span>
              </Label>
              <Input
                id="manager"
                value={hiringManager}
                onChange={(e) => setHiringManager(e.target.value)}
                placeholder="Name or email"
              />
            </div>
          </div>

          <div>
            <Label>Work mode</Label>
            <WorkModeGroup value={workMode} onChange={setWorkMode} />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="jd"
                className="text-[12.5px] font-medium text-ink-2"
              >
                Job description
              </label>
              <JdPickerPill
                busy={jdExtracting}
                onPick={(f) => void handleJdFile(f)}
              />
            </div>

            <div
              {...jdDropzone.getRootProps({
                className: cn(
                  "relative rounded-[14px] transition",
                  jdDropzone.isDragActive
                    ? "ring-2 ring-brand-400/60 ring-offset-2 ring-offset-bg"
                    : "",
                ),
              })}
            >
              {/* Hidden input — `useDropzone({ noClick: true })` so clicks on the
                  textarea don't trigger the file picker. The JdUploadButton
                  uses its own input for click-to-browse. */}
              <input {...jdDropzone.getInputProps()} />
              <Textarea
                id="jd"
                value={jd}
                onChange={(e) => {
                  setJd(e.target.value);
                  if (jdSource.kind === "upload")
                    setJdSource({ kind: "paste" });
                }}
                className="min-h-[220px]"
                placeholder="Paste the full JD here, or drop a PDF/DOCX above…"
              />
              {jdDropzone.isDragActive ? (
                <div className="pointer-events-none absolute inset-0 grid place-items-center rounded-[14px] bg-brand-50/80 text-[13px] font-semibold text-brand-700">
                  Drop the JD to extract
                </div>
              ) : null}
            </div>

            <div className="mt-2 flex items-center justify-between text-[11.5px] text-muted">
              <span>
                {jdExtracting
                  ? "Reading file…"
                  : jdSource.kind === "upload"
                    ? (
                      <span className="inline-flex items-center gap-1.5 text-success-500">
                        <CheckCircle className="h-3 w-3" />
                        Extracted from {jdSource.filename} ·{" "}
                        {formatBytes(jdSource.bytes)}
                      </span>
                    )
                    : "Markdown ok · parsed by the JD agent"}
              </span>
              <span className="tnum text-muted-2">
                {jd.length.toLocaleString()} chars
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-[12px] border border-border bg-surface-2 p-3">
            <input
              id="blind"
              type="checkbox"
              checked={blindMode}
              onChange={(e) => setBlindMode(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <label htmlFor="blind" className="cursor-pointer text-[13px]">
              <div className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-600" /> Blind mode
              </div>
              <p className="mt-0.5 text-[12px] text-muted">
                Mask candidate names, schools and employer brands in the
                ranking view. Data is still stored, just hidden in the UI.
              </p>
            </label>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle icon={<UploadCloud className="h-3.5 w-3.5" />}>CV batch</CardTitle>
          <Badge tone="brand" dot>
            Step 2 of 2
          </Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          <div
            {...cvDropzone.getRootProps({
              className: `relative cursor-pointer rounded-[14px] border-2 border-dashed p-8 text-center transition ${
                cvDropzone.isDragActive
                  ? "border-brand-400 bg-brand-50/60"
                  : "border-border-strong hover:border-brand-300 hover:bg-brand-50/30"
              }`,
            })}
          >
            <input {...cvDropzone.getInputProps()} />
            <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div className="text-[14px] font-semibold">
              Drop CVs here or click to browse
            </div>
            <div className="mt-0.5 text-[12px] text-muted">
              PDF, DOCX, TXT — up to 50 files per job
            </div>
          </div>

          {files.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-ink-2">
                  {files.length} file{files.length === 1 ? "" : "s"} ready
                </span>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-muted hover:text-ink-2"
                >
                  Clear all
                </button>
              </div>
              <ul className="max-h-[260px] space-y-1.5 overflow-y-auto scroll-thin rounded-[12px] border border-border bg-surface-2 p-2">
                {files.map((f, idx) => (
                  <li
                    key={`${f.name}-${idx}`}
                    className="flex items-center justify-between gap-2 rounded-md bg-surface px-3 py-2 text-[12.5px]"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <FileText className="h-4 w-4 text-brand-600" />
                      <span className="min-w-0 truncate font-medium">
                        {f.name}
                      </span>
                      <span className="shrink-0 text-muted">
                        · {formatBytes(f.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((p) => p.filter((_, i) => i !== idx))
                      }
                      className="text-muted hover:text-rose-500"
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={submit}
            disabled={busy}
          >
            <Sparkles className="h-4 w-4" />
            {busy ? "Spinning up the pipeline…" : "Run shortlister"}
          </Button>
          <p className="text-center text-[11.5px] text-muted">
            Avg p95 budget: 14 s per CV · audit runs once all candidates settle.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function SelectField({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-11 w-full appearance-none rounded-[14px] border border-border-strong bg-[rgba(14,46,30,0.04)] px-4 pr-9 text-sm text-ink",
        "outline-none transition",
        "focus:border-brand-400/60 focus:bg-[rgba(14,46,30,0.06)] focus:ring-2 focus:ring-brand-400/20",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22 fill=%22none%22><path d=%22M3 4.5l3 3 3-3%22 stroke=%22%2356695a%22 stroke-width=%221.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')]",
        "bg-no-repeat bg-[length:12px_12px]",
      )}
      style={{ backgroundPosition: "right 14px center" }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function WorkModeGroup({
  value,
  onChange,
}: {
  value: WorkMode;
  onChange: (v: WorkMode) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-[14px] border border-border-strong bg-[rgba(14,46,30,0.04)] p-1">
      {WORK_MODES.map((m) => {
        const active = m.value === value;
        return (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            className={cn(
              "h-9 rounded-[10px] px-4 text-[12.5px] font-semibold transition",
              active
                ? "bg-bg text-ink shadow-[var(--shadow-card)]"
                : "text-muted hover:text-ink",
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

function JdPickerPill({
  busy,
  onPick,
}: {
  busy: boolean;
  onPick: (file: File) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-full border border-border-strong bg-bg-2 px-2.5 text-[11px] font-semibold text-ink transition",
          "hover:bg-[rgba(14,46,30,0.05)] disabled:opacity-50 disabled:cursor-wait",
        )}
      >
        {busy ? (
          <>
            <SpinnerGlyph /> Reading…
          </>
        ) : (
          <>
            <Wand className="h-3 w-3 text-brand-700" />
            Extract from PDF / DOCX
          </>
        )}
      </button>
    </>
  );
}

function SpinnerGlyph() {
  return (
    <svg
      className="h-3 w-3 animate-spin text-brand-700"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
