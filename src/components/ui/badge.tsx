import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Tone =
  | "neutral"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "amber"
  | "mint"
  | "blush";

const tones: Record<Tone, string> = {
  neutral: "bg-[rgba(14,46,30,0.07)] text-ink-2 border-[rgba(14,46,30,0.09)]",
  brand: "bg-brand-500/15 text-brand-700 border-brand-500/25",
  success: "bg-success-50 text-success-500 border-success-500/30",
  warning: "bg-amber-50 text-amber-500 border-amber-500/30",
  danger: "bg-danger-50 text-danger-500 border-danger-500/30",
  info: "bg-brand-500/12 text-brand-700 border-brand-500/20",
  amber: "bg-amber-50 text-amber-500 border-amber-500/30",
  mint: "bg-success-50 text-success-500 border-success-500/30",
  blush: "bg-danger-50 text-danger-500 border-danger-500/30",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  dot,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium leading-5",
        tones[tone],
        className,
      )}
    >
      {dot ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" />
      ) : null}
      {children}
    </span>
  );
}
