"use client";

import { Field, Textarea } from "@/components/ui/input";
import { MoneyInput } from "@/components/app/money-input";
import { SlotAssignmentSelector } from "@/components/app/slot-assignment-selector";
import type { SlotFormValues } from "@/lib/domain/schemas";
import type { Profile } from "@/lib/domain/types";

export function ProfessionalSlotForm({
  serviceName,
  slot,
  freelancers,
  onChange,
}: {
  serviceName: string;
  slot: SlotFormValues;
  freelancers: Profile[];
  onChange: (slot: SlotFormValues) => void;
}) {
  return (
    <div className="grid gap-4 rounded-lg border border-[var(--border)] bg-white p-4">
      <div>
        <strong className="text-sm text-[var(--text)]">
          {serviceName} - Profissional {slot.slotNumber}
        </strong>
        <span className="block text-xs text-[var(--muted)]">
          Configure esta vaga individualmente.
        </span>
      </div>
      <SlotAssignmentSelector
        freelancerId={slot.assignedFreelancerId ?? ""}
        freelancers={freelancers}
        mode={slot.assignmentMode}
        onFreelancerChange={(assignedFreelancerId) =>
          onChange({ ...slot, assignedFreelancerId })
        }
        onModeChange={(assignmentMode) =>
          onChange({
            ...slot,
            assignmentMode,
            assignedFreelancerId:
              assignmentMode === "open" ? "" : slot.assignedFreelancerId,
          })
        }
      />
      <Field label="Valor do serviço para este profissional">
        <MoneyInput
          value={slot.agreedFee}
          onChange={(agreedFee) => onChange({ ...slot, agreedFee })}
        />
      </Field>
      <Field label="Observações da vaga">
        <Textarea
          value={slot.notes ?? ""}
          onChange={(event) => onChange({ ...slot, notes: event.target.value })}
        />
      </Field>
    </div>
  );
}
