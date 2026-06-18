"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid01 as LayoutGrid,
  Briefcase01 as Briefcase,
  Users01 as Users2,
  Stars02 as Sparkles,
  ShieldTick as ShieldCheck,
  File02 as FileText,
  LogOut01 as LogOut,
} from "@untitledui/icons";
import { cn } from "@/lib/utils/cn";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const primary: Item[] = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/candidates", label: "Candidates", icon: Users2 },
  { href: "/insights", label: "Insights", icon: FileText },
  { href: "/audit", label: "Audit", icon: ShieldCheck },
  { href: "/jobs/new", label: "New job", icon: Sparkles },
];

const secondary: Item[] = [
  { href: "/help", label: "Sign out", icon: LogOut },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-30 hidden h-screen shrink-0 flex-col items-center py-5 md:flex md:w-[76px]">
      <Link
        href="/"
        className="mb-7 inline-flex h-10 w-10 items-center justify-center"
        aria-label="Shortlister home"
      >
        <LogoMark />
      </Link>

      <nav aria-label="Primary" className="flex flex-1 flex-col items-center gap-2">
        {primary.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(item.href);
          return (
            <SidebarIcon key={item.href} item={item} active={!!active} />
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2 pt-4">
        {secondary.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <SidebarIcon key={item.href} item={item} active={!!active} muted />
          );
        })}
      </div>
    </aside>
  );
}

function SidebarIcon({
  item,
  active,
  muted,
}: {
  item: Item;
  active: boolean;
  muted?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative inline-flex h-11 w-11 items-center justify-center rounded-[12px] transition",
        active
          ? "bg-brand-400 text-ink shadow-[var(--shadow-brand)]"
          : muted
            ? "text-muted-2 hover:text-ink hover:bg-[rgba(14,46,30,0.05)]"
            : "text-muted hover:text-ink hover:bg-[rgba(14,46,30,0.05)]",
      )}
      title={item.label}
    >
      <Icon className="h-[18px] w-[18px]" />
      <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-border-strong bg-bg-2 px-2 py-1 text-[11.5px] font-medium text-ink opacity-0 shadow-[var(--shadow-pop)] transition group-hover:opacity-100">
        {item.label}
      </span>
    </Link>
  );
}

function LogoMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff5e8" />
          <stop offset="100%" stopColor="#bdb2a4" />
        </linearGradient>
      </defs>
      <path
        d="M5 21 L13 5 L15 11 L11 21 Z"
        fill="url(#logo-grad)"
      />
      <path
        d="M13 21 L21 5 L23 11 L19 21 Z"
        fill="url(#logo-grad)"
        opacity="0.6"
      />
    </svg>
  );
}
