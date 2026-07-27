"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { MoneyInput } from "@/components/app/money-input";
import {
  financialEntrySchema,
  type FinancialEntryFormValues,
} from "@/lib/domain/schemas";
import type {
  EventProfessionalSlot,
  EventRecord,
  EventService,
  Profile,
} from "@/lib/domain/types";
import { formatMoney, parseMoneyToCents } from "@/lib/domain/money";

export function FinancialEntryForm({
  freelancers,
  events,
  eventServices,
  slots,
  balancesByFreelancer,
  onSubmit,
}: {
  freelancers: Profile[];
  events: EventRecord[];
  eventServices: EventService[];
  slots: EventProfessionalSlot[];
  balancesByFreelancer: Record<string, number>;
  onSubmit: (values: FinancialEntryFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FinancialEntryFormValues>({
    resolver: zodResolver(financialEntrySchema),
    defaultValues: {
      freelancerId: freelancers[0]?.id ?? "",
      entryType: "payment",
      amount: "100,00",
      effectiveDate: "2026-07-24",
      description: "Pagamento via Pix",
    },
  });

  const type = useWatch({ control, name: "entryType" });
  const freelancerId = useWatch({ control, name: "freelancerId" });
  const eventId = useWatch({ control, name: "eventId" });
  const amountValue = useWatch({ control, name: "amount" });
  const availableSlots = slots.filter(
    (slot) =>
      slot.assignedFreelancerId === freelancerId &&
      (!eventId || slot.eventId === eventId),
  );
  const currentBalance = balancesByFreelancer[freelancerId] ?? 0;
  const amount = parseMoneyToCents(amountValue ?? "0");
  const impact = ["payment", "advance", "negative_adjustment"].includes(type)
    ? -Math.abs(amount)
    : Math.abs(amount);
  const nextBalance = currentBalance + impact;

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      <Field label="Freelancer" error={errors.freelancerId?.message}>
        <Select {...register("freelancerId")}>
          {freelancers.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.fullName}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Evento opcional" error={errors.eventId?.message}>
        <Select
          {...register("eventId")}
          onChange={(event) => {
            setValue("eventId", event.target.value);
            setValue("eventProfessionalSlotId", "");
          }}
        >
          <option value="">Pagamento geral</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Vaga ou serviço opcional"
        error={errors.eventProfessionalSlotId?.message}
      >
        <Select {...register("eventProfessionalSlotId")}>
          <option value="">Sem vínculo com vaga específica</option>
          {availableSlots.map((slot) => {
            const service = eventServices.find(
              (item) => item.id === slot.eventServiceId,
            );
            const event = events.find((item) => item.id === slot.eventId);
            return (
              <option key={slot.id} value={slot.id}>
                {event?.title ?? "Evento"} -{" "}
                {service?.serviceNameSnapshot ?? "Serviço"} - Vaga{" "}
                {slot.slotNumber}
              </option>
            );
          })}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" error={errors.entryType?.message}>
          <Select {...register("entryType")}>
            <option value="payment">Pagamento</option>
            <option value="advance">Adiantamento</option>
            <option value="positive_adjustment">Ajuste positivo</option>
            <option value="negative_adjustment">Ajuste negativo</option>
            <option value="reversal">Estorno</option>
          </Select>
        </Field>
        <Field label="Data" error={errors.effectiveDate?.message}>
          <Input type="date" {...register("effectiveDate")} />
        </Field>
      </div>

      <Field label="Valor" error={errors.amount?.message}>
        <MoneyInput
          value={amountValue ?? ""}
          onChange={(value) => setValue("amount", value)}
        />
      </Field>

      <Field label="Descrição" error={errors.description?.message}>
        <Input {...register("description")} />
      </Field>

      <div className="grid gap-2 rounded-lg bg-[var(--surface-muted)] p-4 text-sm">
        <div className="flex justify-between gap-3">
          <span>Saldo anterior</span>
          <strong>{formatMoney(currentBalance)}</strong>
        </div>
        <div className="flex justify-between gap-3">
          <span>Impacto do lançamento</span>
          <strong>{formatMoney(impact)}</strong>
        </div>
        <div className="flex justify-between gap-3 border-t border-[var(--border)] pt-2">
          <span>Novo saldo</span>
          <strong>{formatMoney(nextBalance)}</strong>
        </div>
      </div>

      <Button disabled={isSubmitting} type="submit" variant="bronze">
        Confirmar operação
        <ArrowRight size={16} />
      </Button>
    </form>
  );
}
