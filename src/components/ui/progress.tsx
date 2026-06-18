import { cn } from "@/lib/utils/cn";

export function Progress({
  value,
  tone = "brand",
  className,
}: {
  value: number;
  tone?: "brand" | "success" | "danger" | "amber";
  className?: string;
}) {
  const colors: Record<string, string> = {
    brand: "bg-gradient-to-r from-brand-400 to-brand-600",
    success: "bg-success-500",
    danger: "bg-danger-500",
    amber: "bg-amber-500",
  };
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-[rgba(14,46,30,0.07)]",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", colors[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
