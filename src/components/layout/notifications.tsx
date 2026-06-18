"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell01 as Bell,
  CheckCircle as CheckCircle,
  AlertTriangle as AlertTriangle,
  AlertCircle as AlertCircle,
  Loading01 as Loader,
  CheckDone01 as CheckDone,
} from "@untitledui/icons";
import { cn } from "@/lib/utils/cn";
import type {
  NotificationItem,
  NotificationKind,
} from "@/app/api/notifications/route";

const READ_KEY = "shortlister.notifications.read.v1";

function loadRead(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveRead(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    /* quota / disabled — ignore */
  }
}

export function Notifications() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // Hydrate read IDs from localStorage on mount.
  React.useEffect(() => {
    setReadIds(loadRead());
  }, []);

  // Fetch unread count in the background so the bell shows a dot even
  // before the panel is opened.
  const fetchItems = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { notifications: NotificationItem[] };
      setItems(data.notifications);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchItems();
    const t = setInterval(fetchItems, 30_000);
    return () => clearInterval(t);
  }, [fetchItems]);

  // Refresh whenever the panel opens — keeps the list fresh after the
  // user navigates around.
  React.useEffect(() => {
    if (open) void fetchItems();
  }, [open, fetchItems]);

  // Close on outside click + Esc.
  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !readIds.has(n.id));

  function markRead(id: string) {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveRead(next);
      return next;
    });
  }

  function markAllRead() {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const n of items) next.add(n.id);
      saveRead(next);
      return next;
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Notifications${unread.length ? ` (${unread.length} unread)` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "glass relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted transition hover:text-ink",
          open && "text-ink",
        )}
      >
        <Bell className="h-[16px] w-[16px]" />
        {unread.length > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-ink ring-2 ring-bg"
            aria-hidden="true"
          >
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[360px] overflow-hidden rounded-[14px] border border-border-strong bg-bg-2 shadow-[var(--shadow-pop)]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-ink">
                Notifications
              </span>
              {unread.length > 0 && (
                <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-brand-700">
                  {unread.length} new
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread.length === 0}
              className={cn(
                "inline-flex items-center gap-1 text-[11.5px] font-medium",
                unread.length === 0
                  ? "text-muted-2"
                  : "text-brand-700 hover:underline",
              )}
            >
              <CheckDone className="h-3 w-3" />
              Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-[12px] text-muted">
                <Loader className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </div>
            ) : error ? (
              <div className="px-4 py-8 text-center text-[12px] text-muted">
                Could not load notifications.
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(14,46,30,0.06)] text-brand-700">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="text-[13px] font-semibold text-ink">
                  All caught up
                </div>
                <div className="mt-0.5 text-[11.5px] text-muted">
                  You'll see job and audit updates here.
                </div>
              </div>
            ) : (
              <ul>
                {items.map((n) => {
                  const isRead = readIds.has(n.id);
                  return (
                    <li
                      key={n.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <Link
                        href={n.href}
                        onClick={() => {
                          markRead(n.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 transition hover:bg-[rgba(14,46,30,0.04)]",
                          !isRead && "bg-[rgba(14,46,30,0.025)]",
                        )}
                      >
                        <KindIcon kind={n.kind} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "truncate text-[13px]",
                                isRead
                                  ? "font-medium text-ink-2"
                                  : "font-semibold text-ink",
                              )}
                            >
                              {n.title}
                            </span>
                            {!isRead && (
                              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-[11.5px] text-muted">
                            {n.body}
                          </div>
                          <div className="mt-0.5 text-[10.5px] text-muted-2">
                            {relativeTime(n.at)}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function KindIcon({ kind }: { kind: NotificationKind }) {
  const cls = "h-3.5 w-3.5";
  if (kind === "success")
    return (
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500/15 text-brand-700">
        <CheckCircle className={cls} />
      </span>
    );
  if (kind === "warn")
    return (
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700">
        <AlertTriangle className={cls} />
      </span>
    );
  if (kind === "error")
    return (
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-700">
        <AlertCircle className={cls} />
      </span>
    );
  return (
    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(14,46,30,0.07)] text-brand-700">
      <Loader className={cls} />
    </span>
  );
}

function relativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
