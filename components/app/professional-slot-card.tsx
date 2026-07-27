import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SlotFinancialSummary } from "@/components/app/slot-financial-summary";
import { SlotStatusBadge } from "@/components/app/slot-status-badge";
import type {
  EventProfessionalSlot,
  FinancialEntry,
  Profile,
} from "@/lib/domain/types";
import { getSlotFinancialSummary } from "@/lib/domain/finance";
import { initials } from "@/lib/utils";

export function ProfessionalSlotCard({
  slot,
  serviceName,
  profiles,
  entries,
  showActions = false,
  onComplete,
  onReopen,
  onCancel,
}: {
  slot: EventProfessionalSlot;
  serviceName: string;
  profiles: Profile[];
  entries: FinancialEntry[];
  showActions?: boolean;
  onComplete?: (slotId: string) => void;
  onReopen?: (slotId: string) => void;
  onCancel?: (slotId: string) => void;
}) {
  const profile = profiles.find(
    (item) => item.id === slot.assignedFreelancerId,
  );
  const summary = getSlotFinancialSummary(slot, entries);

  return (
    <Card>
      <CardContent className="grid gap-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <strong className="text-sm text-[var(--text)]">
              {serviceName} - Vaga {slot.slotNumber}
            </strong>
            <div className="mt-2 flex flex-wrap gap-2">
              <SlotStatusBadge status={slot.status} />
            </div>
          </div>
          {profile ? (
            <div className="flex items-center gap-2 text-right">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--graphite)] text-xs font-black text-white">
                {initials(profile.fullName)}
              </span>
              <div>
                <strong className="block text-sm">{profile.fullName}</strong>
                <span className="text-xs text-[var(--muted)]">
                  {profile.email}
                </span>
              </div>
            </div>
          ) : (
            <span className="rounded-md bg-[#e4eef8] px-3 py-2 text-xs font-bold text-[#24558a]">
              Aberta para aceite
            </span>
          )}
        </div>
        <SlotFinancialSummary
          agreedFee={summary.agreedFee}
          balance={summary.balance}
          paid={summary.paid}
        />
        {slot.notes ? (
          <p className="text-sm text-[var(--muted)]">{slot.notes}</p>
        ) : null}
        {showActions ? (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={
                !slot.assignedFreelancerId || slot.status === "completed"
              }
              onClick={() => onComplete?.(slot.id)}
              size="sm"
              variant="bronze"
            >
              <CheckCircle2 size={16} />
              Marcar concluída
            </Button>
            <Button
              disabled={slot.status !== "completed"}
              onClick={() => onReopen?.(slot.id)}
              size="sm"
              variant="secondary"
            >
              <RotateCcw size={16} />
              Reabrir
            </Button>
            <Button
              disabled={slot.status === "cancelled"}
              onClick={() => onCancel?.(slot.id)}
              size="sm"
              variant="danger"
            >
              <XCircle size={16} />
              Cancelar vaga
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
