"use client";

import { Field, Select } from "@/components/ui/input";
import { FreelancerSelector } from "@/components/app/freelancer-selector";
import type { AssignmentMode, Profile } from "@/lib/domain/types";

export function SlotAssignmentSelector({
  mode,
  freelancerId,
  freelancers,
  onModeChange,
  onFreelancerChange,
}: {
  mode: AssignmentMode;
  freelancerId: string;
  freelancers: Profile[];
  onModeChange: (mode: AssignmentMode) => void;
  onFreelancerChange: (id: string) => void;
}) {
  return (
    <div className="grid gap-3">
      <Field label="Forma de preenchimento">
        <Select
          value={mode}
          onChange={(event) =>
            onModeChange(event.target.value as AssignmentMode)
          }
        >
          <option value="direct">Designar freelancer</option>
          <option value="open">Deixar aberta para aceite</option>
        </Select>
      </Field>
      {mode === "direct" ? (
        <Field label="Freelancer">
          <FreelancerSelector
            freelancers={freelancers}
            value={freelancerId}
            onChange={onFreelancerChange}
          />
        </Field>
      ) : null}
    </div>
  );
}
