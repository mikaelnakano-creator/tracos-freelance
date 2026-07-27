import type {
  EventAcceptance,
  EventProfessionalSlot,
  EventRecord,
  EventService,
  FinancialEntry,
  FinancialEntryType,
  Profile,
} from "./types";

export const MAX_EVENT_PROFESSIONALS = 5;

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

export function getActiveSlots(slots: EventProfessionalSlot[]) {
  return slots.filter((slot) => slot.status !== "cancelled");
}

export function getEventSlots(slots: EventProfessionalSlot[], eventId: string) {
  return slots.filter((slot) => slot.eventId === eventId);
}

export function getActiveEventSlots(
  slots: EventProfessionalSlot[],
  eventId: string,
) {
  return getActiveSlots(getEventSlots(slots, eventId));
}

export function getTotalProfessionals(slots: EventProfessionalSlot[]) {
  return getActiveSlots(slots).length;
}

export function assertProfessionalLimit(slots: EventProfessionalSlot[]) {
  const total = getTotalProfessionals(slots);
  if (total < 1) {
    throw new Error("O evento precisa ter pelo menos 1 profissional.");
  }
  if (total > MAX_EVENT_PROFESSIONALS) {
    throw new Error("Este evento pode ter no máximo 5 profissionais.");
  }
}

export function hasFreelancerInEvent(input: {
  slots: EventProfessionalSlot[];
  eventId: string;
  freelancerId: string;
  ignoreSlotId?: string;
}) {
  return input.slots.some(
    (slot) =>
      slot.eventId === input.eventId &&
      slot.id !== input.ignoreSlotId &&
      slot.status !== "cancelled" &&
      slot.assignedFreelancerId === input.freelancerId,
  );
}

export function getEventTeamSummary(
  event: EventRecord,
  slots: EventProfessionalSlot[],
  entries: FinancialEntry[],
) {
  const eventSlots = getEventSlots(slots, event.id);
  const activeSlots = getActiveSlots(eventSlots);
  const totalSlots = activeSlots.length;
  const assignedSlots = activeSlots.filter(
    (slot) => slot.assignedFreelancerId !== null,
  ).length;
  const openSlots = activeSlots.filter(
    (slot) => slot.status === "open" && slot.assignedFreelancerId === null,
  ).length;
  const draftSlots = activeSlots.filter(
    (slot) => slot.status === "draft",
  ).length;
  const completedSlots = activeSlots.filter(
    (slot) => slot.status === "completed",
  ).length;
  const cancelledSlots = eventSlots.filter(
    (slot) => slot.status === "cancelled",
  ).length;
  const totalAgreedFee = activeSlots.reduce(
    (sum, slot) => sum + slot.agreedFeeCents,
    0,
  );
  const eventPayments = entries.filter(
    (entry) =>
      entry.eventId === event.id &&
      ["payment", "advance"].includes(entry.entryType),
  );
  const totalPaid = eventPayments.reduce(
    (sum, entry) => sum + Math.abs(entry.amountCents),
    0,
  );

  return {
    eventId: event.id,
    totalSlots,
    assignedSlots,
    openSlots,
    draftSlots,
    completedSlots,
    cancelledSlots,
    totalAgreedFee,
    totalPaid,
    totalBalance: totalAgreedFee - totalPaid,
    isComplete: totalSlots > 0 && assignedSlots === totalSlots,
  };
}

export function recalculateEventStatus(
  event: EventRecord,
  slots: EventProfessionalSlot[],
): EventRecord["status"] {
  if (event.status === "cancelled") return "cancelled";

  const activeSlots = getActiveEventSlots(slots, event.id);
  if (activeSlots.length === 0) return "draft";

  const completed = activeSlots.filter((slot) => slot.status === "completed");
  const assigned = activeSlots.filter((slot) => slot.assignedFreelancerId);
  const openOrDraft = activeSlots.filter(
    (slot) => slot.status === "open" || slot.status === "draft",
  );

  if (completed.length === activeSlots.length) return "completed";
  if (assigned.length === activeSlots.length && openOrDraft.length === 0) {
    return "fully_assigned";
  }
  if (assigned.length > 0) return "partially_assigned";
  if (activeSlots.some((slot) => slot.status === "open")) return "open";
  return "draft";
}

export function createFinancialEntry(input: {
  id: string;
  organizationId: string;
  freelancerId: string;
  eventId?: string | null;
  eventProfessionalSlotId?: string | null;
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
    eventProfessionalSlotId: input.eventProfessionalSlotId ?? null,
    entryType: input.entryType,
    description: input.description,
    amountCents: input.amountCents,
    effectiveDate: input.effectiveDate,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    reversedEntryId: input.reversedEntryId ?? null,
  };
}

export function getSlotEntries(entries: FinancialEntry[], slotId: string) {
  return entries.filter((entry) => entry.eventProfessionalSlotId === slotId);
}

export function getSlotPaymentTotal(entries: FinancialEntry[], slotId: string) {
  return getSlotEntries(entries, slotId)
    .filter((entry) => ["payment", "advance"].includes(entry.entryType))
    .reduce((sum, entry) => sum + Math.abs(entry.amountCents), 0);
}

export function getSlotEarnedTotal(entries: FinancialEntry[], slotId: string) {
  return getSlotEntries(entries, slotId)
    .filter((entry) => entry.entryType === "event_earning")
    .reduce((sum, entry) => sum + entry.amountCents, 0);
}

export function getSlotFinancialSummary(
  slot: EventProfessionalSlot,
  entries: FinancialEntry[],
) {
  const slotEntries = getSlotEntries(entries, slot.id);
  const paid = getSlotPaymentTotal(entries, slot.id);
  const earned = getSlotEarnedTotal(entries, slot.id);
  const ledgerBalance = sumFinancialEntries(slotEntries);

  return {
    slot,
    agreedFee: slot.agreedFeeCents,
    earned,
    paid,
    balance: earned > 0 ? ledgerBalance : slot.agreedFeeCents - paid,
  };
}

export function registerPayment(input: {
  id: string;
  organizationId: string;
  freelancerId: string;
  eventId?: string | null;
  eventProfessionalSlotId?: string | null;
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

export function acceptOpenEventSlot(input: {
  event: EventRecord;
  slot: EventProfessionalSlot;
  freelancer: Profile;
  allSlots: EventProfessionalSlot[];
  existingAcceptances: EventAcceptance[];
  acceptanceId: string;
  createdAt: string;
}) {
  if (input.freelancer.role !== "freelancer" || !input.freelancer.isActive) {
    return { ok: false as const, message: "Freelancer inativo ou inválido." };
  }

  if (input.freelancer.organizationId !== input.slot.organizationId) {
    return { ok: false as const, message: "Organização inválida." };
  }

  if (
    input.slot.status !== "open" ||
    input.slot.assignedFreelancerId !== null
  ) {
    return {
      ok: false as const,
      message: "Esta vaga acabou de ser aceita por outro freelancer.",
    };
  }

  if (
    hasFreelancerInEvent({
      slots: input.allSlots,
      eventId: input.slot.eventId,
      freelancerId: input.freelancer.id,
      ignoreSlotId: input.slot.id,
    })
  ) {
    return {
      ok: false as const,
      message: "Você já faz parte da equipe deste evento.",
    };
  }

  const slot: EventProfessionalSlot = {
    ...input.slot,
    assignmentMode: "direct",
    assignedFreelancerId: input.freelancer.id,
    status: "assigned",
    acceptedAt: input.createdAt,
    updatedAt: input.createdAt,
  };

  const slots = input.allSlots.map((current) =>
    current.id === slot.id ? slot : current,
  );

  const event: EventRecord = {
    ...input.event,
    status: recalculateEventStatus(input.event, slots),
    updatedAt: input.createdAt,
  };

  const acceptance: EventAcceptance = {
    id: input.acceptanceId,
    organizationId: slot.organizationId,
    eventId: slot.eventId,
    eventProfessionalSlotId: slot.id,
    freelancerId: input.freelancer.id,
    status: "accepted",
    createdAt: input.createdAt,
  };

  return {
    ok: true as const,
    event,
    slot,
    slots,
    acceptances: [...input.existingAcceptances, acceptance],
  };
}

export function assignFreelancerToSlot(input: {
  event: EventRecord;
  slot: EventProfessionalSlot;
  freelancerId: string | null;
  allSlots: EventProfessionalSlot[];
  assignedAt: string;
}) {
  if (
    input.freelancerId &&
    hasFreelancerInEvent({
      slots: input.allSlots,
      eventId: input.slot.eventId,
      freelancerId: input.freelancerId,
      ignoreSlotId: input.slot.id,
    })
  ) {
    return {
      ok: false as const,
      message:
        "Este freelancer já está designado para outra função neste evento.",
    };
  }

  const slot: EventProfessionalSlot = {
    ...input.slot,
    assignmentMode: input.freelancerId ? "direct" : "open",
    assignedFreelancerId: input.freelancerId,
    status: input.freelancerId ? "assigned" : "open",
    acceptedAt: input.freelancerId ? input.assignedAt : null,
    updatedAt: input.assignedAt,
  };
  const slots = input.allSlots.map((current) =>
    current.id === slot.id ? slot : current,
  );

  return {
    ok: true as const,
    event: {
      ...input.event,
      status: recalculateEventStatus(input.event, slots),
      updatedAt: input.assignedAt,
    },
    slot,
    slots,
  };
}

export function completeSlotIdempotently(input: {
  event: EventRecord;
  slot: EventProfessionalSlot;
  allSlots: EventProfessionalSlot[];
  entries: FinancialEntry[];
  entryId: string;
  completedAt: string;
  actorId: string;
  serviceName: string;
}) {
  const slot: EventProfessionalSlot = {
    ...input.slot,
    status: "completed",
    completedAt: input.completedAt,
    updatedAt: input.completedAt,
  };
  const slots = input.allSlots.map((current) =>
    current.id === slot.id ? slot : current,
  );
  const event: EventRecord = {
    ...input.event,
    status: recalculateEventStatus(input.event, slots),
    completedAt:
      recalculateEventStatus(input.event, slots) === "completed"
        ? input.completedAt
        : input.event.completedAt,
    updatedAt: input.completedAt,
  };

  const existingEarning = input.entries.find(
    (entry) =>
      entry.eventProfessionalSlotId === slot.id &&
      entry.entryType === "event_earning",
  );

  if (!slot.assignedFreelancerId || existingEarning) {
    return { event, slot, slots, entries: input.entries };
  }

  const earning = createFinancialEntry({
    id: input.entryId,
    organizationId: slot.organizationId,
    freelancerId: slot.assignedFreelancerId,
    eventId: slot.eventId,
    eventProfessionalSlotId: slot.id,
    entryType: "event_earning",
    description: `${input.serviceName}: ${input.event.title}`,
    amountCents: slot.agreedFeeCents,
    effectiveDate: input.completedAt.slice(0, 10),
    createdBy: input.actorId,
    createdAt: input.completedAt,
  });

  return { event, slot, slots, entries: [...input.entries, earning] };
}

export function completeAllAssignedSlots(input: {
  event: EventRecord;
  slots: EventProfessionalSlot[];
  services: EventService[];
  entries: FinancialEntry[];
  idFactory: (prefix: string) => string;
  completedAt: string;
  actorId: string;
}) {
  let event = input.event;
  let slots = input.slots;
  let entries = input.entries;

  for (const slot of getActiveEventSlots(slots, input.event.id)) {
    if (!slot.assignedFreelancerId || slot.status === "completed") continue;
    const service = input.services.find(
      (item) => item.id === slot.eventServiceId,
    );
    const result = completeSlotIdempotently({
      event,
      slot,
      allSlots: slots,
      entries,
      entryId: input.idFactory("entry"),
      completedAt: input.completedAt,
      actorId: input.actorId,
      serviceName: service?.serviceNameSnapshot ?? "Serviço",
    });
    event = result.event;
    slots = result.slots;
    entries = result.entries;
  }

  return { event, slots, entries };
}

export function reopenSlot(input: {
  event: EventRecord;
  slot: EventProfessionalSlot;
  allSlots: EventProfessionalSlot[];
  reopenedAt: string;
}) {
  const slot: EventProfessionalSlot = {
    ...input.slot,
    status: input.slot.assignedFreelancerId ? "assigned" : "open",
    completedAt: null,
    updatedAt: input.reopenedAt,
  };
  const slots = input.allSlots.map((current) =>
    current.id === slot.id ? slot : current,
  );
  return {
    event: {
      ...input.event,
      status: recalculateEventStatus(input.event, slots),
      completedAt: null,
      updatedAt: input.reopenedAt,
    },
    slot,
    slots,
  };
}

export function cancelSlot(input: {
  event: EventRecord;
  slot: EventProfessionalSlot;
  allSlots: EventProfessionalSlot[];
  cancelledAt: string;
  reason: string;
}) {
  const slot: EventProfessionalSlot = {
    ...input.slot,
    status: "cancelled",
    cancelledAt: input.cancelledAt,
    cancellationReason: input.reason,
    updatedAt: input.cancelledAt,
  };
  const slots = input.allSlots.map((current) =>
    current.id === slot.id ? slot : current,
  );
  return {
    event: {
      ...input.event,
      status: recalculateEventStatus(input.event, slots),
      updatedAt: input.cancelledAt,
    },
    slot,
    slots,
  };
}

export function reduceServiceQuantity(input: {
  eventService: EventService;
  allSlots: EventProfessionalSlot[];
  nextQuantity: number;
}) {
  const serviceSlots = input.allSlots
    .filter((slot) => slot.eventServiceId === input.eventService.id)
    .sort((a, b) => a.slotNumber - b.slotNumber);
  const preserved = serviceSlots.filter(
    (slot) => slot.slotNumber <= input.nextQuantity,
  );
  const overflow = serviceSlots.filter(
    (slot) => slot.slotNumber > input.nextQuantity,
  );
  const removable = overflow.filter(
    (slot) => !slot.assignedFreelancerId && slot.status !== "completed",
  );
  const cancellable = overflow.filter(
    (slot) => slot.assignedFreelancerId || slot.status === "completed",
  );

  return {
    preserved,
    removable,
    cancellable,
    message:
      cancellable.length > 0
        ? "Esta vaga possui um profissional ou movimentação financeira. Ela será cancelada e permanecerá no histórico."
        : null,
  };
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
    eventProfessionalSlotId: null,
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

export function canProfileReadEvent(
  profile: Profile,
  event: EventRecord,
  slots: EventProfessionalSlot[] = [],
) {
  if (profile.organizationId !== event.organizationId || !profile.isActive) {
    return false;
  }
  if (profile.role === "admin") return true;
  return getEventSlots(slots, event.id).some(
    (slot) =>
      slot.status === "open" || slot.assignedFreelancerId === profile.id,
  );
}

export function canProfileReadSlot(
  profile: Profile,
  slot: EventProfessionalSlot,
) {
  if (profile.organizationId !== slot.organizationId || !profile.isActive) {
    return false;
  }
  if (profile.role === "admin") return true;
  return slot.status === "open" || slot.assignedFreelancerId === profile.id;
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
