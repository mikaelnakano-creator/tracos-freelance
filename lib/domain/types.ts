export type UserRole = "admin" | "freelancer";

export type EventStatus =
  "draft" | "open" | "assigned" | "completed" | "cancelled";

export type AssignmentMode = "direct" | "open";
export type EventSource = "manual" | "google_calendar";

export type FinancialEntryType =
  | "event_earning"
  | "payment"
  | "advance"
  | "positive_adjustment"
  | "negative_adjustment"
  | "reversal";

export type AcceptanceStatus = "accepted" | "rejected" | "expired";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  logoUrl: string | null;
};

export type Profile = {
  id: string;
  organizationId: string;
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  pixKey: string | null;
  avatarUrl: string | null;
  notes: string | null;
  isActive: boolean;
};

export type EventRecord = {
  id: string;
  organizationId: string;
  title: string;
  serviceName: string;
  description: string;
  locationName: string;
  locationAddress: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  freelancerFeeCents: number;
  status: EventStatus;
  assignmentMode: AssignmentMode;
  assignedFreelancerId: string | null;
  googleCalendarId: string | null;
  googleEventId: string | null;
  googleEventLink: string | null;
  source: EventSource;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EventAcceptance = {
  id: string;
  organizationId: string;
  eventId: string;
  freelancerId: string;
  status: AcceptanceStatus;
  createdAt: string;
};

export type FinancialEntry = {
  id: string;
  organizationId: string;
  freelancerId: string;
  eventId: string | null;
  entryType: FinancialEntryType;
  description: string;
  amountCents: number;
  effectiveDate: string;
  createdBy: string;
  createdAt: string;
  reversedEntryId: string | null;
};

export type AuditLog = {
  id: string;
  organizationId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
};

export type GoogleCalendarEvent = {
  id: string;
  calendarId: string;
  htmlLink: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
};
