import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { TopActions } from "./topbar";

export function PageHeader({
  title,
  description,
  actions,
  meta,
  className,
  showDefaultActions = true,
  ctaLabel,
  ctaHref,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
  showDefaultActions?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-[34px] font-semibold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13px] text-muted">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-3">{meta}</div> : null}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {showDefaultActions ? (
          <TopActions ctaLabel={ctaLabel} ctaHref={ctaHref} />
        ) : null}
      </div>
    </div>
  );
}
