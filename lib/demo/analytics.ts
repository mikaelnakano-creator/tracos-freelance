import type { EventRecord, FinancialEntry, Profile } from "@/lib/domain/types";
import {
  getEventBalance,
  getEventPaymentTotal,
  getFreelancerBalance,
} from "@/lib/domain/finance";

export function getAdminMetrics(
  events: EventRecord[],
  entries: FinancialEntry[],
) {
  const completed = events.filter((event) => event.status === "completed");
  const open = events.filter((event) => event.status === "open");
  const assigned = events.filter((event) => event.status === "assigned");
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
    upcomingEvents: assigned.length,
    openEvents: open.length,
    eventsWithoutFreelancer: events.filter(
      (event) => !event.assignedFreelancerId,
    ).length,
    completedThisMonth: completed.length,
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
) {
  const assigned = events.filter(
    (event) => event.assignedFreelancerId === freelancerId,
  );
  const available = events.filter((event) => event.status === "open");
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
    upcomingJobs: assigned.filter((event) => event.status === "assigned")
      .length,
    completedThisMonth: assigned.filter((event) => event.status === "completed")
      .length,
    generatedThisMonth: generated,
    paidThisMonth: paid,
    balance: getFreelancerBalance(entries, freelancerId),
    availableJobs: available.length,
  };
}

export function getFreelancerSummaries(
  profiles: Profile[],
  events: EventRecord[],
  entries: FinancialEntry[],
) {
  return profiles
    .filter((profile) => profile.role === "freelancer")
    .map((profile) => {
      const freelancerEvents = events.filter(
        (event) => event.assignedFreelancerId === profile.id,
      );
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
        nextEvent: freelancerEvents.find(
          (event) => event.status === "assigned",
        ),
        completedEvents: freelancerEvents.filter(
          (event) => event.status === "completed",
        ).length,
        totalGenerated,
        totalPaid,
        balance: getFreelancerBalance(entries, profile.id),
      };
    });
}

export function getEventFinancialRows(
  events: EventRecord[],
  entries: FinancialEntry[],
) {
  return events.map((event) => ({
    event,
    totalPaid: getEventPaymentTotal(entries, event.id),
    balance: getEventBalance(event, entries),
  }));
}
