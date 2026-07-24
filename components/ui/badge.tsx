import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "brand" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-[var(--surface-muted)] text-[var(--muted)]",
  success: "bg-[#e6f4ee] text-[#236f59]",
  warning: "bg-[#fff3df] text-[#8a5a13]",
  danger: "bg-[#fde9e5] text-[var(--danger)]",
  brand: "bg-[#dff1ef] text-[#245f5d]",
  info: "bg-[#e8eef8] text-[#2e5d91]",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-bold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
