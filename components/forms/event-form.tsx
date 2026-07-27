"use client";

import { useMemo, useState } from "react";
import { Save, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";
import { EventServicesBuilder } from "@/components/app/event-services-builder";
import { eventFormSchema, type EventFormValues } from "@/lib/domain/schemas";
import type {
  GoogleCalendarEvent,
  Profile,
  ServiceRecord,
} from "@/lib/domain/types";
import { formatDateTimeRange } from "@/lib/dates";

function defaultValues(
  services: ServiceRecord[],
  importedEvent?: GoogleCalendarEvent | null,
): EventFormValues {
  const firstService =
    services.find((service) => service.isActive) ?? services[0];
  return {
    title: importedEvent?.title ?? "Novo evento Traços",
    serviceName: firstService?.name ?? "",
    description: importedEvent?.description ?? "",
    date: importedEvent?.startsAt.slice(0, 10) ?? "2026-08-01",
    startTime: importedEvent?.allDay
      ? ""
      : (importedEvent?.startsAt.slice(11, 16) ?? "14:00"),
    endTime: importedEvent?.allDay
      ? ""
      : (importedEvent?.endsAt?.slice(11, 16) ?? "18:00"),
    allDay: importedEvent?.allDay ?? false,
    locationName: importedEvent?.location ?? "",
    locationAddress: importedEvent?.location ?? "",
    generalNotes: "",
    assignmentMode: "open",
    assignedFreelancerId: "",
    freelancerFee: "",
    financialNotes: "",
    internalNotes: "",
    source: importedEvent ? "google_calendar" : "manual",
    googleCalendarId: importedEvent?.calendarId ?? "",
    googleEventId: importedEvent?.id ?? "",
    googleEventLink: importedEvent?.htmlLink ?? "",
    services: firstService
      ? [
          {
            draftId: `event-service-${firstService.id}`,
            serviceId: firstService.id,
            serviceNameSnapshot: firstService.name,
            quantityRequired: firstService.defaultProfessionals,
            notes: "",
            slots: Array.from(
              { length: firstService.defaultProfessionals },
              (_, index) => ({
                draftId: `slot-${firstService.id}-${index + 1}`,
                slotNumber: index + 1,
                assignmentMode: "open",
                assignedFreelancerId: "",
                agreedFee: String(
                  ((firstService.defaultFeeCents ?? 15000) / 100).toFixed(2),
                ).replace(".", ","),
                notes: "",
              }),
            ),
          },
        ]
      : [],
  };
}

type EventFormProps = {
  freelancers: Profile[];
  services: ServiceRecord[];
  importedEvent?: GoogleCalendarEvent | null;
  onSubmit: (
    values: EventFormValues,
    publishAction: "draft" | "open" | "assign",
  ) => void;
  onOpenGoogle?: () => void;
};

export function EventForm(props: EventFormProps) {
  const { services, importedEvent } = props;
  const initialValues = useMemo(
    () => defaultValues(services, importedEvent),
    [services, importedEvent],
  );
  const formKey = [
    importedEvent?.calendarId ?? "manual",
    importedEvent?.id ?? "new",
    services.map((service) => service.id).join(","),
  ].join(":");

  return (
    <EventFormFields key={formKey} {...props} initialValues={initialValues} />
  );
}

function EventFormFields({
  freelancers,
  services,
  importedEvent,
  onSubmit,
  onOpenGoogle,
  initialValues,
}: EventFormProps & { initialValues: EventFormValues }) {
  const [values, setValues] = useState<EventFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);

  const totalProfessionals = values.services.reduce(
    (sum, service) => sum + service.quantityRequired,
    0,
  );

  function update<K extends keyof EventFormValues>(
    key: K,
    value: EventFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submitWithAction(action: "draft" | "open" | "assign") {
    const result = eventFormSchema.safeParse(values);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Revise os dados do evento.");
      return;
    }
    setError(null);
    onSubmit(result.data, action);
  }

  return (
    <div className="grid gap-5">
      {importedEvent ? (
        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-black uppercase text-[var(--brand)]">
              Prévia importada do Google Agenda
            </span>
            <strong className="mt-2 block text-[var(--text)]">
              {importedEvent.title}
            </strong>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatDateTimeRange(
                importedEvent.startsAt,
                importedEvent.endsAt,
              )}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Depois de importar, defina obrigatoriamente os serviços, vagas,
              freelancers e valores.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-[var(--danger)] bg-[#fff4f2] p-3 text-sm font-semibold text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Etapa 1 - Informações do evento</CardTitle>
            <Button onClick={onOpenGoogle} variant="secondary">
              Importar do Google Agenda
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Nome do evento">
            <Input
              value={values.title}
              onChange={(event) => update("title", event.target.value)}
            />
          </Field>
          <Field label="Descrição">
            <Textarea
              value={values.description ?? ""}
              onChange={(event) => update("description", event.target.value)}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Data">
              <Input
                type="date"
                value={values.date}
                onChange={(event) => update("date", event.target.value)}
              />
            </Field>
            <Field label="Horário inicial">
              <Input
                disabled={values.allDay}
                type="time"
                value={values.startTime ?? ""}
                onChange={(event) => update("startTime", event.target.value)}
              />
            </Field>
            <Field label="Horário final">
              <Input
                disabled={values.allDay}
                type="time"
                value={values.endTime ?? ""}
                onChange={(event) => update("endTime", event.target.value)}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
            <input
              checked={values.allDay}
              type="checkbox"
              onChange={(event) => update("allDay", event.target.checked)}
            />
            Evento de dia inteiro
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Local">
              <Input
                value={values.locationName}
                onChange={(event) => update("locationName", event.target.value)}
              />
            </Field>
            <Field label="Endereço">
              <Input
                value={values.locationAddress ?? ""}
                onChange={(event) =>
                  update("locationAddress", event.target.value)
                }
              />
            </Field>
          </div>
          <Field label="Observações gerais">
            <Textarea
              value={values.generalNotes ?? ""}
              onChange={(event) => update("generalNotes", event.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <EventServicesBuilder
        error={
          totalProfessionals > 5
            ? "Este evento pode ter no máximo 5 profissionais."
            : undefined
        }
        freelancers={freelancers}
        services={services}
        value={values.services}
        onChange={(eventServices) => update("services", eventServices)}
      />

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={() => submitWithAction("draft")} variant="secondary">
          <Save size={16} />
          Salvar rascunho
        </Button>
        <Button onClick={() => submitWithAction("open")} variant="bronze">
          <Send size={16} />
          Publicar vagas
        </Button>
        <Button onClick={() => submitWithAction("assign")}>
          Salvar equipe
        </Button>
        <Button onClick={() => window.history.back()} variant="ghost">
          <X size={16} />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
