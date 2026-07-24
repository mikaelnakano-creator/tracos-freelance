import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-[linear-gradient(90deg,#eee8dc,#f8f5ee,#eee8dc)] bg-[length:220%_100%]",
        className,
      )}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-[var(--border)] bg-white p-8 text-center">
      <div className="max-w-sm">
        <h3 className="font-bold text-[var(--text)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
