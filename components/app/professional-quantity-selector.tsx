"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_EVENT_PROFESSIONALS } from "@/lib/domain/finance";

export function ProfessionalQuantitySelector({
  value,
  totalWithoutCurrent,
  onChange,
}: {
  value: number;
  totalWithoutCurrent: number;
  onChange: (value: number) => void;
}) {
  const maxForThisService = Math.max(
    1,
    MAX_EVENT_PROFESSIONALS - totalWithoutCurrent,
  );
  const canDecrease = value > 1;
  const canIncrease = value < maxForThisService;

  return (
    <div className="grid gap-1.5">
      <div className="flex w-fit items-center overflow-hidden rounded-md border border-[var(--border)] bg-white">
        <Button
          aria-label="Diminuir quantidade de profissionais"
          disabled={!canDecrease}
          onClick={() => onChange(Math.max(1, value - 1))}
          size="icon"
          variant="ghost"
        >
          <Minus size={16} />
        </Button>
        <strong className="grid h-10 min-w-12 place-items-center border-x border-[var(--border)] px-4 text-sm">
          {value}
        </strong>
        <Button
          aria-label="Aumentar quantidade de profissionais"
          disabled={!canIncrease}
          onClick={() => onChange(Math.min(maxForThisService, value + 1))}
          size="icon"
          variant="ghost"
        >
          <Plus size={16} />
        </Button>
      </div>
      {!canIncrease &&
      totalWithoutCurrent + value >= MAX_EVENT_PROFESSIONALS ? (
        <span className="text-xs font-medium text-[var(--danger)]">
          Este evento pode ter no máximo 5 profissionais.
        </span>
      ) : null}
    </div>
  );
}
