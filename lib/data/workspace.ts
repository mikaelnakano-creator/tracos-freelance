import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkspaceData } from "@/lib/domain/workspace-data";
import type {
  AuditLog,
  EventAcceptance,
  EventProfessionalSlot,
  EventRecord,
  EventService,
  FinancialEntry,
  Organization,
  Profile,
  ServiceRecord,
  UserRole,
} from "@/lib/domain/types";

const emptyOrganization: Organization = {
  id: "",
  name: "Traços Detalhados",
  slug: "tracos-detalhados",
  timezone: "America/Cuiaba",
  logoUrl: null,
};

export async function getWorkspaceData(): Promise<WorkspaceData> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return emptyWorkspaceData();
  }

  const [
    organizations,
    profiles,
    services,
    events,
    eventServices,
    professionalSlots,
    financialEntries,
    acceptances,
    auditLogs,
  ] = await Promise.all([
    selectRows(supabase.from("organizations").select("*").limit(1)),
    selectRows(
      supabase
        .from("profiles")
        .select(
          "*, organization_members(organization_id, is_active, organization_member_roles(role))",
        )
        .order("full_name", { ascending: true }),
    ),
    selectRows(
      supabase.from("services").select("*").order("name", { ascending: true }),
    ),
    selectRows(
      supabase
        .from("events")
        .select("*")
        .order("starts_at", { ascending: true }),
    ),
    selectRows(supabase.from("event_services").select("*")),
    selectRows(supabase.from("event_professional_slots").select("*")),
    selectRows(
      supabase
        .from("financial_entries")
        .select("*")
        .order("effective_date", { ascending: false }),
    ),
    selectRows(
      supabase
        .from("event_acceptances")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
    selectRows(
      supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ),
  ]);

  const mappedProfiles = profiles.map(mapProfile);

  return {
    organization: organizations[0]
      ? mapOrganization(organizations[0])
      : emptyOrganization,
    currentProfile:
      mappedProfiles.find((profile) => profile.authUserId === user.id) ?? null,
    profiles: mappedProfiles,
    services: services.map(mapService),
    events: events.map(mapEvent),
    eventServices: eventServices.map(mapEventService),
    professionalSlots: professionalSlots.map(mapProfessionalSlot),
    financialEntries: financialEntries.map(mapFinancialEntry),
    acceptances: acceptances.map(mapAcceptance),
    auditLogs: auditLogs.map(mapAuditLog),
    googleEvents: [],
  };
}

export function emptyWorkspaceData(): WorkspaceData {
  return {
    organization: emptyOrganization,
    currentProfile: null,
    profiles: [],
    services: [],
    events: [],
    eventServices: [],
    professionalSlots: [],
    financialEntries: [],
    acceptances: [],
    auditLogs: [],
    googleEvents: [],
  };
}

async function selectRows<T>(
  query: PromiseLike<{ data: T[] | null; error: unknown }>,
) {
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

function mapOrganization(row: Record<string, unknown>): Organization {
  return {
    id: asString(row.id),
    name: asString(row.name),
    slug: asString(row.slug),
    timezone: asString(row.timezone) || "America/Cuiaba",
    logoUrl: asNullableString(row.logo_url),
  };
}

function mapProfile(row: Record<string, unknown>): Profile {
  const memberships = toArray(row.organization_members);
  const roles = normalizeRoles(
    memberships.flatMap((member) =>
      toArray(
        (member as Record<string, unknown>).organization_member_roles,
      ).map((roleRow) => (roleRow as Record<string, unknown>).role),
    ),
  );
  const legacyRole = normalizeRoles([row.role])[0];
  const effectiveRoles =
    roles.length > 0 ? roles : legacyRole ? [legacyRole] : [];

  return {
    id: asString(row.id),
    organizationId:
      asNullableString(row.organization_id) ??
      asString(
        (memberships[0] as Record<string, unknown> | undefined)
          ?.organization_id,
      ),
    role: effectiveRoles.includes("admin") ? "admin" : "freelancer",
    roles: effectiveRoles,
    authUserId: asNullableString(row.auth_user_id),
    fullName: asString(row.full_name),
    email: asString(row.email),
    phone: asString(row.phone),
    pixKey: asNullableString(row.pix_key),
    avatarUrl: asNullableString(row.avatar_url),
    googleAvatarUrl: asNullableString(row.google_avatar_url),
    notes: asNullableString(row.notes),
    isActive: asBoolean(row.is_active, true),
    firstAccessAt: asNullableString(row.first_access_at),
    lastAccessAt: asNullableString(row.last_access_at),
  };
}

function mapService(row: Record<string, unknown>): ServiceRecord {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    name: asString(row.name),
    description: asNullableString(row.description),
    defaultProfessionals: asNumber(row.default_professionals, 1),
    defaultFeeCents: toCents(row.default_fee),
    isActive: asBoolean(row.is_active, true),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

function mapEvent(row: Record<string, unknown>): EventRecord {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    title: asString(row.title),
    serviceName: asString(row.service_name),
    description: asString(row.description),
    locationName: asString(row.location_name),
    locationAddress: asString(row.location_address),
    startsAt: asString(row.starts_at),
    endsAt: asNullableString(row.ends_at),
    allDay: asBoolean(row.all_day, false),
    freelancerFeeCents: toCents(row.freelancer_fee) ?? 0,
    status: asString(row.status) as EventRecord["status"],
    assignmentMode: asString(
      row.assignment_mode,
    ) as EventRecord["assignmentMode"],
    assignedFreelancerId: asNullableString(row.assigned_freelancer_id),
    googleCalendarId: asNullableString(row.google_calendar_id),
    googleEventId: asNullableString(row.google_event_id),
    googleEventLink: asNullableString(row.google_event_link),
    source: asString(row.source) as EventRecord["source"],
    completedAt: asNullableString(row.completed_at),
    cancelledAt: asNullableString(row.cancelled_at),
    cancellationReason: asNullableString(row.cancellation_reason),
    createdBy: asString(row.created_by),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

function mapEventService(row: Record<string, unknown>): EventService {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    eventId: asString(row.event_id),
    serviceId: asNullableString(row.service_id),
    serviceNameSnapshot: asString(row.service_name_snapshot),
    quantityRequired: asNumber(row.quantity_required, 1),
    notes: asNullableString(row.notes),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

function mapProfessionalSlot(
  row: Record<string, unknown>,
): EventProfessionalSlot {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    eventId: asString(row.event_id),
    eventServiceId: asString(row.event_service_id),
    slotNumber: asNumber(row.slot_number, 1),
    assignmentMode: asString(
      row.assignment_mode,
    ) as EventProfessionalSlot["assignmentMode"],
    assignedFreelancerId: asNullableString(row.assigned_freelancer_id),
    agreedFeeCents: toCents(row.agreed_fee) ?? 0,
    status: asString(row.status) as EventProfessionalSlot["status"],
    acceptedAt: asNullableString(row.accepted_at),
    completedAt: asNullableString(row.completed_at),
    cancelledAt: asNullableString(row.cancelled_at),
    cancellationReason: asNullableString(row.cancellation_reason),
    notes: asNullableString(row.notes),
    createdBy: asString(row.created_by),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

function mapFinancialEntry(row: Record<string, unknown>): FinancialEntry {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    freelancerId: asString(row.freelancer_id),
    eventId: asNullableString(row.event_id),
    eventProfessionalSlotId: asNullableString(row.event_professional_slot_id),
    entryType: asString(row.entry_type) as FinancialEntry["entryType"],
    description: asString(row.description),
    amountCents: toCents(row.amount) ?? 0,
    effectiveDate: asString(row.effective_date),
    createdBy: asString(row.created_by),
    createdAt: asString(row.created_at),
    reversedEntryId: asNullableString(row.reversed_entry_id),
  };
}

function mapAcceptance(row: Record<string, unknown>): EventAcceptance {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    eventId: asString(row.event_id),
    eventProfessionalSlotId: asNullableString(row.event_professional_slot_id),
    freelancerId: asString(row.freelancer_id),
    status: asString(row.status) as EventAcceptance["status"],
    createdAt: asString(row.created_at),
  };
}

function mapAuditLog(row: Record<string, unknown>): AuditLog {
  return {
    id: asString(row.id),
    organizationId: asString(row.organization_id),
    userId: asString(row.user_id),
    action: asString(row.action),
    entityType: asString(row.entity_type),
    entityId: asString(row.entity_id),
    oldValues: asRecord(row.old_values),
    newValues: asRecord(row.new_values),
    createdAt: asString(row.created_at),
  };
}

function normalizeRoles(values: unknown[]): UserRole[] {
  return Array.from(
    new Set(
      values.filter(
        (value): value is UserRole =>
          value === "admin" || value === "freelancer",
      ),
    ),
  );
}

function toCents(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return Math.round(Number(value) * 100);
}

function toArray(value: unknown): unknown[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function asString(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNullableString(value: unknown) {
  const text = asString(value);
  return text ? text : null;
}

function asNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asRecord(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}
