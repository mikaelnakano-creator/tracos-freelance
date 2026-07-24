import { Select } from "@/components/ui/input";

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      aria-label="Período"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="month">Mês atual</option>
      <option value="30days">Últimos 30 dias</option>
      <option value="3months">Últimos 3 meses</option>
      <option value="6months">Últimos 6 meses</option>
      <option value="year">Ano atual</option>
      <option value="custom">Período personalizado</option>
    </Select>
  );
}
