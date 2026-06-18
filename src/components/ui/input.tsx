import * as React from "react";
import { cn } from "@/lib/utils/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-[14px] border border-border-strong bg-[rgba(14,46,30,0.04)] px-4 text-sm text-ink",
        "placeholder:text-muted-2 outline-none transition",
        "focus:border-brand-400/60 focus:bg-[rgba(14,46,30,0.06)] focus:ring-2 focus:ring-brand-400/20",
        className,
      )}
      {...rest}
    />
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[140px] w-full rounded-[14px] border border-border-strong bg-[rgba(14,46,30,0.04)] p-4 text-sm text-ink",
        "placeholder:text-muted-2 outline-none transition resize-y",
        "focus:border-brand-400/60 focus:bg-[rgba(14,46,30,0.06)] focus:ring-2 focus:ring-brand-400/20",
        className,
      )}
      {...rest}
    />
  );
});

export function Label({
  children,
  htmlFor,
  hint,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  hint?: string;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between">
      <label
        htmlFor={htmlFor}
        className="text-[12.5px] font-medium text-ink-2"
      >
        {children}
      </label>
      {hint ? (
        <span className="text-[11px] text-muted-2">{hint}</span>
      ) : null}
    </div>
  );
}
