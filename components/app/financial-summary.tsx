import {
  CreditCard,
  Landmark,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { StatCard } from "@/components/app/stat-card";
import { formatMoney } from "@/lib/domain/money";

export function FinancialSummary({
  generated,
  paid,
  pending,
  advances,
  netBalance,
}: {
  generated: number;
  paid: number;
  pending: number;
  advances: number;
  netBalance: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        description="Receitas de eventos concluídos"
        icon={TrendingUp}
        title="Total gerado"
        value={formatMoney(generated)}
      />
      <StatCard
        description="Pagamentos e adiantamentos"
        icon={CreditCard}
        title="Total pago"
        tone="blue"
        value={formatMoney(paid)}
      />
      <StatCard
        description="Saldo positivo dos parceiros"
        icon={Wallet}
        title="Total pendente"
        tone="green"
        value={formatMoney(pending)}
      />
      <StatCard
        description="Crédito antecipado recebido"
        icon={TrendingDown}
        title="Adiantamentos"
        tone="red"
        value={formatMoney(advances)}
      />
      <StatCard
        description="Pendente menos adiantamentos"
        icon={Landmark}
        title="Saldo líquido"
        value={formatMoney(netBalance)}
      />
    </div>
  );
}
