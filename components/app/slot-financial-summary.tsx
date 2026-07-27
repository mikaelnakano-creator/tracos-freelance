import { Badge } from "@/components/ui/badge";
import { formatMoney, describeBalance } from "@/lib/domain/money";

export function SlotFinancialSummary({
  agreedFee,
  paid,
  balance,
}: {
  agreedFee: number;
  paid: number;
  balance: number;
}) {
  return (
    <div className="grid gap-2 rounded-md bg-[var(--surface-muted)] p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span>Combinado</span>
        <strong>{formatMoney(agreedFee)}</strong>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span>Pago</span>
        <strong>{formatMoney(paid)}</strong>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-2">
        <span>Saldo</span>
        <Badge
          tone={balance < 0 ? "warning" : balance > 0 ? "success" : "neutral"}
        >
          {describeBalance(balance, "freelancer")}
        </Badge>
      </div>
    </div>
  );
}
