import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass rounded-[20px] shadow-[var(--shadow-card)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-6 pt-5 pb-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  icon,
  hint,
}: React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-ink", className)}>
      {icon ? (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-[rgba(14,46,30,0.07)] text-brand-700">
          {icon}
        </span>
      ) : null}
      <h3 className="text-[15px] font-semibold tracking-tight">{children}</h3>
      {hint ? (
        <span className="ml-1 text-[11.5px] text-muted-2">{hint}</span>
      ) : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6", className)}>{children}</div>;
}

export function CardFooter({
  className,
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-6 py-3.5 border-t border-border bg-[rgba(14,46,30,0.04)] rounded-b-[20px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
