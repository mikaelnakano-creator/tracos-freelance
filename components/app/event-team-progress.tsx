import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function EventTeamProgress({
  total,
  assigned,
  open,
  compact = false,
}: {
  total: number;
  assigned: number;
  open: number;
  compact?: boolean;
}) {
  const percent = total === 0 ? 0 : Math.round((assigned / total) * 100);
  const complete = total > 0 && assigned === total;

  return (
    <div className={cn("grid gap-2", compact && "gap-1.5")}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <strong className="text-[var(--text)]">
          {complete
            ? `Equipe completa: ${assigned} de ${total}`
            : `Equipe: ${assigned} de ${total} profissionais confirmados`}
        </strong>
        {open > 0 ? (
          <Badge tone="info">
            {open} {open === 1 ? "vaga aberta" : "vagas abertas"}
          </Badge>
        ) : null}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            complete ? "bg-[var(--success)]" : "bg-[var(--brand)]",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
