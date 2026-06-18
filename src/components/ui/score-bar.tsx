import { cn } from "@/lib/utils/cn";

export function ScoreBar({
  value,
  label,
  size = "md",
  className,
}: {
  value: number; // 0..1
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={cn("w-full", className)}>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-[11.5px]">
          <span className="text-muted">{label}</span>
          <span className="font-semibold text-ink tnum">{pct.toFixed(0)}</span>
        </div>
      ) : null}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-[rgba(14,46,30,0.08)]",
          size === "sm" ? "h-1.5" : "h-2",
        )}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, var(--color-brand-400), var(--color-brand-600))",
            boxShadow: "0 0 12px rgba(98,203,53,0.40)",
          }}
        />
      </div>
    </div>
  );
}
