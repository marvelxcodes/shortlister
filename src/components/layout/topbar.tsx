"use client";

import Link from "next/link";
import { Plus, ArrowUpRight, Zap } from "@untitledui/icons";
import { Notifications } from "./notifications";

export function TopActions({
  ctaLabel = "Create Job",
  ctaHref = "/jobs/new",
}: {
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/pricing"
        className="inline-flex h-10 items-center gap-1.5 rounded-full bg-gradient-to-b from-brand-300 via-brand-400 to-brand-500 px-4 text-[13px] font-semibold text-ink shadow-[var(--shadow-brand)]"
      >
        <Zap className="h-[14px] w-[14px]" />
        Upgrade
        <ArrowUpRight className="h-[14px] w-[14px]" />
      </Link>
      <Notifications />
      <Link
        href={ctaHref}
        className="glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-ink hover:bg-[rgba(14,46,30,0.07)]"
      >
        {ctaLabel}
        <Plus className="h-[14px] w-[14px] text-brand-700" />
      </Link>
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[11px] font-bold text-ink shadow-sm"
        aria-label="Account"
      >
        CR
      </button>
    </div>
  );
}

/** Legacy shim — layout used to render <Topbar /> at the top of every page.
 *  The new design integrates actions into PageHeader, so this is a no-op. */
export function Topbar() {
  return null;
}
