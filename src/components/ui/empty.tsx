import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-dashed border-border-strong",
        "bg-dots px-8 py-16 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-brand-500/15 text-brand-700">
          {icon}
        </div>
      ) : null}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
