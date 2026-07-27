import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfessionalSlotCard } from "@/components/app/professional-slot-card";
import { EventTeamProgress } from "@/components/app/event-team-progress";
import { formatMoney } from "@/lib/domain/money";
import type {
  EventProfessionalSlot,
  EventService,
  FinancialEntry,
  Profile,
} from "@/lib/domain/types";

export function ServiceGroupCard({
  service,
  slots,
  profiles,
  entries,
  showActions,
  onComplete,
  onReopen,
  onCancel,
}: {
  service: EventService;
  slots: EventProfessionalSlot[];
  profiles: Profile[];
  entries: FinancialEntry[];
  showActions?: boolean;
  onComplete?: (slotId: string) => void;
  onReopen?: (slotId: string) => void;
  onCancel?: (slotId: string) => void;
}) {
  const activeSlots = slots.filter((slot) => slot.status !== "cancelled");
  const assigned = activeSlots.filter(
    (slot) => slot.assignedFreelancerId,
  ).length;
  const open = activeSlots.filter((slot) => slot.status === "open").length;
  const serviceTotal = activeSlots.reduce(
    (sum, slot) => sum + slot.agreedFeeCents,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-3 lg:grid-cols-[1fr_300px] lg:items-center">
          <div>
            <CardTitle>{service.serviceNameSnapshot}</CardTitle>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {service.quantityRequired} profissionais necessários - Valor
              previsto: {formatMoney(serviceTotal)}
            </p>
          </div>
          <EventTeamProgress
            assigned={assigned}
            compact
            open={open}
            total={activeSlots.length}
          />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {slots
          .sort((a, b) => a.slotNumber - b.slotNumber)
          .map((slot) => (
            <ProfessionalSlotCard
              entries={entries}
              key={slot.id}
              profiles={profiles}
              serviceName={service.serviceNameSnapshot}
              showActions={showActions}
              slot={slot}
              onCancel={onCancel}
              onComplete={onComplete}
              onReopen={onReopen}
            />
          ))}
      </CardContent>
    </Card>
  );
}
