const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatMoney(cents: number) {
  return moneyFormatter.format(cents / 100);
}

export function parseMoneyToCents(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const numeric = Number(normalized);

  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

export function centsToDatabaseNumeric(cents: number) {
  return (cents / 100).toFixed(2);
}

export function describeBalance(cents: number, actor: "admin" | "freelancer") {
  if (cents === 0) {
    return actor === "admin" ? "Nenhuma pendência financeira" : "Saldo em dia";
  }

  if (cents > 0) {
    return actor === "admin"
      ? `A empresa deve ${formatMoney(cents)} ao freelancer`
      : `Saldo a receber: ${formatMoney(cents)}`;
  }

  return actor === "admin"
    ? `Freelancer possui ${formatMoney(Math.abs(cents))} em adiantamentos`
    : `Adiantamento recebido: ${formatMoney(Math.abs(cents))}`;
}
