import * as React from "react";
import type { FC, SVGProps } from "react";
import { ArrowUpRight } from "@untitledui/icons";
import { cn } from "@/lib/utils/cn";

type LucideIcon = FC<SVGProps<SVGSVGElement>>;

export function Kpi({
  label,
  value,
  delta,
  icon: Icon,
  hint,
  tone = "brand",
  chart,
  deltaLabel,
}: {
  label: string;
  value: React.ReactNode;
  delta?: number;
  icon?: LucideIcon;
  hint?: string;
  tone?:
    | "brand"
    | "neutral"
    | "success"
    | "danger"
    | "teal"
    | "amber"
    | "rose";
  chart?: React.ReactNode;
  deltaLabel?: string;
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-500/15 text-brand-700",
    neutral: "bg-[rgba(14,46,30,0.07)] text-ink-2",
    success: "bg-success-50 text-success-500",
    danger: "bg-danger-50 text-danger-500",
    teal: "bg-success-50 text-success-500",
    amber: "bg-amber-50 text-amber-500",
    rose: "bg-danger-50 text-danger-500",
  };
  return (
    <div className="glass group rounded-[20px] px-6 py-5 shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon ? (
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-[8px]",
                  tones[tone],
                )}
              >
                <Icon className="h-[15px] w-[15px]" />
              </span>
            ) : null}
            <div className="text-[12.5px] font-medium text-muted">{label}</div>
          </div>
          <div className="mt-3 text-[30px] font-semibold leading-none tracking-tight text-ink tnum">
            {value}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11.5px] text-muted">
            {typeof delta === "number" ? <DeltaPill delta={delta} /> : null}
            {deltaLabel ?? hint ? (
              <span>{deltaLabel ?? hint}</span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          aria-label="Expand"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(14,46,30,0.05)] text-muted opacity-0 transition group-hover:opacity-100 hover:text-ink"
        >
          <ArrowUpRight className="h-[14px] w-[14px]" />
        </button>
      </div>
      {chart ? <div className="mt-4 h-12 w-full">{chart}</div> : null}
    </div>
  );
}

export function DeltaPill({ delta }: { delta: number }) {
  const up = delta >= 0;
  const sign = up ? "+" : "";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
        up
          ? "bg-success-50 text-success-500"
          : "bg-danger-50 text-danger-500",
      )}
    >
      <ArrowUpRight
        className={cn("h-3 w-3", up ? "" : "rotate-90")}
        aria-hidden="true"
      />
      {sign}
      {delta.toFixed(1)}%
    </span>
  );
}
