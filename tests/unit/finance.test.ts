import { describe, expect, it } from "vitest";
import {
  acceptOpenEventSlot,
  assertProfessionalLimit,
  completeAllAssignedSlots,
  completeSlotIdempotently,
  createFinancialEntry,
  getEventTeamSummary,
  getSlotFinancialSummary,
  reduceServiceQuantity,
  registerPayment,
} from "@/lib/domain/finance";
import type {
  EventProfessionalSlot,
  EventRecord,
  EventService,
  FinancialEntry,
  Profile,
  ServiceRecord,
} from "@/lib/domain/types";

const organizationId = "org-1";
const adminId = "admin-1";

function profile(id: string, name = id): Profile {
  return {
    id,
    organizationId,
    role: "freelancer",
    fullName: name,
    email: `${id}@example.com`,
    phone: "11999999999",
    pixKey: null,
    avatarUrl: null,
    notes: null,
    isActive: true,
  };
}

function event(id = "event-1"): EventRecord {
  return {
    id,
    organizationId,
    title: "Evento teste",
    serviceName: "Serviços",
    description: "",
    locationName: "Espaço",
    locationAddress: "Rua 1",
    startsAt: "2026-08-15T18:00:00-04:00",
    endsAt: "2026-08-15T23:00:00-04:00",
    allDay: false,
    freelancerFeeCents: 0,
    status: "open",
    assignmentMode: "open",
    assignedFreelancerId: null,
    googleCalendarId: null,
    googleEventId: null,
    googleEventLink: null,
    source: "manual",
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    createdBy: adminId,
    createdAt: "2026-07-27T10:00:00-04:00",
    updatedAt: "2026-07-27T10:00:00-04:00",
  };
}

function service(id: string, name: string): ServiceRecord {
  return {
    id,
    organizationId,
    name,
    description: null,
    defaultProfessionals: 1,
    defaultFeeCents: null,
    isActive: true,
    createdAt: "2026-07-27T10:00:00-04:00",
    updatedAt: "2026-07-27T10:00:00-04:00",
  };
}

function eventService(
  id: string,
  eventId: string,
  serviceRecord: ServiceRecord,
  quantityRequired: number,
): EventService {
  return {
    id,
    organizationId,
    eventId,
    serviceId: serviceRecord.id,
    serviceNameSnapshot: serviceRecord.name,
    quantityRequired,
    notes: null,
    createdAt: "2026-07-27T10:00:00-04:00",
    updatedAt: "2026-07-27T10:00:00-04:00",
  };
}

function slot(input: {
  id: string;
  eventId?: string;
  eventServiceId: string;
  slotNumber: number;
  freelancerId?: string | null;
  fee: number;
  status?: EventProfessionalSlot["status"];
}): EventProfessionalSlot {
  return {
    id: input.id,
    organizationId,
    eventId: input.eventId ?? "event-1",
    eventServiceId: input.eventServiceId,
    slotNumber: input.slotNumber,
    assignmentMode: input.freelancerId ? "direct" : "open",
    assignedFreelancerId: input.freelancerId ?? null,
    agreedFeeCents: input.fee,
    status: input.status ?? (input.freelancerId ? "assigned" : "open"),
    acceptedAt: input.freelancerId ? "2026-07-27T10:00:00-04:00" : null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    notes: null,
    createdBy: adminId,
    createdAt: "2026-07-27T10:00:00-04:00",
    updatedAt: "2026-07-27T10:00:00-04:00",
  };
}

function earningFor(slotValue: EventProfessionalSlot): FinancialEntry {
  return createFinancialEntry({
    id: `earning-${slotValue.id}`,
    organizationId,
    freelancerId: slotValue.assignedFreelancerId!,
    eventId: slotValue.eventId,
    eventProfessionalSlotId: slotValue.id,
    entryType: "event_earning",
    description: "Receita da vaga",
    amountCents: slotValue.agreedFeeCents,
    effectiveDate: "2026-08-15",
    createdBy: adminId,
    createdAt: "2026-08-15T23:30:00-04:00",
  });
}

describe("serviços, vagas profissionais e financeiro por vaga", () => {
  it("cenário 1: dois profissionais no mesmo serviço geram duas vagas e R$ 300", () => {
    const selfie = service("service-selfie", "Selfie impressa");
    const eventValue = event();
    const eventServiceValue = eventService(
      "event-service-selfie",
      eventValue.id,
      selfie,
      2,
    );
    const slots = [
      slot({
        id: "slot-1",
        eventServiceId: eventServiceValue.id,
        slotNumber: 1,
        freelancerId: "ana",
        fee: 15000,
      }),
      slot({
        id: "slot-2",
        eventServiceId: eventServiceValue.id,
        slotNumber: 2,
        freelancerId: "maria",
        fee: 15000,
      }),
    ];

    assertProfessionalLimit(slots);
    const summary = getEventTeamSummary(eventValue, slots, []);

    expect(slots).toHaveLength(2);
    expect(new Set(slots.map((item) => item.assignedFreelancerId)).size).toBe(
      2,
    );
    expect(summary.totalAgreedFee).toBe(30000);
  });

  it("cenário 2: serviços diferentes geram quatro vagas sem ultrapassar o máximo", () => {
    const eventValue = event();
    const fotografia = eventService(
      "event-service-photo",
      eventValue.id,
      service("photo", "Fotografia"),
      1,
    );
    const filmagem = eventService(
      "event-service-video",
      eventValue.id,
      service("video", "Filmagem"),
      1,
    );
    const selfie = eventService(
      "event-service-selfie",
      eventValue.id,
      service("selfie", "Selfie impressa"),
      2,
    );
    const slots = [
      slot({
        id: "photo-1",
        eventServiceId: fotografia.id,
        slotNumber: 1,
        fee: 25000,
      }),
      slot({
        id: "video-1",
        eventServiceId: filmagem.id,
        slotNumber: 1,
        fee: 30000,
      }),
      slot({
        id: "selfie-1",
        eventServiceId: selfie.id,
        slotNumber: 1,
        fee: 15000,
      }),
      slot({
        id: "selfie-2",
        eventServiceId: selfie.id,
        slotNumber: 2,
        fee: 15000,
      }),
    ];

    expect(() => assertProfessionalLimit(slots)).not.toThrow();
    expect(slots).toHaveLength(4);
    expect(new Set(slots.map((item) => item.eventServiceId)).size).toBe(3);
  });

  it("cenário 3: cinco vagas são permitidas e a sexta é bloqueada", () => {
    const slots = Array.from({ length: 5 }, (_, index) =>
      slot({
        id: `slot-${index + 1}`,
        eventServiceId: "event-service",
        slotNumber: index + 1,
        fee: 10000,
      }),
    );
    expect(() => assertProfessionalLimit(slots)).not.toThrow();

    const sixth = slot({
      id: "slot-6",
      eventServiceId: "event-service",
      slotNumber: 6,
      fee: 10000,
    });
    expect(() => assertProfessionalLimit([...slots, sixth])).toThrow(
      "Este evento pode ter no máximo 5 profissionais.",
    );
  });

  it("cenário 4: aceite simultâneo permite apenas um freelancer", () => {
    const eventValue = event();
    const openSlot = slot({
      id: "slot-open",
      eventServiceId: "event-service",
      slotNumber: 1,
      fee: 15000,
    });
    const first = acceptOpenEventSlot({
      event: eventValue,
      slot: openSlot,
      freelancer: profile("ana"),
      allSlots: [openSlot],
      existingAcceptances: [],
      acceptanceId: "acceptance-1",
      createdAt: "2026-07-27T11:00:00-04:00",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = acceptOpenEventSlot({
      event: first.event,
      slot: first.slot,
      freelancer: profile("maria"),
      allSlots: first.slots,
      existingAcceptances: first.acceptances,
      acceptanceId: "acceptance-2",
      createdAt: "2026-07-27T11:00:01-04:00",
    });

    expect(second.ok).toBe(false);
    expect(second.message).toBe(
      "Esta vaga acabou de ser aceita por outro freelancer.",
    );
  });

  it("cenário 5: freelancer já no evento não aceita segunda vaga", () => {
    const eventValue = event();
    const assigned = slot({
      id: "slot-photo",
      eventServiceId: "photo",
      slotNumber: 1,
      freelancerId: "ana",
      fee: 25000,
    });
    const open = slot({
      id: "slot-video",
      eventServiceId: "video",
      slotNumber: 1,
      fee: 30000,
    });
    const result = acceptOpenEventSlot({
      event: eventValue,
      slot: open,
      freelancer: profile("ana"),
      allSlots: [assigned, open],
      existingAcceptances: [],
      acceptanceId: "acceptance-1",
      createdAt: "2026-07-27T11:00:00-04:00",
    });

    expect(result.ok).toBe(false);
    expect(result.message).toBe("Você já faz parte da equipe deste evento.");
  });

  it("cenário 6: conclusão financeira gera quatro lançamentos corretos e R$ 850", () => {
    const eventValue = event();
    const services = [
      eventService(
        "photo",
        eventValue.id,
        service("photo-service", "Fotografia"),
        1,
      ),
      eventService(
        "video",
        eventValue.id,
        service("video-service", "Filmagem"),
        1,
      ),
      eventService(
        "selfie",
        eventValue.id,
        service("selfie-service", "Selfie impressa"),
        2,
      ),
    ];
    const slots = [
      slot({
        id: "photo-ana",
        eventServiceId: "photo",
        slotNumber: 1,
        freelancerId: "ana",
        fee: 25000,
      }),
      slot({
        id: "video-carlos",
        eventServiceId: "video",
        slotNumber: 1,
        freelancerId: "carlos",
        fee: 30000,
      }),
      slot({
        id: "selfie-joao",
        eventServiceId: "selfie",
        slotNumber: 1,
        freelancerId: "joao",
        fee: 15000,
      }),
      slot({
        id: "selfie-maria",
        eventServiceId: "selfie",
        slotNumber: 2,
        freelancerId: "maria",
        fee: 15000,
      }),
    ];

    const result = completeAllAssignedSlots({
      event: eventValue,
      slots,
      services,
      entries: [],
      idFactory: (prefix) => `${prefix}-${Math.random()}`,
      completedAt: "2026-08-15T23:30:00-04:00",
      actorId: adminId,
    });

    const earnings = result.entries.filter(
      (entry) => entry.entryType === "event_earning",
    );
    expect(earnings).toHaveLength(4);
    expect(earnings.reduce((sum, entry) => sum + entry.amountCents, 0)).toBe(
      85000,
    );
    expect(earnings.map((entry) => entry.freelancerId).sort()).toEqual([
      "ana",
      "carlos",
      "joao",
      "maria",
    ]);
  });

  it("cenário 7: pagamento parcial individual calcula saldos positivo e negativo", () => {
    const joaoSlot = slot({
      id: "slot-joao",
      eventServiceId: "selfie",
      slotNumber: 1,
      freelancerId: "joao",
      fee: 15000,
      status: "completed",
    });
    const mariaSlot = slot({
      id: "slot-maria",
      eventServiceId: "selfie",
      slotNumber: 2,
      freelancerId: "maria",
      fee: 15000,
      status: "completed",
    });
    const entries = [
      earningFor(joaoSlot),
      registerPayment({
        id: "payment-joao",
        organizationId,
        freelancerId: "joao",
        eventId: joaoSlot.eventId,
        eventProfessionalSlotId: joaoSlot.id,
        amountCents: 10000,
        entryType: "payment",
        description: "Pagamento parcial",
        effectiveDate: "2026-08-16",
        createdBy: adminId,
        createdAt: "2026-08-16T10:00:00-04:00",
      }),
      earningFor(mariaSlot),
      registerPayment({
        id: "payment-maria",
        organizationId,
        freelancerId: "maria",
        eventId: mariaSlot.eventId,
        eventProfessionalSlotId: mariaSlot.id,
        amountCents: 20000,
        entryType: "payment",
        description: "Pagamento maior",
        effectiveDate: "2026-08-16",
        createdBy: adminId,
        createdAt: "2026-08-16T10:00:00-04:00",
      }),
    ];

    expect(getSlotFinancialSummary(joaoSlot, entries).balance).toBe(5000);
    expect(getSlotFinancialSummary(mariaSlot, entries).balance).toBe(-5000);
  });

  it("cenário 8: redução de quantidade remove vazias e preserva preenchida", () => {
    const eventServiceValue = eventService(
      "selfie",
      "event-1",
      service("selfie-service", "Selfie impressa"),
      3,
    );
    const slots = [
      slot({
        id: "slot-1",
        eventServiceId: eventServiceValue.id,
        slotNumber: 1,
        freelancerId: "ana",
        fee: 15000,
      }),
      slot({
        id: "slot-2",
        eventServiceId: eventServiceValue.id,
        slotNumber: 2,
        fee: 15000,
      }),
      slot({
        id: "slot-3",
        eventServiceId: eventServiceValue.id,
        slotNumber: 3,
        fee: 15000,
      }),
    ];

    const result = reduceServiceQuantity({
      eventService: eventServiceValue,
      allSlots: slots,
      nextQuantity: 1,
    });

    expect(result.preserved.map((item) => item.id)).toEqual(["slot-1"]);
    expect(result.removable.map((item) => item.id).sort()).toEqual([
      "slot-2",
      "slot-3",
    ]);
    expect(result.cancellable).toHaveLength(0);
  });

  it("cenário 9: conclusão parcial gera duas receitas e evento ainda não conclui", () => {
    const eventValue = event();
    const slots = [
      slot({
        id: "slot-1",
        eventServiceId: "service",
        slotNumber: 1,
        freelancerId: "ana",
        fee: 10000,
      }),
      slot({
        id: "slot-2",
        eventServiceId: "service",
        slotNumber: 2,
        freelancerId: "bruno",
        fee: 10000,
      }),
      slot({
        id: "slot-3",
        eventServiceId: "service",
        slotNumber: 3,
        freelancerId: "carlos",
        fee: 10000,
      }),
    ];
    const first = completeSlotIdempotently({
      event: eventValue,
      slot: slots[0],
      allSlots: slots,
      entries: [],
      entryId: "earning-1",
      completedAt: "2026-08-15T20:00:00-04:00",
      actorId: adminId,
      serviceName: "Serviço",
    });
    const second = completeSlotIdempotently({
      event: first.event,
      slot: first.slots[1],
      allSlots: first.slots,
      entries: first.entries,
      entryId: "earning-2",
      completedAt: "2026-08-15T21:00:00-04:00",
      actorId: adminId,
      serviceName: "Serviço",
    });

    expect(second.entries).toHaveLength(2);
    expect(second.event.status).not.toBe("completed");
  });
});
