import { Badge } from "@/components/ui/badge";
import { describeBalance, formatMoney } from "@/lib/domain/money";

export function BalanceDisplay({
  cents,
  actor = "admin",
  compact = false,
}: {
  cents: number;
  actor?: "admin" | "freelancer";
  compact?: boolean;
}) {
  const tone = cents > 0 ? "success" : cents < 0 ? "warning" : "neutral";

  if (compact) {
    return (
      <Badge tone={tone}>
        {cents === 0 ? "Em dia" : formatMoney(Math.abs(cents))}
      </Badge>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <span className="text-xs font-bold uppercase text-[var(--muted)]">
        Saldo
      </span>
      <strong className="mt-1 block text-xl text-[var(--text)]">
        {cents === 0 ? formatMoney(0) : formatMoney(Math.abs(cents))}
      </strong>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {describeBalance(cents, actor)}
      </p>
    </div>
  );
}
