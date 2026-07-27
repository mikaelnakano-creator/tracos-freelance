import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SlotStatusBadge } from "@/components/app/slot-status-badge";
import { formatDateTimeRange } from "@/lib/dates";
import { formatMoney } from "@/lib/domain/money";
import type {
  EventProfessionalSlot,
  EventRecord,
  EventService,
} from "@/lib/domain/types";

export function OpenSlotCard({
  event,
  service,
  slot,
  onAccept,
}: {
  event: EventRecord;
  service: EventService;
  slot: EventProfessionalSlot;
  onAccept?: (slotId: string) => void;
}) {
  return (
    <Card>
      <CardContent className="grid gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <strong className="block text-[var(--text)]">{event.title}</strong>
            <span className="text-sm text-[var(--muted)]">
              Serviço: {service.serviceNameSnapshot} - Vaga {slot.slotNumber} de{" "}
              {service.quantityRequired}
            </span>
          </div>
          <SlotStatusBadge status={slot.status} />
        </div>
        <div className="grid gap-1 text-sm text-[var(--muted)]">
          <span>{formatDateTimeRange(event.startsAt, event.endsAt)}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} />
            {event.locationName}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <strong className="text-lg text-[var(--text)]">
            {formatMoney(slot.agreedFeeCents)}
          </strong>
          <Button onClick={() => onAccept?.(slot.id)} variant="bronze">
            Aceitar esta vaga
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
