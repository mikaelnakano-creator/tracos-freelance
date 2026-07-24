import { Input } from "@/components/ui/input";

export function MoneyInput({
  value,
  onChange,
  placeholder = "R$ 0,00",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      inputMode="decimal"
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
