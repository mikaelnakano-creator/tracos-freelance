import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "brand",
}: {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone?: "brand" | "green" | "blue" | "red";
}) {
  return (
    <Card className="min-h-32">
      <CardContent className="flex h-full items-start justify-between gap-4 p-5">
        <div>
          <span className="text-sm font-semibold text-[var(--muted)]">
            {title}
          </span>
          <strong className="mt-3 block text-2xl font-extrabold text-[var(--text)]">
            {value}
          </strong>
          <p className="mt-2 text-xs text-[var(--muted)]">{description}</p>
        </div>
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-md",
            tone === "brand" && "bg-[#dff1ef] text-[#245f5d]",
            tone === "green" && "bg-[#e6f4ee] text-[#236f59]",
            tone === "blue" && "bg-[#e8eef8] text-[#2e5d91]",
            tone === "red" && "bg-[#fde9e5] text-[var(--danger)]",
          )}
        >
          <Icon size={18} />
        </span>
      </CardContent>
    </Card>
  );
}
