import { avatarColor, initials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export function Avatar({
  name,
  size = 32,
  className,
  masked = false,
}: {
  name: string;
  size?: number;
  className?: string;
  masked?: boolean;
}) {
  const display = masked ? "•••" : initials(name);
  const [bg, fg] = avatarColor(name);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: bg,
        color: fg,
        fontSize: Math.round(size * 0.38),
        letterSpacing: 0.2,
      }}
      aria-hidden
    >
      {display}
    </span>
  );
}
