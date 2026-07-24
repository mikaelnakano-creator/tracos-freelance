import { z } from "zod";
import { parseMoneyToCents } from "./money";

export const eventFormSchema = z
  .object({
    title: z.string().min(3, "Informe o nome do evento."),
    serviceName: z.string().min(2, "Informe o serviço."),
    description: z.string().optional(),
    date: z.string().min(10, "Informe a data."),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    allDay: z.boolean(),
    locationName: z.string().min(2, "Informe o local."),
    locationAddress: z.string().optional(),
    assignmentMode: z.enum(["direct", "open"]),
    assignedFreelancerId: z.string().optional(),
    freelancerFee: z.string().min(1, "Informe o valor."),
    financialNotes: z.string().optional(),
    internalNotes: z.string().optional(),
    source: z.enum(["manual", "google_calendar"]),
    googleCalendarId: z.string().optional(),
    googleEventId: z.string().optional(),
    googleEventLink: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.allDay && (!values.startTime || !values.endTime)) {
      ctx.addIssue({
        code: "custom",
        message: "Informe os horários ou marque como evento de dia inteiro.",
        path: ["startTime"],
      });
    }

    if (values.assignmentMode === "direct" && !values.assignedFreelancerId) {
      ctx.addIssue({
        code: "custom",
        message: "Selecione um freelancer ativo.",
        path: ["assignedFreelancerId"],
      });
    }

    if (parseMoneyToCents(values.freelancerFee) <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "O valor deve ser maior que zero.",
        path: ["freelancerFee"],
      });
    }
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
