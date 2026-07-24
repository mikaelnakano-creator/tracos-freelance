import { CalendarDays, MapPin, Wallet } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EventStatusBadge } from "@/components/app/event-status-badge";
import { BalanceDisplay } from "@/components/app/balance-display";
import type { EventRecord, FinancialEntry, Profile } from "@/lib/domain/types";
import { formatDateTimeRange } from "@/lib/dates";
import { formatMoney } from "@/lib/domain/money";
import { getEventBalance, getEventPaymentTotal } from "@/lib/domain/finance";

export function EventCard({
  event,
  freelancer,
  entries,
  role,
  onAccept,
  onComplete,
  onCancel,
}: {
  event: EventRecord;
  freelancer?: Profile;
  entries: FinancialEntry[];
  role: "admin" | "freelancer";
  onAccept?: (eventId: string) => void;
  onComplete?: (eventId: string) => void;
  onCancel?: (eventId: string) => void;
}) {
  const paid = getEventPaymentTotal(entries, event.id);
  const balance = getEventBalance(event, entries);

  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-4 p-4 md:grid-cols-[1.2fr_0.8fr_auto] md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <EventStatusBadge status={event.status} />
            <span className="text-xs font-bold uppercase text-[var(--muted)]">
              {event.source === "google_calendar" ? "Google Agenda" : "Manual"}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-black text-[var(--text)]">
            {event.title}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {event.serviceName}
          </p>
          <div className="mt-4 grid gap-2 text-sm text-[var(--muted)]">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={16} />
              {formatDateTimeRange(
                event.startsAt,
                event.allDay ? null : event.endsAt,
              )}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin size={16} />
              {event.locationName}
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="rounded-md bg-[var(--surface-muted)] p-3">
            <span className="text-xs font-bold uppercase text-[var(--muted)]">
              Freelancer
            </span>
            <strong className="mt-1 block text-sm text-[var(--text)]">
              {freelancer?.fullName ?? "Aberto para aceite"}
            </strong>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-white p-3 ring-1 ring-[var(--border)]">
              <span className="text-xs text-[var(--muted)]">Combinado</span>
              <strong className="block text-sm text-[var(--text)]">
                {formatMoney(event.freelancerFeeCents)}
              </strong>
            </div>
            <div className="rounded-md bg-white p-3 ring-1 ring-[var(--border)]">
              <span className="text-xs text-[var(--muted)]">Pago</span>
              <strong className="block text-sm text-[var(--text)]">
                {formatMoney(paid)}
              </strong>
            </div>
          </div>
          <BalanceDisplay cents={balance} compact />
        </div>

        <div className="flex flex-wrap gap-2 md:justify-end">
          <LinkButton
            href={`/admin/eventos/${event.id}`}
            variant="secondary"
            size="sm"
          >
            Detalhes
          </LinkButton>
          {role === "admin" &&
          event.status !== "completed" &&
          event.status !== "cancelled" ? (
            <Button
              onClick={() => onComplete?.(event.id)}
              size="sm"
              variant="bronze"
            >
              <Wallet size={14} />
              Realizar
            </Button>
          ) : null}
          {role === "admin" && event.status !== "cancelled" ? (
            <Button
              onClick={() => onCancel?.(event.id)}
              size="sm"
              variant="ghost"
            >
              Cancelar
            </Button>
          ) : null}
          {role === "freelancer" && event.status === "open" ? (
            <Button
              onClick={() => onAccept?.(event.id)}
              size="sm"
              variant="bronze"
            >
              Aceitar trabalho
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
