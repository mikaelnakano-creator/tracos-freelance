import { z } from "zod";
import { MAX_EVENT_PROFESSIONALS } from "./finance";
import { parseMoneyToCents } from "./money";

export const slotFormSchema = z.object({
  draftId: z.string().min(1),
  slotNumber: z.number().int().min(1).max(MAX_EVENT_PROFESSIONALS),
  assignmentMode: z.enum(["direct", "open"]),
  assignedFreelancerId: z.string().optional(),
  agreedFee: z.string().min(1, "Informe o valor da vaga."),
  notes: z.string().optional(),
});

export type SlotFormValues = z.infer<typeof slotFormSchema>;

export const eventServiceFormSchema = z.object({
  draftId: z.string().min(1),
  serviceId: z.string().min(1, "Selecione o serviço."),
  serviceNameSnapshot: z.string().min(2, "Informe o serviço."),
  quantityRequired: z.number().int().min(1).max(MAX_EVENT_PROFESSIONALS),
  notes: z.string().optional(),
  slots: z.array(slotFormSchema).min(1),
});

export type EventServiceFormValues = z.infer<typeof eventServiceFormSchema>;

export const eventFormSchema = z
  .object({
    title: z.string().min(3, "Informe o nome do evento."),
    serviceName: z.string().optional(),
    description: z.string().optional(),
    date: z.string().min(10, "Informe a data."),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    allDay: z.boolean(),
    locationName: z.string().min(2, "Informe o local."),
    locationAddress: z.string().optional(),
    generalNotes: z.string().optional(),
    assignmentMode: z.enum(["direct", "open"]).optional(),
    assignedFreelancerId: z.string().optional(),
    freelancerFee: z.string().optional(),
    financialNotes: z.string().optional(),
    internalNotes: z.string().optional(),
    source: z.enum(["manual", "google_calendar"]),
    googleCalendarId: z.string().optional(),
    googleEventId: z.string().optional(),
    googleEventLink: z.string().optional(),
    services: z
      .array(eventServiceFormSchema)
      .min(1, "Adicione pelo menos um serviço."),
  })
  .superRefine((values, ctx) => {
    if (!values.allDay && (!values.startTime || !values.endTime)) {
      ctx.addIssue({
        code: "custom",
        message: "Informe os horários ou marque como evento de dia inteiro.",
        path: ["startTime"],
      });
    }

    const totalProfessionals = values.services.reduce(
      (sum, service) => sum + service.quantityRequired,
      0,
    );

    if (totalProfessionals < 1) {
      ctx.addIssue({
        code: "custom",
        message: "O evento precisa ter pelo menos 1 profissional.",
        path: ["services"],
      });
    }

    if (totalProfessionals > MAX_EVENT_PROFESSIONALS) {
      ctx.addIssue({
        code: "custom",
        message: "Este evento pode ter no máximo 5 profissionais.",
        path: ["services"],
      });
    }

    const assignedFreelancers = new Set<string>();

    values.services.forEach((service, serviceIndex) => {
      if (service.slots.length !== service.quantityRequired) {
        ctx.addIssue({
          code: "custom",
          message:
            "A quantidade precisa gerar uma vaga para cada profissional.",
          path: ["services", serviceIndex, "slots"],
        });
      }

      service.slots.forEach((slot, slotIndex) => {
        if (slot.assignmentMode === "direct" && !slot.assignedFreelancerId) {
          ctx.addIssue({
            code: "custom",
            message: "Selecione um freelancer ou deixe a vaga aberta.",
            path: [
              "services",
              serviceIndex,
              "slots",
              slotIndex,
              "assignedFreelancerId",
            ],
          });
        }

        if (parseMoneyToCents(slot.agreedFee) <= 0) {
          ctx.addIssue({
            code: "custom",
            message: "O valor da vaga deve ser maior que zero.",
            path: ["services", serviceIndex, "slots", slotIndex, "agreedFee"],
          });
        }

        if (!slot.assignedFreelancerId) return;

        if (assignedFreelancers.has(slot.assignedFreelancerId)) {
          ctx.addIssue({
            code: "custom",
            message:
              "Este freelancer já está designado para outra função neste evento.",
            path: [
              "services",
              serviceIndex,
              "slots",
              slotIndex,
              "assignedFreelancerId",
            ],
          });
        }

        assignedFreelancers.add(slot.assignedFreelancerId);
      });
    });
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;

export const freelancerFormSchema = z.object({
  fullName: z.string().min(3, "Informe o nome completo."),
  email: z.string().email("Informe um e-mail válido."),
  phone: z.string().min(8, "Informe um telefone."),
  pixKey: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type FreelancerFormValues = z.infer<typeof freelancerFormSchema>;

export const financialEntrySchema = z.object({
  freelancerId: z.string().min(1, "Selecione o freelancer."),
  eventId: z.string().optional(),
  eventProfessionalSlotId: z.string().optional(),
  entryType: z.enum([
    "payment",
    "advance",
    "positive_adjustment",
    "negative_adjustment",
    "reversal",
  ]),
  amount: z.string().min(1, "Informe o valor."),
  effectiveDate: z.string().min(10, "Informe a data."),
  description: z.string().min(3, "Informe uma descrição."),
});

export type FinancialEntryFormValues = z.infer<typeof financialEntrySchema>;
