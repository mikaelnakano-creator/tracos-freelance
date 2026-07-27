import type {
  AuditLog,
  EventAcceptance,
  EventProfessionalSlot,
  EventRecord,
  EventService,
  FinancialEntry,
  GoogleCalendarEvent,
  Organization,
  Profile,
  ServiceRecord,
} from "@/lib/domain/types";

export type WorkspaceData = {
  organization: Organization;
  currentProfile: Profile | null;
  profiles: Profile[];
  services: ServiceRecord[];
  events: EventRecord[];
  eventServices: EventService[];
  professionalSlots: EventProfessionalSlot[];
  financialEntries: FinancialEntry[];
  acceptances: EventAcceptance[];
  auditLogs: AuditLog[];
  googleEvents: GoogleCalendarEvent[];
};
