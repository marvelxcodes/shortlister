"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown as ChevronDown,
  SearchLg as Search,
  Check as Check,
  Briefcase01 as Briefcase,
} from "@untitledui/icons";
import { cn } from "@/lib/utils/cn";

type Option = { id: string; title: string };

export function JobSelector({
  jobs,
  selectedId,
}: {
  jobs: Option[];
  selectedId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIdx, setActiveIdx] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const selected =
    jobs.find((j) => j.id === selectedId) ?? jobs[0] ?? { id: "", title: "" };

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => j.title.toLowerCase().includes(q));
  }, [jobs, query]);

  // Close on outside click.
  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Reset query + focus search input when opening.
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      // Defer to next tick so the input is mounted.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keep the active option in view.
  React.useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${activeIdx}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIdx, open]);

  function commit(id: string) {
    setOpen(false);
    if (id === selectedId) return;
    startTransition(() => {
      router.push(`/candidates?job=${encodeURIComponent(id)}`);
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[activeIdx];
      if (pick) commit(pick.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <span className="mb-1 block text-[10.5px] font-semibold uppercase tracking-wider text-muted-2">
        Job
      </span>
      <button
        type="button"
        disabled={pending || jobs.length === 0}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "group flex w-full items-center gap-2.5 rounded-[12px] border bg-surface px-3 py-2.5 text-left shadow-sm transition",
          open
            ? "border-brand-400 ring-2 ring-brand-200"
            : "border-border hover:border-border-strong",
          pending && "opacity-60",
        )}
      >
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[rgba(14,46,30,0.07)] text-brand-700">
          <Briefcase className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-ink">
            {selected.title || "Select a job"}
          </span>
          <span className="block truncate text-[11px] text-muted">
            {jobs.length} job{jobs.length === 1 ? "" : "s"} available
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted transition",
            open && "rotate-180 text-ink",
          )}
        />
      </button>

      {open && (
        <div
          className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-[12px] border border-border-strong bg-bg-2 shadow-[var(--shadow-pop)]"
          role="dialog"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIdx(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search jobs…"
              className="w-full bg-transparent text-[13px] text-ink placeholder:text-muted-2 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-[11px] text-muted-2 hover:text-ink"
              >
                clear
              </button>
            )}
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12px] text-muted">
              No jobs match "{query}"
            </div>
          ) : (
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-[260px] overflow-y-auto py-1"
            >
              {filtered.map((j, i) => {
                const isActive = i === activeIdx;
                const isSelected = j.id === selectedId;
                return (
                  <li key={j.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-idx={i}
                      onMouseEnter={() => setActiveIdx(i)}
                      onClick={() => commit(j.id)}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px]",
                        isActive
                          ? "bg-[rgba(14,46,30,0.06)] text-ink"
                          : "text-ink-2",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {j.title}
                      </span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-brand-700" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
