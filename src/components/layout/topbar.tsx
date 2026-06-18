"use client";

import Link from "next/link";
import { Bell01 as Bell, ChevronDown, Gift01 as Gift, Plus } from "@untitledui/icons";

export function TopActions({
  ctaLabel = "Add Widget",
  ctaHref = "/jobs/new",
}: {
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Promotions"
        className="glass inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:text-ink"
      >
        <Gift className="h-[16px] w-[16px]" />
      </button>
      <button
        type="button"
        aria-label="Notifications"
        className="glass relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:text-ink"
      >
        <Bell className="h-[16px] w-[16px]" />
        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand-500 ring-2 ring-bg" />
      </button>
      <Link
        href={ctaHref}
        className="glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-ink hover:bg-[rgba(14,46,30,0.07)]"
      >
        {ctaLabel}
        <Plus className="h-[14px] w-[14px] text-brand-700" />
      </Link>
      <button
        type="button"
        className="glass inline-flex h-10 items-center gap-1.5 rounded-full p-1 pr-2.5 text-[13px] font-medium text-ink"
        aria-label="Account"
      >
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[11px] font-bold text-ink"
          aria-hidden="true"
        >
          CR
        </span>
        <ChevronDown className="h-[14px] w-[14px] text-muted-2" />
      </button>
    </div>
  );
}

/** Legacy shim — layout used to render <Topbar /> at the top of every page.
 *  The new design integrates actions into PageHeader, so this is a no-op. */
export function Topbar() {
  return null;
}
