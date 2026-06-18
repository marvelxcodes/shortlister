import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "ink";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 disabled:opacity-50 disabled:cursor-not-allowed select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-brand-300 via-brand-400 to-brand-500 text-ink shadow-[var(--shadow-brand)] hover:from-brand-400 hover:to-brand-600",
  secondary:
    "bg-[rgba(14,46,30,0.07)] text-ink hover:bg-[rgba(14,46,30,0.10)] border border-[rgba(14,46,30,0.09)]",
  ink:
    "bg-ink text-bg hover:bg-ink-2",
  outline:
    "bg-transparent text-ink border border-border-strong hover:bg-[rgba(14,46,30,0.05)]",
  ghost: "bg-transparent text-ink hover:bg-[rgba(14,46,30,0.06)]",
  danger: "bg-danger-500 text-white hover:bg-danger-600",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-4 text-[12.5px]",
  md: "h-10 px-5 text-[13.5px]",
  lg: "h-12 px-6 text-[15px]",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant = "outline", size = "md", ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...rest}
      />
    );
  },
);
