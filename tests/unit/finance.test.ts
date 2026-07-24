import { describe, expect, it } from "vitest";
import {
  acceptOpenEvent,
  adjustCompletedEventFee,
  canProfileReadEvent,
  canProfileReadFinancialEntry,
  completeEventIdempotently,
  createFinancialEntry,
  getFreelancerBalance,
  registerPayment,
  reverseEventCompletion,
} from "@/lib/domain/finance";
import type {
  EventAcceptance,
  EventRecord,
  FinancialEntry,
  Profile,
} from "@/lib/domain/types";

const organizationId = "org-1";
const admin: Profile = {
  id: "admin-1",
  organizationId,
  role: "admin",
  fullName: "Admin",
  email: "admin@example.com",
  phone: "",
  pixKey: null,
  avatarUrl: null,
  notes: null,
  isActive: true,
};
const freelancer: Profile = {
  id: "freelancer-1",
  organizationId,
  role: "freelancer",
  fullName: "Freelancer Um",
  email: "f1@example.com",
  phone: "",
  pixKey: null,
  avatarUrl: null,
  notes: null,
  isActive: true,
};
const otherFreelancer: Profile = {
  ...freelancer,
  id: "freelancer-2",
  fullName: "Freelancer Dois",
  email: "f2@example.com",
};
const otherOrganizationFreelancer: Profile = {
  ...freelancer,
  id: "freelancer-3",
  organizationId: "org-2",
};

function eventFixture(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "event-1",
    organizationId,
    title: "Evento teste",
    serviceName: "Fotografia",
    description: "",
    locationName: "",
    locationAddress: "",
    startsAt: "2026-07-24T14:00:00-04:00",
    endsAt: "2026-07-24T18:00:00-04:00",
    allDay: false,
    freelancerFeeCents: 15000,
    status: "assigned",
    assignmentMode: "direct",
    assignedFreelancerId: freelancer.id,
    googleCalendarId: null,
    googleEventId: null,
    googleEventLink: null,
    source: "manual",
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdBy: admin.id,
    createdAt: "2026-07-24T10:00:00-04:00",
    updatedAt: "2026-07-24T10:00:00-04:00",
    ...overrides,
  };
}

function entry(
  amountCents: number,
  type: FinancialEntry["entryType"] = "event_earning",
) {
  return createFinancialEntry({
    id: `entry-${amountCents}-${type}`,
    organizationId,
    freelancerId: freelancer.id,
    eventId: "event-1",
    entryType: type,
    description: "teste",
    amountCents,
    effectiveDate: "2026-07-24",
    createdBy: admin.id,
    createdAt: "2026-07-24T12:00:00-04:00",
  });
}

describe("regras financeiras", () => {
  it("cenário 1: R$ 150 gerado e R$ 100 pago deixa saldo positivo de R$ 50", () => {
    const entries = [
      entry(15000),
      registerPayment({
        id: "payment-1",
        organizationId,
        freelancerId: freelancer.id,
        eventId: "event-1",
        amountCents: 10000,
        entryType: "payment",
        description: "Pagamento parcial",
        effectiveDate: "2026-07-24",
        createdBy: admin.id,
        createdAt: "2026-07-24T12:00:00-04:00",
      }),
    ];

    expect(getFreelancerBalance(entries, freelancer.id)).toBe(5000);
  });

  it("cenário 2: pagamento completo deixa saldo zero", () => {
    const entries = [entry(15000), entry(-15000, "payment")];
    expect(getFreelancerBalance(entries, freelancer.id)).toBe(0);
  });

  it("cenário 3: pagamento superior deixa saldo negativo de R$ 50", () => {
    const entries = [entry(15000), entry(-20000, "payment")];
    expect(getFreelancerBalance(entries, freelancer.id)).toBe(-5000);
  });

  it("cenário 4: múltiplos pagamentos somam corretamente", () => {
    const entries = [
      entry(30000),
      entry(-10000, "payment"),
      entry(-5000, "payment"),
    ];
    expect(getFreelancerBalance(entries, freelancer.id)).toBe(15000);
  });

  it("cenário 5: adiantamento antes de evento deixa saldo negativo", () => {
    const entries = [entry(-10000, "advance")];
    expect(getFreelancerBalance(entries, freelancer.id)).toBe(-10000);
  });

  it("cenário 6: adiantamento de R$ 100 e evento de R$ 150 deixa R$ 50 a receber", () => {
    const entries = [entry(-10000, "advance"), entry(15000)];
    expect(getFreelancerBalance(entries, freelancer.id)).toBe(5000);
  });

  it("conclusão de evento é idempotente", () => {
    const event = eventFixture();
    const first = completeEventIdempotently({
      event,
      entries: [],
      entryId: "earning-1",
      actorId: admin.id,
      completedAt: "2026-07-24T18:00:00-04:00",
    });
    const second = completeEventIdempotently({
      event: first.event,
      entries: first.entries,
      entryId: "earning-2",
      actorId: admin.id,
      completedAt: "2026-07-24T18:05:00-04:00",
    });

    expect(
      second.entries.filter((item) => item.entryType === "event_earning"),
    ).toHaveLength(1);
  });

  it("estorno de pagamento cria lançamento inverso", () => {
    const payment = entry(-10000, "payment");
    const reversal = createFinancialEntry({
      id: "reversal-1",
      organizationId,
      freelancerId: freelancer.id,
      eventId: "event-1",
      entryType: "reversal",
      description: "Estorno",
      amountCents: 10000,
      effectiveDate: "2026-07-24",
      createdBy: admin.id,
      createdAt: "2026-07-24T12:00:00-04:00",
      reversedEntryId: payment.id,
    });

    expect(getFreelancerBalance([payment, reversal], freelancer.id)).toBe(0);
  });

  it("alteração de valor de evento concluído gera ajuste pela diferença", () => {
    const event = eventFixture({
      status: "completed",
      freelancerFeeCents: 15000,
    });
    const result = adjustCompletedEventFee({
      event,
      entries: [entry(15000)],
      newFeeCents: 20000,
      adjustmentId: "adjust-1",
      actorId: admin.id,
      createdAt: "2026-07-25T10:00:00-04:00",
    });

    expect(getFreelancerBalance(result.entries, freelancer.id)).toBe(20000);
    expect(result.entries.at(-1)?.amountCents).toBe(5000);
  });

  it("reversão da conclusão mantém histórico e cria lançamento negativo", () => {
    const event = eventFixture({
      status: "completed",
      completedAt: "2026-07-24T18:00:00-04:00",
    });
    const result = reverseEventCompletion({
      event,
      entries: [entry(15000)],
      reversalId: "reversal-completion-1",
      actorId: admin.id,
      createdAt: "2026-07-25T10:00:00-04:00",
    });

    expect(getFreelancerBalance(result.entries, freelancer.id)).toBe(0);
    expect(result.event.status).toBe("assigned");
  });

  it("freelancer não acessa dados financeiros de terceiros", () => {
    const ownEntry = entry(15000);
    const otherEntry: FinancialEntry = {
      ...entry(10000),
      id: "other",
      freelancerId: otherFreelancer.id,
    };

    expect(canProfileReadFinancialEntry(freelancer, ownEntry)).toBe(true);
    expect(canProfileReadFinancialEntry(freelancer, otherEntry)).toBe(false);
  });

  it("usuários de outra organização não acessam eventos", () => {
    expect(
      canProfileReadEvent(otherOrganizationFreelancer, eventFixture()),
    ).toBe(false);
  });

  it("aceite simultâneo permite apenas o primeiro freelancer", () => {
    const openEvent = eventFixture({
      status: "open",
      assignmentMode: "open",
      assignedFreelancerId: null,
    });
    const acceptances: EventAcceptance[] = [];
    const first = acceptOpenEvent({
      event: openEvent,
      freelancer,
      existingAcceptances: acceptances,
      acceptanceId: "accept-1",
      createdAt: "2026-07-24T14:00:00-04:00",
    });
    expect(first.ok).toBe(true);

    const second = acceptOpenEvent({
      event: first.ok ? first.event : openEvent,
      freelancer: otherFreelancer,
      existingAcceptances: first.ok ? first.acceptances : acceptances,
      acceptanceId: "accept-2",
      createdAt: "2026-07-24T14:00:01-04:00",
    });

    expect(second.ok).toBe(false);
    expect(second.message).toBe(
      "Este trabalho acabou de ser aceito por outro freelancer.",
    );
  });
});
