import { Users, WalletCards } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EventTeamProgress } from "@/components/app/event-team-progress";
import { formatMoney } from "@/lib/domain/money";

export function EventTeamSummary({
  totalSlots,
  assignedSlots,
  openSlots,
  totalAgreedFee,
  totalPaid,
  totalBalance,
}: {
  totalSlots: number;
  assignedSlots: number;
  openSlots: number;
  totalAgreedFee: number;
  totalPaid: number;
  totalBalance: number;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardContent className="grid gap-3 p-4">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-[var(--brand)]" />
            <strong>Resumo da equipe</strong>
          </div>
          <EventTeamProgress
            assigned={assignedSlots}
            open={openSlots}
            total={totalSlots}
          />
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <Metric label="Profissionais" value={totalSlots} />
            <Metric label="Preenchidas" value={assignedSlots} />
            <Metric label="Abertas" value={openSlots} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="grid gap-3 p-4">
          <div className="flex items-center gap-2">
            <WalletCards size={18} className="text-[var(--brand)]" />
            <strong>Resumo financeiro</strong>
          </div>
          <FinanceLine
            label="Valor combinado"
            value={formatMoney(totalAgreedFee)}
          />
          <FinanceLine label="Total pago" value={formatMoney(totalPaid)} />
          <FinanceLine
            label="Saldo do evento"
            value={formatMoney(totalBalance)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-[var(--surface-muted)] p-3">
      <strong className="block text-lg">{value}</strong>
      <span className="text-xs text-[var(--muted)]">{label}</span>
    </div>
  );
}

function FinanceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
