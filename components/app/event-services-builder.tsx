"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import { ProfessionalQuantitySelector } from "@/components/app/professional-quantity-selector";
import { ProfessionalSlotForm } from "@/components/app/professional-slot-form";
import { ServiceSelector } from "@/components/app/service-selector";
import type {
  EventServiceFormValues,
  SlotFormValues,
} from "@/lib/domain/schemas";
import { MAX_EVENT_PROFESSIONALS } from "@/lib/domain/finance";
import { centsToDatabaseNumeric } from "@/lib/domain/money";
import type { Profile, ServiceRecord } from "@/lib/domain/types";

function makeDraftId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeSlot(
  slotNumber: number,
  defaultFeeCents: number | null,
): SlotFormValues {
  return {
    draftId: makeDraftId("slot"),
    slotNumber,
    assignmentMode: "open",
    assignedFreelancerId: "",
    agreedFee: centsToDatabaseNumeric(defaultFeeCents ?? 15000).replace(
      ".",
      ",",
    ),
    notes: "",
  };
}

function makeService(service: ServiceRecord): EventServiceFormValues {
  const quantityRequired = service.defaultProfessionals;
  return {
    draftId: makeDraftId("event-service"),
    serviceId: service.id,
    serviceNameSnapshot: service.name,
    quantityRequired,
    notes: "",
    slots: Array.from({ length: quantityRequired }, (_, index) =>
      makeSlot(index + 1, service.defaultFeeCents),
    ),
  };
}

export function EventServicesBuilder({
  services,
  freelancers,
  value,
  onChange,
  error,
}: {
  services: ServiceRecord[];
  freelancers: Profile[];
  value: EventServiceFormValues[];
  onChange: (value: EventServiceFormValues[]) => void;
  error?: string;
}) {
  const activeServices = services.filter((service) => service.isActive);
  const totalProfessionals = value.reduce(
    (sum, service) => sum + service.quantityRequired,
    0,
  );

  function updateService(
    draftId: string,
    updater: (service: EventServiceFormValues) => EventServiceFormValues,
  ) {
    onChange(
      value.map((service) =>
        service.draftId === draftId ? updater(service) : service,
      ),
    );
  }

  function syncQuantity(
    service: EventServiceFormValues,
    quantityRequired: number,
  ) {
    const currentSlots = service.slots.slice(0, quantityRequired);
    const selectedService = services.find(
      (item) => item.id === service.serviceId,
    );
    while (currentSlots.length < quantityRequired) {
      currentSlots.push(
        makeSlot(
          currentSlots.length + 1,
          selectedService?.defaultFeeCents ?? null,
        ),
      );
    }

    return {
      ...service,
      quantityRequired,
      slots: currentSlots.map((slot, index) => ({
        ...slot,
        slotNumber: index + 1,
      })),
    };
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Serviços e profissionais</CardTitle>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Profissionais necessários: {totalProfessionals} de{" "}
              {MAX_EVENT_PROFESSIONALS}
            </p>
          </div>
          <Button
            disabled={
              totalProfessionals >= MAX_EVENT_PROFESSIONALS ||
              activeServices.length === 0
            }
            onClick={() => onChange([...value, makeService(activeServices[0])])}
            variant="bronze"
          >
            <Plus size={16} />
            Adicionar serviço
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {error ? (
          <p className="text-sm font-semibold text-[var(--danger)]">{error}</p>
        ) : null}
        {value.map((eventService) => {
          const totalWithoutCurrent =
            totalProfessionals - eventService.quantityRequired;

          return (
            <div
              className="grid gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4"
              key={eventService.draftId}
            >
              <div className="grid gap-4 lg:grid-cols-[1.2fr_auto_auto] lg:items-start">
                <Field label="Serviço">
                  <ServiceSelector
                    services={activeServices}
                    value={eventService.serviceId}
                    onChange={(service) =>
                      updateService(eventService.draftId, (current) => ({
                        ...current,
                        serviceId: service.id,
                        serviceNameSnapshot: service.name,
                        quantityRequired: Math.min(
                          service.defaultProfessionals,
                          MAX_EVENT_PROFESSIONALS - totalWithoutCurrent,
                        ),
                        slots: Array.from(
                          {
                            length: Math.min(
                              service.defaultProfessionals,
                              MAX_EVENT_PROFESSIONALS - totalWithoutCurrent,
                            ),
                          },
                          (_, index) =>
                            makeSlot(index + 1, service.defaultFeeCents),
                        ),
                      }))
                    }
                  />
                </Field>
                <Field label="Quantidade de profissionais">
                  <ProfessionalQuantitySelector
                    totalWithoutCurrent={totalWithoutCurrent}
                    value={eventService.quantityRequired}
                    onChange={(quantity) =>
                      updateService(eventService.draftId, (current) =>
                        syncQuantity(current, quantity),
                      )
                    }
                  />
                </Field>
                <Button
                  disabled={value.length === 1}
                  onClick={() =>
                    onChange(
                      value.filter(
                        (service) => service.draftId !== eventService.draftId,
                      ),
                    )
                  }
                  variant="ghost"
                >
                  <Trash2 size={16} />
                  Remover serviço
                </Button>
              </div>
              <Field label="Observações do serviço">
                <Textarea
                  value={eventService.notes ?? ""}
                  onChange={(event) =>
                    updateService(eventService.draftId, (current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                {eventService.slots.map((slot) => (
                  <ProfessionalSlotForm
                    freelancers={freelancers}
                    key={slot.draftId}
                    serviceName={eventService.serviceNameSnapshot}
                    slot={slot}
                    onChange={(nextSlot) =>
                      updateService(eventService.draftId, (current) => ({
                        ...current,
                        slots: current.slots.map((currentSlot) =>
                          currentSlot.draftId === slot.draftId
                            ? nextSlot
                            : currentSlot,
                        ),
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
