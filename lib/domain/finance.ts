import type {
  EventAcceptance,
  EventRecord,
  FinancialEntry,
  FinancialEntryType,
  Profile,
} from "./types";

export function sumFinancialEntries(entries: FinancialEntry[]) {
  return entries.reduce((sum, entry) => sum + entry.amountCents, 0);
}

export function getFreelancerBalance(
  entries: FinancialEntry[],
  freelancerId: string,
) {
  return sumFinancialEntries(
    entries.filter((entry) => entry.freelancerId === freelancerId),
  );
}

export function getEventPaymentTotal(
  entries: FinancialEntry[],
  eventId: string,
) {
  return entries
    .filter(
      (entry) =>
        entry.eventId === eventId &&
        ["payment", "advance"].includes(entry.entryType),
    )
    .reduce((sum, entry) => sum + Math.abs(entry.amountCents), 0);
}

export function getEventBalance(event: EventRecord, entries: FinancialEntry[]) {
  return event.freelancerFeeCents - getEventPaymentTotal(entries, event.id);
}

export function createFinancialEntry(input: {
  id: string;
  organizationId: string;
  freelancerId: string;
  eventId?: string | null;
  entryType: FinancialEntryType;
  description: string;
  amountCents: number;
  effectiveDate: string;
  createdBy: string;
  createdAt: string;
  reversedEntryId?: string | null;
}): FinancialEntry {
  return {
    id: input.id,
    organizationId: input.organizationId,
    freelancerId: input.freelancerId,
    eventId: input.eventId ?? null,
    entryType: input.entryType,
    description: input.description,
    amountCents: input.amountCents,
    effectiveDate: input.effectiveDate,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    reversedEntryId: input.reversedEntryId ?? null,
  };
}

export function completeEventIdempotently(input: {
  event: EventRecord;
  entries: FinancialEntry[];
  entryId: string;
  completedAt: string;
  actorId: string;
}) {
  const { event, entries } = input;
  const existingEarning = entries.find(
    (entry) =>
      entry.eventId === event.id && entry.entryType === "event_earning",
  );

  const completedEvent: EventRecord = {
    ...event,
    status: "completed",
    completedAt: input.completedAt,
    updatedAt: input.completedAt,
  };

  if (!event.assignedFreelancerId || existingEarning) {
    return { event: completedEvent, entries };
  }

  const earning = createFinancialEntry({
    id: input.entryId,
    organizationId: event.organizationId,
    freelancerId: event.assignedFreelancerId,
    eventId: event.id,
    entryType: "event_earning",
    description: `Evento concluído: ${event.title}`,
    amountCents: event.freelancerFeeCents,
    effectiveDate: input.completedAt.slice(0, 10),
    createdBy: input.actorId,
    createdAt: input.completedAt,
  });

  return { event: completedEvent, entries: [...entries, earning] };
}

export function reverseEventCompletion(input: {
  event: EventRecord;
  entries: FinancialEntry[];
  reversalId: string;
  actorId: string;
  createdAt: string;
}) {
  const original = input.entries.find(
    (entry) =>
      entry.eventId === input.event.id && entry.entryType === "event_earning",
  );

  const event: EventRecord = {
    ...input.event,
    status: "assigned",
    completedAt: null,
    updatedAt: input.createdAt,
  };

  if (!original) return { event, entries: input.entries };

  const alreadyReversed = input.entries.some(
    (entry) => entry.reversedEntryId === original.id,
  );
  if (alreadyReversed) return { event, entries: input.entries };

  const reversal = createFinancialEntry({
    id: input.reversalId,
    organizationId: original.organizationId,
    freelancerId: original.freelancerId,
    eventId: original.eventId,
    entryType: "reversal",
    description: `Reversão da conclusão: ${input.event.title}`,
    amountCents: -original.amountCents,
    effectiveDate: input.createdAt.slice(0, 10),
    createdBy: input.actorId,
    createdAt: input.createdAt,
    reversedEntryId: original.id,
  });

  return { event, entries: [...input.entries, reversal] };
}

export function adjustCompletedEventFee(input: {
  event: EventRecord;
  entries: FinancialEntry[];
  newFeeCents: number;
  adjustmentId: string;
  actorId: string;
  createdAt: string;
}) {
  const difference = input.newFeeCents - input.event.freelancerFeeCents;
  const event: EventRecord = {
    ...input.event,
    freelancerFeeCents: input.newFeeCents,
    updatedAt: input.createdAt,
  };

  if (
    input.event.status !== "completed" ||
    difference === 0 ||
    !input.event.assignedFreelancerId
  ) {
    return { event, entries: input.entries };
  }

  const adjustment = createFinancialEntry({
    id: input.adjustmentId,
    organizationId: input.event.organizationId,
    freelancerId: input.event.assignedFreelancerId,
    eventId: input.event.id,
    entryType: difference > 0 ? "positive_adjustment" : "negative_adjustment",
    description: `Diferença no valor do evento: ${input.event.title}`,
    amountCents: difference,
    effectiveDate: input.createdAt.slice(0, 10),
    createdBy: input.actorId,
    createdAt: input.createdAt,
  });

  return { event, entries: [...input.entries, adjustment] };
}

export function registerPayment(input: {
  id: string;
  organizationId: string;
  freelancerId: string;
  eventId?: string | null;
  amountCents: number;
  entryType: "payment" | "advance";
  description: string;
  effectiveDate: string;
  createdBy: string;
  createdAt: string;
}) {
  return createFinancialEntry({
    ...input,
    amountCents: -Math.abs(input.amountCents),
  });
}

export function acceptOpenEvent(input: {
  event: EventRecord;
  freelancer: Profile;
  existingAcceptances: EventAcceptance[];
  acceptanceId: string;
  createdAt: string;
}) {
  if (input.freelancer.role !== "freelancer" || !input.freelancer.isActive) {
    return { ok: false as const, message: "Freelancer inativo ou inválido." };
  }

  if (input.freelancer.organizationId !== input.event.organizationId) {
    return { ok: false as const, message: "Organização inválida." };
  }

  if (
    input.event.status !== "open" ||
    input.event.assignedFreelancerId !== null
  ) {
    return {
      ok: false as const,
      message: "Este trabalho acabou de ser aceito por outro freelancer.",
    };
  }

  const event: EventRecord = {
    ...input.event,
    status: "assigned",
    assignmentMode: "direct",
    assignedFreelancerId: input.freelancer.id,
    updatedAt: input.createdAt,
  };

  const acceptance: EventAcceptance = {
    id: input.acceptanceId,
    organizationId: input.event.organizationId,
    eventId: input.event.id,
    freelancerId: input.freelancer.id,
    status: "accepted",
    createdAt: input.createdAt,
  };

  return {
    ok: true as const,
    event,
    acceptances: [...input.existingAcceptances, acceptance],
  };
}

export function canProfileReadEvent(profile: Profile, event: EventRecord) {
  if (profile.organizationId !== event.organizationId || !profile.isActive) {
    return false;
  }
  if (profile.role === "admin") return true;
  return event.status === "open" || event.assignedFreelancerId === profile.id;
}

export function canProfileReadFinancialEntry(
  profile: Profile,
  entry: FinancialEntry,
) {
  if (profile.organizationId !== entry.organizationId || !profile.isActive) {
    return false;
  }
  return profile.role === "admin" || entry.freelancerId === profile.id;
}
