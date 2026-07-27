import type {
  EventProfessionalSlot,
  EventRecord,
  EventService,
  FinancialEntry,
  Profile,
} from "@/lib/domain/types";
import {
  getActiveEventSlots,
  getEventTeamSummary,
  getFreelancerBalance,
  getSlotFinancialSummary,
} from "@/lib/domain/finance";

export function getAdminMetrics(
  events: EventRecord[],
  entries: FinancialEntry[],
  slots: EventProfessionalSlot[],
) {
  const summaries = events.map((event) =>
    getEventTeamSummary(event, slots, entries),
  );
  const completed = events.filter((event) => event.status === "completed");
  const generated = entries
    .filter((entry) => entry.entryType === "event_earning")
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const paid = entries
    .filter((entry) => ["payment", "advance"].includes(entry.entryType))
    .reduce((sum, entry) => sum + Math.abs(entry.amountCents), 0);
  const balances = new Map<string, number>();

  for (const entry of entries) {
    balances.set(
      entry.freelancerId,
      (balances.get(entry.freelancerId) ?? 0) + entry.amountCents,
    );
  }

  const totalDue = Array.from(balances.values())
    .filter((balance) => balance > 0)
    .reduce((sum, balance) => sum + balance, 0);
  const advances = Array.from(balances.values())
    .filter((balance) => balance < 0)
    .reduce((sum, balance) => sum + Math.abs(balance), 0);

  return {
    upcomingEvents: events.filter((event) => event.status !== "completed")
      .length,
    completedThisMonth: completed.length,
    fullyAssignedEvents: events.filter(
      (event) =>
        event.status === "fully_assigned" || event.status === "completed",
    ).length,
    incompleteEvents: events.filter(
      (event) =>
        event.status === "open" || event.status === "partially_assigned",
    ).length,
    openSlots: summaries.reduce((sum, summary) => sum + summary.openSlots, 0),
    assignedSlots: summaries.reduce(
      (sum, summary) => sum + summary.assignedSlots,
      0,
    ),
    neededProfessionals: summaries.reduce(
      (sum, summary) => sum + summary.totalSlots,
      0,
    ),
    forecastValue: summaries.reduce(
      (sum, summary) => sum + summary.totalAgreedFee,
      0,
    ),
    generatedThisMonth: generated,
    paidThisMonth: paid,
    totalDue,
    totalAdvances: advances,
    netBalance: totalDue - advances,
  };
}

export function getFreelancerMetrics(
  freelancerId: string,
  events: EventRecord[],
  entries: FinancialEntry[],
  slots: EventProfessionalSlot[],
) {
  const assignedSlots = slots.filter(
    (slot) =>
      slot.assignedFreelancerId === freelancerId && slot.status !== "cancelled",
  );
  const eventIds = new Set(assignedSlots.map((slot) => slot.eventId));
  const available = slots.filter((slot) => {
    if (slot.status !== "open" || slot.assignedFreelancerId !== null)
      return false;
    return !slots.some(
      (current) =>
        current.eventId === slot.eventId &&
        current.assignedFreelancerId === freelancerId &&
        current.status !== "cancelled",
    );
  });
  const generated = entries
    .filter(
      (entry) =>
        entry.freelancerId === freelancerId &&
        entry.entryType === "event_earning",
    )
    .reduce((sum, entry) => sum + entry.amountCents, 0);
  const paid = entries
    .filter(
      (entry) =>
        entry.freelancerId === freelancerId &&
        ["payment", "advance"].includes(entry.entryType),
    )
    .reduce((sum, entry) => sum + Math.abs(entry.amountCents), 0);

  return {
    upcomingJobs: assignedSlots.filter((slot) => slot.status === "assigned")
      .length,
    completedThisMonth: assignedSlots.filter(
      (slot) => slot.status === "completed",
    ).length,
    completedEvents: events.filter(
      (event) => eventIds.has(event.id) && event.status === "completed",
    ).length,
    generatedThisMonth: generated,
    paidThisMonth: paid,
    balance: getFreelancerBalance(entries, freelancerId),
    availableJobs: available.length,
    assignedSlots: assignedSlots.length,
  };
}

export function getFreelancerSummaries(
  profiles: Profile[],
  events: EventRecord[],
  entries: FinancialEntry[],
  slots: EventProfessionalSlot[],
) {
  return profiles
    .filter((profile) => hasRole(profile, "freelancer"))
    .map((profile) => {
      const freelancerSlots = slots.filter(
        (slot) =>
          slot.assignedFreelancerId === profile.id &&
          slot.status !== "cancelled",
      );
      const nextSlot = freelancerSlots.find(
        (slot) => slot.status === "assigned",
      );
      const nextEvent = nextSlot
        ? events.find((event) => event.id === nextSlot.eventId)
        : undefined;
      const totalGenerated = entries
        .filter(
          (entry) =>
            entry.freelancerId === profile.id &&
            entry.entryType === "event_earning",
        )
        .reduce((sum, entry) => sum + entry.amountCents, 0);
      const totalPaid = entries
        .filter(
          (entry) =>
            entry.freelancerId === profile.id &&
            ["payment", "advance"].includes(entry.entryType),
        )
        .reduce((sum, entry) => sum + Math.abs(entry.amountCents), 0);

      return {
        profile,
        nextEvent,
        nextSlot,
        completedEvents: new Set(
          freelancerSlots
            .filter((slot) => slot.status === "completed")
            .map((slot) => slot.eventId),
        ).size,
        completedSlots: freelancerSlots.filter(
          (slot) => slot.status === "completed",
        ).length,
        totalGenerated,
        totalPaid,
        balance: getFreelancerBalance(entries, profile.id),
      };
    });
}

function hasRole(profile: Profile, role: "admin" | "freelancer") {
  return profile.roles?.includes(role) ?? profile.role === role;
}

export function getServiceRevenueRows(
  services: EventService[],
  slots: EventProfessionalSlot[],
) {
  return services.map((service) => {
    const serviceSlots = slots.filter(
      (slot) =>
        slot.eventServiceId === service.id && slot.status !== "cancelled",
    );

    return {
      service,
      professionals: serviceSlots.length,
      totalAgreedFee: serviceSlots.reduce(
        (sum, slot) => sum + slot.agreedFeeCents,
        0,
      ),
    };
  });
}

export function getEventFinancialRows(
  events: EventRecord[],
  slots: EventProfessionalSlot[],
  entries: FinancialEntry[],
) {
  return events.map((event) => ({
    event,
    summary: getEventTeamSummary(event, slots, entries),
  }));
}

export function getSlotRowsForEvent(
  eventId: string,
  slots: EventProfessionalSlot[],
  entries: FinancialEntry[],
) {
  return getActiveEventSlots(slots, eventId).map((slot) =>
    getSlotFinancialSummary(slot, entries),
  );
}
