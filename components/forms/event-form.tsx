"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { FreelancerSelector } from "@/components/app/freelancer-selector";
import { MoneyInput } from "@/components/app/money-input";
import { eventFormSchema, type EventFormValues } from "@/lib/domain/schemas";
import type { GoogleCalendarEvent, Profile } from "@/lib/domain/types";
import { formatDateTimeRange } from "@/lib/dates";

export function EventForm({
  freelancers,
  importedEvent,
  onSubmit,
  onOpenGoogle,
}: {
  freelancers: Profile[];
  importedEvent?: GoogleCalendarEvent | null;
  onSubmit: (
    values: EventFormValues,
    publishAction: "draft" | "open" | "assign",
  ) => void;
  onOpenGoogle?: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: importedEvent?.title ?? "Novo evento Traços",
      serviceName: "",
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
      assignmentMode: "open",
      assignedFreelancerId: "",
      freelancerFee: "150,00",
      financialNotes: "",
      internalNotes: "",
      source: importedEvent ? "google_calendar" : "manual",
      googleCalendarId: importedEvent?.calendarId ?? "",
      googleEventId: importedEvent?.id ?? "",
      googleEventLink: importedEvent?.htmlLink ?? "",
    },
  });

  const allDay = useWatch({ control, name: "allDay" });
  const mode = useWatch({ control, name: "assignmentMode" });
  const assignedFreelancerId = useWatch({
    control,
    name: "assignedFreelancerId",
  });
  const freelancerFee = useWatch({ control, name: "freelancerFee" });

  function submitWithAction(action: "draft" | "open" | "assign") {
    return handleSubmit((values) => onSubmit(values, action))();
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
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Informações principais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex justify-end">
            <Button onClick={onOpenGoogle} variant="secondary">
              Importar do Google Agenda
            </Button>
          </div>
          <Field label="Nome do evento" error={errors.title?.message}>
            <Input {...register("title")} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tipo de serviço" error={errors.serviceName?.message}>
              <Input
                placeholder="Fotografia principal"
                {...register("serviceName")}
              />
            </Field>
            <Field label="Data" error={errors.date?.message}>
              <Input type="date" {...register("date")} />
            </Field>
          </div>
          <Field label="Descrição" error={errors.description?.message}>
            <Textarea {...register("description")} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-[var(--text)]">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => setValue("allDay", event.target.checked)}
            />
            Evento de dia inteiro
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Horário inicial" error={errors.startTime?.message}>
              <Input disabled={allDay} type="time" {...register("startTime")} />
            </Field>
            <Field label="Horário final" error={errors.endTime?.message}>
              <Input disabled={allDay} type="time" {...register("endTime")} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Local" error={errors.locationName?.message}>
              <Input {...register("locationName")} />
            </Field>
            <Field label="Endereço" error={errors.locationAddress?.message}>
              <Input {...register("locationAddress")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Freelancer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Forma de designação">
            <Select {...register("assignmentMode")}>
              <option value="open">Deixar aberto para aceite</option>
              <option value="direct">Designar diretamente</option>
            </Select>
          </Field>
          {mode === "direct" ? (
            <Field
              label="Freelancer ativo"
              error={errors.assignedFreelancerId?.message}
            >
              <FreelancerSelector
                freelancers={freelancers}
                value={assignedFreelancerId}
                onChange={(value) => setValue("assignedFreelancerId", value)}
              />
            </Field>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Valor combinado" error={errors.freelancerFee?.message}>
            <MoneyInput
              value={freelancerFee ?? ""}
              onChange={(value) => setValue("freelancerFee", value)}
            />
          </Field>
          <Field label="Observações financeiras">
            <Textarea {...register("financialNotes")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações adicionais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Observações internas">
            <Textarea {...register("internalNotes")} />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Origem">
              <Select {...register("source")}>
                <option value="manual">Manual</option>
                <option value="google_calendar">Google Agenda</option>
              </Select>
            </Field>
            <Field label="Link do Google Agenda">
              <Input {...register("googleEventLink")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={isSubmitting}
          onClick={() => submitWithAction("draft")}
          variant="secondary"
        >
          <Save size={16} />
          Salvar rascunho
        </Button>
        <Button
          disabled={isSubmitting}
          onClick={() => submitWithAction("open")}
          variant="bronze"
        >
          <Send size={16} />
          Publicar aberto
        </Button>
        <Button
          disabled={isSubmitting}
          onClick={() => submitWithAction("assign")}
        >
          Salvar e designar
        </Button>
        <Button onClick={() => window.history.back()} variant="ghost">
          <X size={16} />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
