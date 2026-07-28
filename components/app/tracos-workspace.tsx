"use client";

import Link from "next/link";
import {
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Power,
  Plug,
  Plus,
  Settings,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/skeleton";
import { AuditTimeline } from "@/components/app/audit-timeline";
import { BalanceDisplay } from "@/components/app/balance-display";
import { EventStatusBadge } from "@/components/app/event-status-badge";
import { EventTeamProgress } from "@/components/app/event-team-progress";
import { EventTeamSummary } from "@/components/app/event-team-summary";
import { FinancialSummary } from "@/components/app/financial-summary";
import { OpenSlotCard } from "@/components/app/open-slot-card";
import { PageHeader } from "@/components/app/page-header";
import { ServiceGroupCard } from "@/components/app/service-group-card";
import { StatCard } from "@/components/app/stat-card";
import { EventForm } from "@/components/forms/event-form";
import { FinancialEntryForm } from "@/components/forms/financial-entry-form";
import { GoogleCalendarImportDialog } from "@/components/google/google-calendar-import-dialog";
import {
  demoAcceptances,
  demoAuditLogs,
  demoEventServices,
  demoEvents,
  demoFinancialEntries,
  demoGoogleEvents,
  demoOrganization,
  demoProfessionalSlots,
  demoProfiles,
  demoServices,
} from "@/lib/demo/seed-data";
import {
  getAdminMetrics,
  getFreelancerMetrics,
  getFreelancerSummaries,
  getServiceRevenueRows,
} from "@/lib/demo/analytics";
import {
  acceptOpenEventSlot,
  canProfileReadEvent,
  canProfileReadFinancialEntry,
  canProfileReadSlot,
  cancelSlot,
  completeAllAssignedSlots,
  completeSlotIdempotently,
  getActiveEventSlots,
  getEventSlots,
  getEventTeamSummary,
  getFreelancerBalance,
  getSlotFinancialSummary,
  recalculateEventStatus,
  registerPayment,
  reopenSlot,
} from "@/lib/domain/finance";
import {
  describeBalance,
  formatMoney,
  parseMoneyToCents,
} from "@/lib/domain/money";
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
  UserRole,
} from "@/lib/domain/types";
import type { WorkspaceData } from "@/lib/domain/workspace-data";
import type {
  EventFormValues,
  FinancialEntryFormValues,
  FreelancerFormValues,
} from "@/lib/domain/schemas";
import {
  formatDateTimeRange,
  formatShortDate,
  toIsoDateTime,
} from "@/lib/dates";
import { cn, initials } from "@/lib/utils";

export type WorkspaceView =
  | "admin-dashboard"
  | "admin-events"
  | "admin-event-new"
  | "admin-event-detail"
  | "admin-event-edit"
  | "admin-freelancers"
  | "admin-freelancer-new"
  | "admin-freelancer-detail"
  | "admin-services"
  | "admin-finance"
  | "admin-financial-entries"
  | "admin-reports"
  | "admin-settings"
  | "admin-integrations"
  | "admin-google-calendar"
  | "freelancer-dashboard"
  | "freelancer-events"
  | "freelancer-opportunities"
  | "freelancer-finance"
  | "freelancer-profile";

const adminLinks = [
  { href: "/admin/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/admin/freelancers", label: "Freelancers", icon: Users },
  { href: "/admin/servicos", label: "Serviços", icon: BriefcaseBusiness },
  { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/admin/google-agenda", label: "Google Agenda", icon: CalendarRange },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
  { href: "/auth/logout", label: "Sair", icon: Power },
];

const chartColors = ["#2f7a78", "#496aaf", "#236f59", "#bd3f32", "#805ad5"];

const demoWorkspaceData: WorkspaceData = {
  organization: demoOrganization,
  currentProfile: null,
  profiles: demoProfiles,
  services: demoServices,
  events: demoEvents,
  eventServices: demoEventServices,
  professionalSlots: demoProfessionalSlots,
  financialEntries: demoFinancialEntries,
  acceptances: demoAcceptances,
  auditLogs: demoAuditLogs,
  googleEvents: demoGoogleEvents,
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function TracosWorkspace({
  view,
  entityId,
  role,
  data,
  demoMode = false,
}: {
  view: WorkspaceView;
  entityId?: string;
  role: "admin" | "freelancer";
  data?: WorkspaceData;
  demoMode?: boolean;
}) {
  const workspaceData = data ?? demoWorkspaceData;
  const organization = workspaceData.organization;
  const [events, setEvents] = useState<EventRecord[]>(workspaceData.events);
  const [eventServices, setEventServices] = useState<EventService[]>(
    workspaceData.eventServices,
  );
  const [professionalSlots, setProfessionalSlots] = useState<
    EventProfessionalSlot[]
  >(workspaceData.professionalSlots);
  const [profiles, setProfiles] = useState<Profile[]>(workspaceData.profiles);
  const [services, setServices] = useState<ServiceRecord[]>(
    workspaceData.services,
  );
  const [entries, setEntries] = useState<FinancialEntry[]>(
    workspaceData.financialEntries,
  );
  const [acceptances, setAcceptances] = useState<EventAcceptance[]>(
    workspaceData.acceptances,
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(
    workspaceData.auditLogs,
  );
  const [selectedFreelancerId, setSelectedFreelancerId] = useState(
    workspaceData.currentProfile &&
      profileHasRole(workspaceData.currentProfile, "freelancer")
      ? workspaceData.currentProfile.id
      : (workspaceData.profiles.find((profile) =>
          profileHasRole(profile, "freelancer"),
        )?.id ?? ""),
  );
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false);
  const [importedEvent, setImportedEvent] =
    useState<GoogleCalendarEvent | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState(
    demoMode
      ? "Modo demonstração ativo apenas para desenvolvimento e testes."
      : "Sistema conectado aos dados do Supabase.",
  );

  const fallbackProfile = makeFallbackProfile(organization.id, role);
  const admin =
    (workspaceData.currentProfile &&
    profileHasRole(workspaceData.currentProfile, "admin")
      ? workspaceData.currentProfile
      : profiles.find((profile) => profileHasRole(profile, "admin"))) ??
    fallbackProfile;
  const activeFreelancers = profiles.filter(
    (profile) => profileHasRole(profile, "freelancer") && profile.isActive,
  );
  const currentFreelancer =
    (workspaceData.currentProfile &&
    profileHasRole(workspaceData.currentProfile, "freelancer")
      ? workspaceData.currentProfile
      : null) ??
    profiles.find((profile) => profile.id === selectedFreelancerId) ??
    activeFreelancers[0] ??
    fallbackProfile;
  const currentUser = role === "admin" ? admin : currentFreelancer;
  const canSwitchAreas =
    profileHasRole(currentUser, "admin") &&
    profileHasRole(currentUser, "freelancer");
  const adminMetrics = getAdminMetrics(events, entries, professionalSlots);
  const freelancerMetrics = getFreelancerMetrics(
    currentFreelancer.id,
    events,
    entries,
    professionalSlots,
  );
  const freelancerSummaries = getFreelancerSummaries(
    profiles,
    events,
    entries,
    professionalSlots,
  );
  const balancesByFreelancer = Object.fromEntries(
    profiles
      .filter((profile) => profileHasRole(profile, "freelancer"))
      .map((profile) => [
        profile.id,
        getFreelancerBalance(entries, profile.id),
      ]),
  );
  const selectedEvent =
    events.find((event) => event.id === entityId) ?? events[0];
  const selectedFreelancer =
    profiles.find((profile) => profile.id === entityId) ?? currentFreelancer;

  const visibleEvents =
    role === "admin"
      ? events
      : events.filter((event) =>
          canProfileReadEvent(currentFreelancer, event, professionalSlots),
        );
  const visibleEntries =
    role === "admin"
      ? entries
      : entries.filter((entry) =>
          canProfileReadFinancialEntry(currentFreelancer, entry),
        );
  const visibleSlots =
    role === "admin"
      ? professionalSlots
      : professionalSlots.filter((slot) =>
          canProfileReadSlot(currentFreelancer, slot),
        );

  const monthlyChart = useMemo(
    () => [
      { month: "Mar", eventos: 7, vagas: 16, gerado: 1600, pago: 1280 },
      { month: "Abr", eventos: 9, vagas: 22, gerado: 2300, pago: 2100 },
      { month: "Mai", eventos: 8, vagas: 19, gerado: 2050, pago: 1760 },
      { month: "Jun", eventos: 12, vagas: 31, gerado: 3120, pago: 2860 },
      {
        month: "Jul",
        eventos: events.length,
        vagas: professionalSlots.length,
        gerado: adminMetrics.generatedThisMonth / 100,
        pago: adminMetrics.paidThisMonth / 100,
      },
    ],
    [
      adminMetrics.generatedThisMonth,
      adminMetrics.paidThisMonth,
      events.length,
      professionalSlots.length,
    ],
  );

  const statusChart = [
    "open",
    "partially_assigned",
    "fully_assigned",
    "completed",
    "cancelled",
  ].map((item) => ({
    name: translateStatus(item as EventRecord["status"]),
    value: events.filter((event) => event.status === item).length,
  }));

  const byFreelancerChart = freelancerSummaries.map((summary) => ({
    name: summary.profile.fullName.split(" ")[0],
    trabalhos: summary.completedSlots,
    saldo: summary.balance / 100,
  }));

  const serviceChart = getServiceRevenueRows(
    eventServices,
    professionalSlots,
  ).reduce<Array<{ name: string; valor: number; profissionais: number }>>(
    (rows, row) => {
      const existing = rows.find(
        (item) => item.name === row.service.serviceNameSnapshot,
      );
      if (existing) {
        existing.valor += row.totalAgreedFee / 100;
        existing.profissionais += row.professionals;
        return rows;
      }
      return [
        ...rows,
        {
          name: row.service.serviceNameSnapshot,
          valor: row.totalAgreedFee / 100,
          profissionais: row.professionals,
        },
      ];
    },
    [],
  );

  function addAudit(action: string, entityType: string, entityIdValue: string) {
    const createdAt = new Date().toISOString();
    setAuditLogs((current) => [
      {
        id: makeId("audit"),
        organizationId: organization.id,
        userId: currentUser.id,
        action,
        entityType,
        entityId: entityIdValue,
        oldValues: null,
        newValues: { source: "ui" },
        createdAt,
      },
      ...current,
    ]);
  }

  function updateEvent(nextEvent: EventRecord) {
    setEvents((current) =>
      current.map((event) => (event.id === nextEvent.id ? nextEvent : event)),
    );
  }

  function showToast(message: string) {
    setToast(message);
  }

  function handleCreateEvent(
    values: EventFormValues,
    publishAction: "draft" | "open" | "assign",
  ) {
    const startsAt = toIsoDateTime(
      values.date,
      values.allDay ? null : values.startTime,
    );
    const endsAt = values.allDay
      ? null
      : toIsoDateTime(values.date, values.endTime ?? values.startTime);
    const now = new Date().toISOString();
    const eventId = makeId("event");
    const totalFee = values.services.reduce(
      (sum, service) =>
        sum +
        service.slots.reduce(
          (slotSum, slot) => slotSum + parseMoneyToCents(slot.agreedFee),
          0,
        ),
      0,
    );

    const duplicateGoogleEvent = events.some(
      (event) =>
        values.googleCalendarId &&
        values.googleEventId &&
        event.googleCalendarId === values.googleCalendarId &&
        event.googleEventId === values.googleEventId,
    );

    if (duplicateGoogleEvent) {
      showToast("Este evento do Google Agenda já foi importado.");
      return;
    }

    const nextServices: EventService[] = values.services.map((service) => ({
      id: makeId("event-service"),
      organizationId: organization.id,
      eventId,
      serviceId: service.serviceId,
      serviceNameSnapshot: service.serviceNameSnapshot,
      quantityRequired: service.quantityRequired,
      notes: service.notes || null,
      createdAt: now,
      updatedAt: now,
    }));

    const nextSlots: EventProfessionalSlot[] = values.services.flatMap(
      (service, serviceIndex) =>
        service.slots.map((slot) => {
          const assignedFreelancerId =
            slot.assignmentMode === "direct"
              ? slot.assignedFreelancerId || null
              : null;
          return {
            id: makeId("slot"),
            organizationId: organization.id,
            eventId,
            eventServiceId: nextServices[serviceIndex].id,
            slotNumber: slot.slotNumber,
            assignmentMode: slot.assignmentMode,
            assignedFreelancerId,
            agreedFeeCents: parseMoneyToCents(slot.agreedFee),
            status:
              publishAction === "draft"
                ? "draft"
                : assignedFreelancerId
                  ? "assigned"
                  : "open",
            acceptedAt: assignedFreelancerId ? now : null,
            completedAt: null,
            cancelledAt: null,
            cancellationReason: null,
            notes: slot.notes || null,
            createdBy: admin.id,
            createdAt: now,
            updatedAt: now,
          };
        }),
    );

    const baseEvent: EventRecord = {
      id: eventId,
      organizationId: organization.id,
      title: values.title,
      serviceName: values.services
        .map((service) => service.serviceNameSnapshot)
        .join(", "),
      description: values.description ?? "",
      locationName: values.locationName,
      locationAddress: values.locationAddress ?? "",
      startsAt,
      endsAt,
      allDay: values.allDay,
      freelancerFeeCents: totalFee,
      status: publishAction === "draft" ? "draft" : "open",
      assignmentMode: nextSlots.some((slot) => slot.status === "open")
        ? "open"
        : "direct",
      assignedFreelancerId: null,
      googleCalendarId: values.googleCalendarId || null,
      googleEventId: values.googleEventId || null,
      googleEventLink: values.googleEventLink || null,
      source: values.source,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      createdBy: admin.id,
      createdAt: now,
      updatedAt: now,
    };
    const nextEvent = {
      ...baseEvent,
      status:
        publishAction === "draft"
          ? "draft"
          : recalculateEventStatus(baseEvent, nextSlots),
    };

    setEvents((current) =>
      [nextEvent, ...current].sort((a, b) =>
        a.startsAt.localeCompare(b.startsAt),
      ),
    );
    setEventServices((current) => [...nextServices, ...current]);
    setProfessionalSlots((current) => [...nextSlots, ...current]);
    addAudit("event.team_created", "events", nextEvent.id);
    setImportedEvent(null);
    showToast("Evento salvo com serviços e vagas profissionais.");
  }

  function handleAcceptSlot(slotId: string) {
    const slot = professionalSlots.find((item) => item.id === slotId);
    const event = slot ? events.find((item) => item.id === slot.eventId) : null;
    if (!slot || !event) return;

    const result = acceptOpenEventSlot({
      event,
      slot,
      freelancer: currentFreelancer,
      allSlots: professionalSlots,
      existingAcceptances: acceptances,
      acceptanceId: makeId("acceptance"),
      createdAt: new Date().toISOString(),
    });

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    setProfessionalSlots(result.slots);
    setAcceptances(result.acceptances);
    updateEvent(result.event);
    addAudit("slot.accepted", "event_professional_slots", slotId);
    showToast("Vaga aceita. Você ficou com este trabalho.");
  }

  function handleCompleteSlot(slotId: string) {
    const slot = professionalSlots.find((item) => item.id === slotId);
    const event = slot ? events.find((item) => item.id === slot.eventId) : null;
    const service = slot
      ? eventServices.find((item) => item.id === slot.eventServiceId)
      : null;
    if (!slot || !event) return;

    const result = completeSlotIdempotently({
      event,
      slot,
      allSlots: professionalSlots,
      entries,
      entryId: makeId("entry"),
      completedAt: new Date().toISOString(),
      actorId: admin.id,
      serviceName: service?.serviceNameSnapshot ?? "Serviço",
    });

    setProfessionalSlots(result.slots);
    setEntries(result.entries);
    updateEvent(result.event);
    addAudit("slot.completed", "event_professional_slots", slotId);
    showToast("Vaga concluída e valor individual gerado.");
  }

  function handleCompleteAll(eventId: string) {
    const event = events.find((item) => item.id === eventId);
    if (!event) return;
    const result = completeAllAssignedSlots({
      event,
      slots: professionalSlots,
      services: eventServices,
      entries,
      idFactory: makeId,
      completedAt: new Date().toISOString(),
      actorId: admin.id,
    });

    setProfessionalSlots(result.slots);
    setEntries(result.entries);
    updateEvent(result.event);
    addAudit("event.all_slots_completed", "events", eventId);
    showToast("Todas as vagas preenchidas foram concluídas.");
  }

  function handleReopenSlot(slotId: string) {
    const slot = professionalSlots.find((item) => item.id === slotId);
    const event = slot ? events.find((item) => item.id === slot.eventId) : null;
    if (!slot || !event) return;
    const result = reopenSlot({
      event,
      slot,
      allSlots: professionalSlots,
      reopenedAt: new Date().toISOString(),
    });
    setProfessionalSlots(result.slots);
    updateEvent(result.event);
    addAudit("slot.reopened", "event_professional_slots", slotId);
    showToast("Vaga reaberta.");
  }

  function handleCancelSlot(slotId: string) {
    const slot = professionalSlots.find((item) => item.id === slotId);
    const event = slot ? events.find((item) => item.id === slot.eventId) : null;
    if (!slot || !event) return;
    const result = cancelSlot({
      event,
      slot,
      allSlots: professionalSlots,
      cancelledAt: new Date().toISOString(),
      reason:
        "Esta vaga possui histórico e foi cancelada sem exclusão silenciosa.",
    });
    setProfessionalSlots(result.slots);
    updateEvent(result.event);
    addAudit("slot.cancelled", "event_professional_slots", slotId);
    showToast("Vaga cancelada e preservada no histórico.");
  }

  function handleCancelEvent(eventId: string) {
    const cancelledAt = new Date().toISOString();
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? {
              ...event,
              status: "cancelled",
              cancelledAt,
              cancellationReason: "Cancelado pela equipe administrativa.",
              updatedAt: cancelledAt,
            }
          : event,
      ),
    );
    setProfessionalSlots((current) =>
      current.map((slot) =>
        slot.eventId === eventId
          ? {
              ...slot,
              status: "cancelled",
              cancelledAt,
              cancellationReason: "Evento cancelado.",
              updatedAt: cancelledAt,
            }
          : slot,
      ),
    );
    addAudit("event.cancelled", "events", eventId);
    showToast("Evento cancelado e vagas preservadas no histórico.");
  }

  function handleFinancialSubmit(values: FinancialEntryFormValues) {
    const amount = parseMoneyToCents(values.amount);
    const selectedSlot = professionalSlots.find(
      (slot) => slot.id === values.eventProfessionalSlotId,
    );
    const eventId = selectedSlot?.eventId ?? values.eventId ?? null;
    const slotId = selectedSlot?.id ?? values.eventProfessionalSlotId ?? null;
    const signedEntry =
      values.entryType === "payment" || values.entryType === "advance"
        ? registerPayment({
            id: makeId("entry"),
            organizationId: organization.id,
            freelancerId: values.freelancerId,
            eventId,
            eventProfessionalSlotId: slotId,
            amountCents: amount,
            entryType: values.entryType,
            description: values.description,
            effectiveDate: values.effectiveDate,
            createdBy: admin.id,
            createdAt: new Date().toISOString(),
          })
        : {
            id: makeId("entry"),
            organizationId: organization.id,
            freelancerId: values.freelancerId,
            eventId,
            eventProfessionalSlotId: slotId,
            entryType: values.entryType,
            description: values.description,
            amountCents:
              values.entryType === "negative_adjustment"
                ? -Math.abs(amount)
                : Math.abs(amount),
            effectiveDate: values.effectiveDate,
            createdBy: admin.id,
            createdAt: new Date().toISOString(),
            reversedEntryId: null,
          };

    setEntries((current) => [signedEntry, ...current]);
    addAudit("payment.created", "financial_entries", signedEntry.id);
    showToast("Lançamento financeiro registrado para o profissional.");
  }

  function handleInviteFreelancer(values: FreelancerFormValues) {
    const profile: Profile = {
      id: makeId("profile"),
      organizationId: organization.id,
      role: "freelancer",
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      pixKey: values.pixKey || null,
      avatarUrl: null,
      notes: values.notes || null,
      isActive: values.isActive,
    };
    setProfiles((current) => [...current, profile]);
    addAudit("freelancer.invited", "profiles", profile.id);
    showToast("Freelancer autorizado para primeiro acesso com Google.");
  }

  function exportCsv() {
    const header = "data,tipo,freelancer,evento,vaga,descricao,valor";
    const lines = entries.map((entry) => {
      const profile = profiles.find((item) => item.id === entry.freelancerId);
      const event = events.find((item) => item.id === entry.eventId);
      const slot = professionalSlots.find(
        (item) => item.id === entry.eventProfessionalSlotId,
      );
      const service = slot
        ? eventServices.find((item) => item.id === slot.eventServiceId)
        : null;
      return [
        entry.effectiveDate,
        entry.entryType,
        profile?.fullName ?? "",
        event?.title ?? "",
        service
          ? `${service.serviceNameSnapshot} - Vaga ${slot?.slotNumber}`
          : "",
        entry.description,
        (entry.amountCents / 100).toFixed(2),
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",");
    });
    navigator.clipboard?.writeText([header, ...lines].join("\n"));
    showToast("CSV copiado para a área de transferência.");
  }

  function renderView() {
    if (view === "admin-dashboard") {
      return (
        <AdminDashboard
          auditLogs={auditLogs}
          entries={entries}
          eventServices={eventServices}
          events={events}
          metrics={adminMetrics}
          monthlyChart={monthlyChart}
          profiles={profiles}
          serviceChart={serviceChart}
          slots={professionalSlots}
          statusChart={statusChart}
          summaries={freelancerSummaries}
          onCancel={handleCancelEvent}
          onCompleteAll={handleCompleteAll}
        />
      );
    }

    if (view === "admin-events") {
      return (
        <AdminEvents
          entries={entries}
          eventServices={eventServices}
          events={visibleEvents}
          profiles={profiles}
          services={services}
          slots={professionalSlots}
          onCancel={handleCancelEvent}
          onCompleteAll={handleCompleteAll}
        />
      );
    }

    if (view === "admin-event-new" || view === "admin-event-edit") {
      return (
        <>
          <EventEditor
            importedEvent={importedEvent}
            profiles={profiles}
            services={services}
            title={view === "admin-event-new" ? "Novo evento" : "Editar evento"}
            onOpenGoogle={() => setGoogleDialogOpen(true)}
            onSubmit={handleCreateEvent}
          />
          <GoogleCalendarImportDialog
            connected={calendarConnected}
            existingEvents={events}
            googleEvents={workspaceData.googleEvents}
            isOpen={googleDialogOpen}
            onClose={() => setGoogleDialogOpen(false)}
            onConnect={() => {
              setCalendarConnected(true);
              showToast("Conexão pronta para OAuth do Google Agenda.");
            }}
            onSelect={(event) => {
              setImportedEvent(event);
              setGoogleDialogOpen(false);
              showToast("Evento selecionado. Defina serviços e equipe.");
            }}
          />
        </>
      );
    }

    if (view === "admin-services") {
      return (
        <AdminServices
          organizationId={organization.id}
          services={services}
          onSave={(service) => {
            setServices((current) => {
              const exists = current.some((item) => item.id === service.id);
              return exists
                ? current.map((item) =>
                    item.id === service.id ? service : item,
                  )
                : [service, ...current];
            });
            addAudit("service.saved", "services", service.id);
            showToast("Serviço salvo no catálogo.");
          }}
        />
      );
    }

    if (view === "admin-event-detail") {
      return (
        <EventDetail
          auditLogs={auditLogs}
          entries={entries}
          event={selectedEvent}
          eventServices={eventServices}
          profiles={profiles}
          slots={professionalSlots}
          onCancelEvent={handleCancelEvent}
          onCancelSlot={handleCancelSlot}
          onCompleteAll={handleCompleteAll}
          onCompleteSlot={handleCompleteSlot}
          onReopenSlot={handleReopenSlot}
        />
      );
    }

    if (view === "admin-freelancers") {
      return (
        <FreelancersPage
          summaries={freelancerSummaries}
          onSelectFreelancer={setSelectedFreelancerId}
        />
      );
    }

    if (view === "admin-freelancer-new") {
      return <FreelancerNew onSubmit={handleInviteFreelancer} />;
    }

    if (view === "admin-freelancer-detail") {
      return (
        <FreelancerDetail
          entries={entries}
          events={events}
          eventServices={eventServices}
          profile={selectedFreelancer}
          slots={professionalSlots}
          onToggleActive={() => {
            setProfiles((current) =>
              current.map((profile) =>
                profile.id === selectedFreelancer.id
                  ? { ...profile, isActive: !profile.isActive }
                  : profile,
              ),
            );
            addAudit(
              "freelancer.status_changed",
              "profiles",
              selectedFreelancer.id,
            );
            showToast("Situação do freelancer atualizada.");
          }}
        />
      );
    }

    if (view === "admin-finance" || view === "admin-financial-entries") {
      return (
        <AdminFinance
          balancesByFreelancer={balancesByFreelancer}
          entries={entries}
          eventServices={eventServices}
          events={events}
          metrics={adminMetrics}
          profiles={profiles}
          showForm={view === "admin-financial-entries"}
          slots={professionalSlots}
          onExportCsv={exportCsv}
          onSubmit={handleFinancialSubmit}
        />
      );
    }

    if (view === "admin-reports") {
      return (
        <ReportsPage
          byFreelancerChart={byFreelancerChart}
          monthlyChart={monthlyChart}
          serviceChart={serviceChart}
          statusChart={statusChart}
        />
      );
    }

    if (view === "admin-settings") {
      return (
        <SettingsPage
          calendarConnected={calendarConnected}
          organization={organization}
          services={services}
          onConnectCalendar={() => setCalendarConnected(true)}
        />
      );
    }

    if (view === "admin-integrations" || view === "admin-google-calendar") {
      return (
        <IntegrationsPage
          calendarConnected={calendarConnected}
          onConnect={() => setCalendarConnected(true)}
          onDisconnect={() => setCalendarConnected(false)}
        />
      );
    }

    if (view === "freelancer-dashboard") {
      return (
        <FreelancerDashboard
          entries={visibleEntries}
          eventServices={eventServices}
          events={visibleEvents}
          freelancer={currentFreelancer}
          metrics={freelancerMetrics}
          slots={visibleSlots}
          onAccept={handleAcceptSlot}
        />
      );
    }

    if (view === "freelancer-events" || view === "freelancer-opportunities") {
      return (
        <FreelancerEvents
          entries={visibleEntries}
          eventServices={eventServices}
          events={visibleEvents}
          freelancer={currentFreelancer}
          opportunitiesOnly={view === "freelancer-opportunities"}
          slots={visibleSlots}
          onAccept={handleAcceptSlot}
        />
      );
    }

    if (view === "freelancer-finance") {
      return (
        <FreelancerFinance
          entries={visibleEntries}
          eventServices={eventServices}
          events={visibleEvents}
          freelancer={currentFreelancer}
          slots={visibleSlots}
        />
      );
    }

    return (
      <FreelancerProfile
        freelancer={currentFreelancer}
        profiles={activeFreelancers}
        onSelectFreelancer={setSelectedFreelancerId}
      />
    );
  }

  if (role === "freelancer") {
    return (
      <FreelancerShell canSwitchAreas={canSwitchAreas} user={currentFreelancer}>
        <Toast message={toast} onClose={() => setToast("")} />
        {renderView()}
      </FreelancerShell>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--border)] bg-white px-4 lg:hidden">
        <strong>Traços Freelance</strong>
        <Button
          aria-label="Abrir menu"
          onClick={() => setMobileOpen(true)}
          size="icon"
          variant="ghost"
        >
          <Menu size={20} />
        </Button>
      </div>
      <div className="grid lg:grid-cols-[280px_1fr]">
        <Sidebar
          canSwitchAreas={canSwitchAreas}
          links={adminLinks}
          mobileOpen={mobileOpen}
          role={role}
          user={currentUser}
          onClose={() => setMobileOpen(false)}
        />
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <Toast message={toast} onClose={() => setToast("")} />
          {renderView()}
        </main>
      </div>
    </div>
  );
}

function FreelancerShell({
  canSwitchAreas,
  user,
  children,
}: {
  canSwitchAreas: boolean;
  user: Profile;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[var(--brand)] font-black text-[var(--brand-contrast)]">
              TD
            </span>
            <div className="min-w-0">
              <strong className="block truncate text-sm text-[var(--text)]">
                Traços Freelance
              </strong>
              <span className="block truncate text-xs text-[var(--muted)]">
                {user.fullName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canSwitchAreas ? (
              <LinkButton
                href="/selecionar-area"
                prefetch={false}
                size="sm"
                variant="ghost"
              >
                <LayoutDashboard size={14} />
                Trocar de área
              </LinkButton>
            ) : null}
            <span className="hidden h-9 w-9 place-items-center rounded-full bg-[var(--surface-muted)] text-xs font-black text-[var(--text)] sm:grid">
              {initials(user.fullName)}
            </span>
            <LinkButton href="/auth/logout" size="sm" variant="secondary">
              <LogOut size={14} />
              Sair
            </LinkButton>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
          {[
            ["#inicio", "Início"],
            ["#trabalhos", "Trabalhos"],
            ["#oportunidades", "Oportunidades"],
            ["#financeiro", "Financeiro"],
          ].map(([href, label]) => (
            <a
              className="whitespace-nowrap rounded-md border border-[var(--border)] bg-white px-3 py-2 text-xs font-bold text-[var(--text)]"
              href={href}
              key={href}
            >
              {label}
            </a>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}

function Sidebar({
  canSwitchAreas,
  links,
  user,
  role,
  mobileOpen,
  onClose,
}: {
  canSwitchAreas: boolean;
  links: typeof adminLinks;
  user: Profile;
  role: "admin" | "freelancer";
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {mobileOpen ? (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 -translate-x-full flex-col border-r border-white/10 bg-[var(--graphite)] text-white transition lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          mobileOpen && "translate-x-0",
        )}
      >
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-md bg-[var(--brand)] font-black text-[var(--brand-contrast)]">
              TD
            </span>
            <div>
              <strong>Traços Freelance</strong>
              <span className="block text-xs text-white/60">
                Equipes, vagas e financeiro
              </span>
            </div>
          </div>
          <Button
            className="text-white lg:hidden"
            onClick={onClose}
            size="icon"
            variant="ghost"
          >
            <X size={18} />
          </Button>
        </div>
        <nav className="grid gap-1 px-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white"
                href={link.href}
                key={link.href}
                prefetch={false}
              >
                <Icon size={18} />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto grid gap-3 p-4">
          {canSwitchAreas ? (
            <LinkButton
              href="/selecionar-area"
              prefetch={false}
              variant="secondary"
            >
              <LayoutDashboard size={16} />
              Trocar de área
            </LinkButton>
          ) : null}
          <div className="flex items-center gap-3 rounded-md bg-white/8 p-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-white/15 text-xs font-black">
              {initials(user.fullName)}
            </span>
            <div>
              <strong className="block text-sm">{user.fullName}</strong>
              <span className="text-xs text-white/60">
                {role === "admin" ? "Administrador" : "Freelancer"}
              </span>
            </div>
          </div>
          <LinkButton href="/auth/logout" variant="secondary">
            <LogOut size={16} />
            Sair
          </LinkButton>
        </div>
      </aside>
    </>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-white p-3 text-sm shadow-sm">
      <span>{message}</span>
      <Button onClick={onClose} size="icon" variant="ghost">
        <X size={16} />
      </Button>
    </div>
  );
}

function AdminDashboard({
  metrics,
  events,
  eventServices,
  slots,
  entries,
  profiles,
  summaries,
  auditLogs,
  monthlyChart,
  statusChart,
  serviceChart,
  onCompleteAll,
  onCancel,
}: {
  metrics: ReturnType<typeof getAdminMetrics>;
  events: EventRecord[];
  eventServices: EventService[];
  slots: EventProfessionalSlot[];
  entries: FinancialEntry[];
  profiles: Profile[];
  summaries: ReturnType<typeof getFreelancerSummaries>;
  auditLogs: AuditLog[];
  monthlyChart: Array<Record<string, string | number>>;
  statusChart: Array<{ name: string; value: number }>;
  serviceChart: Array<{ name: string; valor: number; profissionais: number }>;
  onCompleteAll: (eventId: string) => void;
  onCancel: (eventId: string) => void;
}) {
  return (
    <>
      <PageHeader
        actions={
          <LinkButton href="/admin/eventos/novo" variant="bronze">
            <Plus size={16} />
            Novo evento
          </LinkButton>
        }
        description="Eventos, vagas profissionais, saldos e aceite de parceiros."
        eyebrow="Admin"
        title="Dashboard da empresa"
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Eventos futuros ou em andamento"
          icon={CalendarDays}
          title="Próximos eventos"
          value={metrics.upcomingEvents}
        />
        <StatCard
          description="Eventos realizados no período"
          icon={CheckCircle2}
          title="Eventos realizados"
          tone="green"
          value={metrics.completedThisMonth}
        />
        <StatCard
          description="Eventos sem pendências de equipe"
          icon={CheckCircle2}
          title="Equipes completas"
          tone="green"
          value={metrics.fullyAssignedEvents}
        />
        <StatCard
          description="Eventos com vagas abertas ou pendentes"
          icon={CalendarClock}
          title="Equipes incompletas"
          tone="red"
          value={metrics.incompleteEvents}
        />
        <StatCard
          description="Aguardando aceite dos parceiros"
          icon={ClipboardList}
          title="Vagas abertas"
          tone="blue"
          value={metrics.openSlots}
        />
        <StatCard
          description="Próximos eventos e serviços"
          icon={Users}
          title="Profissionais necessários"
          value={metrics.neededProfessionals}
        />
        <StatCard
          description="Soma dos valores combinados"
          icon={Wallet}
          title="Valor previsto"
          value={formatMoney(metrics.forecastValue)}
        />
        <StatCard
          description="Receitas de vagas concluídas"
          icon={Banknote}
          title="Valor gerado"
          tone="green"
          value={formatMoney(metrics.generatedThisMonth)}
        />
        <StatCard
          description="Pagamentos e adiantamentos"
          icon={CreditCard}
          title="Valor recebido"
          tone="blue"
          value={formatMoney(metrics.paidThisMonth)}
        />
        <StatCard
          description="Saldo positivo dos parceiros"
          icon={Wallet}
          title="Total a pagar"
          tone="red"
          value={formatMoney(metrics.totalDue)}
        />
        <StatCard
          description="Saldos negativos dos parceiros"
          icon={CreditCard}
          title="Adiantamentos"
          tone="blue"
          value={formatMoney(metrics.totalAdvances)}
        />
        <StatCard
          description={describeBalance(metrics.netBalance, "admin")}
          icon={Wallet}
          title="Saldo líquido"
          value={formatMoney(Math.abs(metrics.netBalance))}
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Próximos eventos</CardTitle>
            <CardDescription>
              Cada card mostra o progresso real da equipe.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {events
              .filter((event) => event.status !== "completed")
              .slice(0, 5)
              .map((event) => (
                <EventOverviewCard
                  entries={entries}
                  event={event}
                  eventServices={eventServicesForEvent(eventServices, event.id)}
                  key={event.id}
                  profiles={profiles}
                  slots={slots}
                  onCancel={onCancel}
                  onCompleteAll={onCompleteAll}
                />
              ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valor por serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer height={260} width="100%">
              <BarChart data={serviceChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatMoney(Number(value) * 100)}
                />
                <Bar dataKey="valor" fill="#2f7a78" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Vagas e valores por mês">
          <ResponsiveContainer height={300} width="100%">
            <AreaChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => formatMoney(Number(value) * 100)}
              />
              <Legend />
              <Area dataKey="gerado" fill="#2f7a78" stroke="#2f7a78" />
              <Area dataKey="pago" fill="#496aaf" stroke="#496aaf" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Status dos eventos">
          <ResponsiveContainer height={300} width="100%">
            <PieChart>
              <Pie data={statusChart} dataKey="value" outerRadius={96}>
                {statusChart.map((_, index) => (
                  <Cell
                    fill={chartColors[index % chartColors.length]}
                    key={index}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <FreelancerSummaryGrid summaries={summaries} />
        <AuditTimeline logs={auditLogs} profiles={profiles} />
      </div>
    </>
  );
}

function AdminEvents({
  events,
  slots,
  eventServices,
  services,
  entries,
  profiles,
  onCompleteAll,
  onCancel,
}: {
  events: EventRecord[];
  slots: EventProfessionalSlot[];
  eventServices: EventService[];
  services: ServiceRecord[];
  entries: FinancialEntry[];
  profiles: Profile[];
  onCompleteAll: (eventId: string) => void;
  onCancel: (eventId: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [freelancerFilter, setFreelancerFilter] = useState("all");
  const [query, setQuery] = useState("");
  const filtered = events.filter((event) => {
    const eventSlots = getEventSlots(slots, event.id);
    const services = eventServicesForEvent(eventServices, event.id);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "complete" &&
        (event.status === "fully_assigned" || event.status === "completed")) ||
      (statusFilter === "incomplete" &&
        (event.status === "open" || event.status === "partially_assigned")) ||
      (statusFilter === "open_slots" &&
        eventSlots.some((slot) => slot.status === "open"));
    const matchesService =
      serviceFilter === "all" ||
      services.some((service) => service.serviceId === serviceFilter);
    const matchesFreelancer =
      freelancerFilter === "all" ||
      eventSlots.some((slot) => slot.assignedFreelancerId === freelancerFilter);
    const matchesQuery = `${event.title} ${event.locationName}`
      .toLowerCase()
      .includes(query.toLowerCase());

    return matchesStatus && matchesService && matchesFreelancer && matchesQuery;
  });

  return (
    <>
      <PageHeader
        actions={
          <LinkButton href="/admin/eventos/novo" variant="bronze">
            <Plus size={16} />
            Novo evento
          </LinkButton>
        }
        description="Eventos com serviços, vagas abertas, equipe e financeiro."
        eyebrow="Eventos"
        title="Controle de eventos"
      />
      <Card className="mb-5">
        <CardContent className="grid gap-3 p-4 md:grid-cols-5">
          <Field label="Buscar">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="complete">Equipe completa</option>
              <option value="incomplete">Equipe incompleta</option>
              <option value="open_slots">Com vagas abertas</option>
            </Select>
          </Field>
          <Field label="Serviço">
            <Select
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Freelancer">
            <Select
              value={freelancerFilter}
              onChange={(event) => setFreelancerFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              {profiles
                .filter((profile) => profileHasRole(profile, "freelancer"))
                .map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.fullName}
                  </option>
                ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Badge tone="brand">{filtered.length} eventos</Badge>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {filtered.map((event) => (
          <EventOverviewCard
            entries={entries}
            event={event}
            eventServices={eventServicesForEvent(eventServices, event.id)}
            key={event.id}
            profiles={profiles}
            slots={slots}
            onCancel={onCancel}
            onCompleteAll={onCompleteAll}
          />
        ))}
      </div>
    </>
  );
}

function EventEditor({
  title,
  profiles,
  services,
  importedEvent,
  onSubmit,
  onOpenGoogle,
}: {
  title: string;
  profiles: Profile[];
  services: ServiceRecord[];
  importedEvent: GoogleCalendarEvent | null;
  onSubmit: (
    values: EventFormValues,
    action: "draft" | "open" | "assign",
  ) => void;
  onOpenGoogle: () => void;
}) {
  return (
    <>
      <PageHeader
        description="Defina serviços, quantidade de profissionais e vagas individuais."
        eyebrow="Eventos"
        title={title}
      />
      <EventForm
        freelancers={profiles.filter(
          (profile) =>
            profileHasRole(profile, "freelancer") && profile.isActive,
        )}
        importedEvent={importedEvent}
        services={services}
        onOpenGoogle={onOpenGoogle}
        onSubmit={onSubmit}
      />
    </>
  );
}

function EventDetail({
  event,
  eventServices,
  slots,
  profiles,
  entries,
  auditLogs,
  onCompleteSlot,
  onReopenSlot,
  onCancelSlot,
  onCompleteAll,
  onCancelEvent,
}: {
  event: EventRecord;
  eventServices: EventService[];
  slots: EventProfessionalSlot[];
  profiles: Profile[];
  entries: FinancialEntry[];
  auditLogs: AuditLog[];
  onCompleteSlot: (slotId: string) => void;
  onReopenSlot: (slotId: string) => void;
  onCancelSlot: (slotId: string) => void;
  onCompleteAll: (eventId: string) => void;
  onCancelEvent: (eventId: string) => void;
}) {
  const services = eventServicesForEvent(eventServices, event.id);
  const eventSlots = getEventSlots(slots, event.id);
  const summary = getEventTeamSummary(event, slots, entries);

  return (
    <>
      <PageHeader
        actions={
          <>
            <Button onClick={() => onCompleteAll(event.id)} variant="bronze">
              Concluir todas as vagas
            </Button>
            <Button onClick={() => onCancelEvent(event.id)} variant="danger">
              Cancelar evento
            </Button>
          </>
        }
        description={`${formatDateTimeRange(event.startsAt, event.endsAt)} - ${event.locationName}`}
        eyebrow="Detalhes do evento"
        title={event.title}
      />
      <EventTeamSummary {...summary} />
      <section className="mt-5 grid gap-4">
        <div>
          <h2 className="text-xl font-black text-[var(--text)]">
            Equipe e serviços
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Vagas agrupadas por serviço, com valor e saldo individual.
          </p>
        </div>
        {services.map((service) => (
          <ServiceGroupCard
            entries={entries}
            key={service.id}
            profiles={profiles}
            service={service}
            showActions
            slots={eventSlots.filter(
              (slot) => slot.eventServiceId === service.id,
            )}
            onCancel={onCancelSlot}
            onComplete={onCompleteSlot}
            onReopen={onReopenSlot}
          />
        ))}
      </section>
      <div className="mt-5">
        <LedgerCard
          entries={entries.filter((entry) => entry.eventId === event.id)}
          eventServices={eventServices}
          events={[event]}
          profiles={profiles}
          slots={slots}
        />
      </div>
      <div className="mt-5">
        <AuditTimeline
          logs={auditLogs
            .filter((log) => log.entityId === event.id)
            .slice(0, 6)}
          profiles={profiles}
        />
      </div>
    </>
  );
}

function EventOverviewCard({
  event,
  eventServices,
  slots,
  entries,
  profiles,
  onCompleteAll,
  onCancel,
}: {
  event: EventRecord;
  eventServices: EventService[];
  slots: EventProfessionalSlot[];
  entries: FinancialEntry[];
  profiles: Profile[];
  onCompleteAll: (eventId: string) => void;
  onCancel: (eventId: string) => void;
}) {
  const eventSlots = getActiveEventSlots(slots, event.id);
  const summary = getEventTeamSummary(event, slots, entries);
  const serviceNames = eventServices.map(
    (service) => service.serviceNameSnapshot,
  );
  const assignedNames = eventSlots
    .map((slot) =>
      profiles.find((profile) => profile.id === slot.assignedFreelancerId),
    )
    .filter(Boolean)
    .map((profile) => profile!.fullName.split(" ")[0]);

  return (
    <Card>
      <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_340px_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <EventStatusBadge status={event.status} />
            <span className="text-xs font-semibold text-[var(--muted)]">
              {formatDateTimeRange(event.startsAt, event.endsAt)}
            </span>
          </div>
          <Link
            className="mt-2 block text-lg font-black text-[var(--text)] hover:text-[var(--brand)]"
            href={`/admin/eventos/${event.id}`}
          >
            {event.title}
          </Link>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {event.locationName}
          </p>
          <p className="mt-2 text-sm">
            <strong>Serviços:</strong> {serviceNames.join(", ")}
          </p>
          {assignedNames.length > 0 ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Escalados: {assignedNames.join(", ")}
            </p>
          ) : null}
        </div>
        <EventTeamProgress
          assigned={summary.assignedSlots}
          open={summary.openSlots}
          total={summary.totalSlots}
        />
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Badge tone="brand">{formatMoney(summary.totalAgreedFee)}</Badge>
          <Button
            onClick={() => onCompleteAll(event.id)}
            size="sm"
            variant="bronze"
          >
            Concluir
          </Button>
          <Button
            onClick={() => onCancel(event.id)}
            size="sm"
            variant="secondary"
          >
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FreelancersPage({
  summaries,
  onSelectFreelancer,
}: {
  summaries: ReturnType<typeof getFreelancerSummaries>;
  onSelectFreelancer: (id: string) => void;
}) {
  return (
    <>
      <PageHeader
        actions={
          <LinkButton href="/admin/freelancers/novo" variant="bronze">
            <UserPlus size={16} />
            Novo freelancer
          </LinkButton>
        }
        description="Parceiros, trabalhos realizados, valores gerados e saldos."
        eyebrow="Freelancers"
        title="Parceiros"
      />
      <FreelancerSummaryGrid
        summaries={summaries}
        onSelectFreelancer={onSelectFreelancer}
      />
    </>
  );
}

function FreelancerSummaryGrid({
  summaries,
  onSelectFreelancer,
}: {
  summaries: ReturnType<typeof getFreelancerSummaries>;
  onSelectFreelancer?: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {summaries.map((summary) => (
        <Card className="min-w-0" key={summary.profile.id}>
          <CardContent className="flex h-full min-w-0 flex-col gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[var(--graphite)] text-sm font-black text-white">
                {initials(summary.profile.fullName)}
              </span>
              <div className="min-w-0">
                <strong
                  className="block truncate text-sm leading-5 text-[var(--text)]"
                  title={summary.profile.fullName}
                >
                  {summary.profile.fullName}
                </strong>
                <span
                  className="block max-w-full truncate text-xs text-[var(--muted)]"
                  title={summary.profile.email}
                >
                  {summary.profile.email}
                </span>
              </div>
              <Badge
                className="ml-auto shrink-0"
                tone={summary.profile.isActive ? "success" : "danger"}
              >
                {freelancerAccessStatus(summary.profile)}
              </Badge>
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2 text-sm">
              <MetricBox label="Trabalhos" value={summary.completedSlots} />
              <MetricBox
                label="Gerado"
                value={formatMoney(summary.totalGenerated)}
              />
              <MetricBox label="Pago" value={formatMoney(summary.totalPaid)} />
              <MetricBox label="Saldo" value={formatMoney(summary.balance)} />
            </div>
            {summary.nextEvent ? (
              <p
                className="line-clamp-2 min-h-10 text-sm leading-5 text-[var(--muted)]"
                title={`Próximo: ${summary.nextEvent.title}`}
              >
                Próximo: {summary.nextEvent.title}
              </p>
            ) : null}
            {onSelectFreelancer ? (
              <LinkButton
                className="mt-auto w-full"
                href={`/admin/freelancers/${summary.profile.id}`}
                onClick={() => onSelectFreelancer(summary.profile.id)}
                variant="secondary"
              >
                Ver perfil
              </LinkButton>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FreelancerNew({
  onSubmit,
}: {
  onSubmit: (values: FreelancerFormValues) => void;
}) {
  const [values, setValues] = useState<FreelancerFormValues>({
    fullName: "",
    email: "",
    phone: "",
    pixKey: "",
    notes: "",
    isActive: true,
  });

  return (
    <>
      <PageHeader
        description="Cadastre o e-mail Google autorizado antes do primeiro acesso."
        eyebrow="Freelancers"
        title="Novo freelancer"
      />
      <Card>
        <CardContent className="grid gap-4 p-5">
          <Field label="Nome completo">
            <Input
              value={values.fullName}
              onChange={(event) =>
                setValues({ ...values, fullName: event.target.value })
              }
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="E-mail Google autorizado">
              <Input
                value={values.email}
                onChange={(event) =>
                  setValues({ ...values, email: event.target.value })
                }
              />
              <span className="mt-1 block text-xs text-[var(--muted)]">
                Informe o e-mail da conta Google que o freelancer utilizará para
                acessar o sistema.
              </span>
            </Field>
            <Field label="Telefone">
              <Input
                value={values.phone}
                onChange={(event) =>
                  setValues({ ...values, phone: event.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Pix">
            <Input
              value={values.pixKey ?? ""}
              onChange={(event) =>
                setValues({ ...values, pixKey: event.target.value })
              }
            />
          </Field>
          <Field label="Notas">
            <Textarea
              value={values.notes ?? ""}
              onChange={(event) =>
                setValues({ ...values, notes: event.target.value })
              }
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              checked={values.isActive}
              type="checkbox"
              onChange={(event) =>
                setValues({ ...values, isActive: event.target.checked })
              }
            />
            Freelancer ativo
          </label>
          <Button onClick={() => onSubmit(values)} variant="bronze">
            <UserPlus size={16} />
            Autorizar acesso
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function FreelancerDetail({
  profile,
  events,
  slots,
  eventServices,
  entries,
  onToggleActive,
}: {
  profile: Profile;
  events: EventRecord[];
  slots: EventProfessionalSlot[];
  eventServices: EventService[];
  entries: FinancialEntry[];
  onToggleActive: () => void;
}) {
  const freelancerSlots = slots.filter(
    (slot) => slot.assignedFreelancerId === profile.id,
  );
  const freelancerEntries = entries.filter(
    (entry) => entry.freelancerId === profile.id,
  );
  const balance = getFreelancerBalance(entries, profile.id);

  return (
    <>
      <PageHeader
        actions={
          <>
            <LinkButton href="/admin/financeiro/lancamentos" variant="bronze">
              Registrar pagamento
            </LinkButton>
            <Button
              onClick={onToggleActive}
              variant={profile.isActive ? "danger" : "secondary"}
            >
              {profile.isActive ? "Desativar" : "Ativar"}
            </Button>
          </>
        }
        description={profile.email}
        eyebrow="Freelancer"
        title={profile.fullName}
      />
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardContent className="grid gap-4 p-5">
            <BalanceDisplay cents={balance} />
            <InfoGrid
              rows={[
                ["Telefone", profile.phone],
                ["Pix", profile.pixKey ?? "Não informado"],
                ["Situação", profile.isActive ? "Ativo" : "Inativo"],
                ["Notas", profile.notes ?? "Sem observações"],
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Trabalhos e funções</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {freelancerSlots.map((slot) => {
              const event = events.find((item) => item.id === slot.eventId);
              const service = eventServices.find(
                (item) => item.id === slot.eventServiceId,
              );
              return (
                <div
                  className="rounded-lg border border-[var(--border)] p-3 text-sm"
                  key={slot.id}
                >
                  <strong>{event?.title}</strong>
                  <span className="block text-[var(--muted)]">
                    Função: {service?.serviceNameSnapshot} -{" "}
                    {formatMoney(slot.agreedFeeCents)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
      <LedgerCard
        className="mt-5"
        entries={freelancerEntries}
        eventServices={eventServices}
        events={events}
        profiles={[profile]}
        slots={slots}
      />
    </>
  );
}

function AdminServices({
  organizationId,
  services,
  onSave,
}: {
  organizationId: string;
  services: ServiceRecord[];
  onSave: (service: ServiceRecord) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = services.find((service) => service.id === editingId);
  const [values, setValues] = useState({
    name: "",
    description: "",
    defaultProfessionals: 1,
    defaultFee: "150,00",
    isActive: true,
  });

  function loadService(service: ServiceRecord) {
    setEditingId(service.id);
    setValues({
      name: service.name,
      description: service.description ?? "",
      defaultProfessionals: service.defaultProfessionals,
      defaultFee: service.defaultFeeCents
        ? String((service.defaultFeeCents / 100).toFixed(2)).replace(".", ",")
        : "",
      isActive: service.isActive,
    });
  }

  function resetForm() {
    setEditingId(null);
    setValues({
      name: "",
      description: "",
      defaultProfessionals: 1,
      defaultFee: "150,00",
      isActive: true,
    });
  }

  function submit() {
    const now = new Date().toISOString();
    onSave({
      id: editing?.id ?? makeId("service"),
      organizationId,
      name: values.name.trim(),
      description: values.description.trim() || null,
      defaultProfessionals: values.defaultProfessionals,
      defaultFeeCents: values.defaultFee
        ? parseMoneyToCents(values.defaultFee)
        : null,
      isActive: values.isActive,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    });
    resetForm();
  }

  return (
    <>
      <PageHeader
        description="Catálogo usado na criação dos eventos e nas sugestões de vagas."
        eyebrow="Admin"
        title="Serviços"
      />
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{editing ? "Editar serviço" : "Novo serviço"}</CardTitle>
            <CardDescription>
              O valor final continua pertencendo a cada vaga do evento.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Nome">
              <Input
                value={values.name}
                onChange={(event) =>
                  setValues({ ...values, name: event.target.value })
                }
              />
            </Field>
            <Field label="Descrição">
              <Textarea
                value={values.description}
                onChange={(event) =>
                  setValues({ ...values, description: event.target.value })
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Profissionais padrão">
                <Input
                  max={5}
                  min={1}
                  type="number"
                  value={values.defaultProfessionals}
                  onChange={(event) =>
                    setValues({
                      ...values,
                      defaultProfessionals: Math.min(
                        5,
                        Math.max(1, Number(event.target.value)),
                      ),
                    })
                  }
                />
              </Field>
              <Field label="Valor padrão">
                <Input
                  value={values.defaultFee}
                  onChange={(event) =>
                    setValues({ ...values, defaultFee: event.target.value })
                  }
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                checked={values.isActive}
                type="checkbox"
                onChange={(event) =>
                  setValues({ ...values, isActive: event.target.checked })
                }
              />
              Serviço ativo
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={!values.name.trim()}
                onClick={submit}
                variant="bronze"
              >
                Salvar serviço
              </Button>
              {editing ? (
                <Button onClick={resetForm} variant="secondary">
                  Cancelar edição
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <Card className="min-w-0" key={service.id}>
              <CardContent className="flex h-full min-w-0 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-[var(--text)]">
                      {service.name}
                    </strong>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                      {service.description ?? "Sem descrição."}
                    </p>
                  </div>
                  <Badge tone={service.isActive ? "success" : "neutral"}>
                    {service.isActive ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MetricBox
                    label="Profissionais"
                    value={service.defaultProfessionals}
                  />
                  <MetricBox
                    label="Valor padrão"
                    value={
                      service.defaultFeeCents
                        ? formatMoney(service.defaultFeeCents)
                        : "Sem valor"
                    }
                  />
                </div>
                <Button
                  className="mt-auto w-full"
                  onClick={() => loadService(service)}
                  variant="secondary"
                >
                  Editar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}

function AdminFinance({
  metrics,
  profiles,
  events,
  eventServices,
  slots,
  entries,
  balancesByFreelancer,
  showForm,
  onSubmit,
  onExportCsv,
}: {
  metrics: ReturnType<typeof getAdminMetrics>;
  profiles: Profile[];
  events: EventRecord[];
  eventServices: EventService[];
  slots: EventProfessionalSlot[];
  entries: FinancialEntry[];
  balancesByFreelancer: Record<string, number>;
  showForm: boolean;
  onSubmit: (values: FinancialEntryFormValues) => void;
  onExportCsv: () => void;
}) {
  const freelancers = profiles.filter((profile) =>
    profileHasRole(profile, "freelancer"),
  );
  const [freelancerFilter, setFreelancerFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const filteredEntries = entries.filter((entry) => {
    const slot = slots.find(
      (item) => item.id === entry.eventProfessionalSlotId,
    );
    const matchesFreelancer =
      freelancerFilter === "all" || entry.freelancerId === freelancerFilter;
    const matchesEvent = eventFilter === "all" || entry.eventId === eventFilter;
    const matchesService =
      serviceFilter === "all" || slot?.eventServiceId === serviceFilter;
    const matchesType = typeFilter === "all" || entry.entryType === typeFilter;
    return matchesFreelancer && matchesEvent && matchesService && matchesType;
  });

  return (
    <>
      <PageHeader
        actions={
          <>
            <Button onClick={onExportCsv} variant="secondary">
              <FileDown size={16} />
              Exportar CSV
            </Button>
            <LinkButton href="/admin/financeiro/lancamentos" variant="bronze">
              Novo lançamento
            </LinkButton>
          </>
        }
        description="Pagamentos gerais, por evento ou por vaga profissional."
        eyebrow="Financeiro"
        title="Controle financeiro"
      />
      <FinancialSummary
        advances={metrics.totalAdvances}
        generated={metrics.generatedThisMonth}
        netBalance={metrics.netBalance}
        paid={metrics.paidThisMonth}
        pending={metrics.totalDue}
      />
      <Card className="mt-5">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Freelancer">
            <Select
              value={freelancerFilter}
              onChange={(event) => setFreelancerFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              {freelancers.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Evento">
            <Select
              value={eventFilter}
              onChange={(event) => setEventFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Serviço">
            <Select
              value={serviceFilter}
              onChange={(event) => setServiceFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              {eventServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.serviceNameSnapshot}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tipo">
            <Select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
            >
              <option value="all">Todos</option>
              <option value="event_earning">Receita de evento</option>
              <option value="payment">Pagamento</option>
              <option value="advance">Adiantamento</option>
              <option value="positive_adjustment">Ajuste positivo</option>
              <option value="negative_adjustment">Ajuste negativo</option>
              <option value="reversal">Estorno</option>
            </Select>
          </Field>
        </CardContent>
      </Card>
      <div className="mt-5 grid gap-5 xl:grid-cols-[380px_1fr]">
        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle>Novo lançamento</CardTitle>
              <CardDescription>
                Se o evento tiver mais de um profissional, selecione o
                freelancer e a vaga específica.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialEntryForm
                balancesByFreelancer={balancesByFreelancer}
                eventServices={eventServices}
                events={events}
                freelancers={freelancers}
                slots={slots}
                onSubmit={onSubmit}
              />
            </CardContent>
          </Card>
        ) : null}
        <LedgerCard
          entries={filteredEntries}
          eventServices={eventServices}
          events={events}
          profiles={profiles}
          slots={slots}
        />
      </div>
    </>
  );
}

function ReportsPage({
  monthlyChart,
  statusChart,
  byFreelancerChart,
  serviceChart,
}: {
  monthlyChart: Array<Record<string, string | number>>;
  statusChart: Array<{ name: string; value: number }>;
  byFreelancerChart: Array<Record<string, string | number>>;
  serviceChart: Array<{ name: string; valor: number; profissionais: number }>;
}) {
  const [period, setPeriod] = useState("current_month");
  return (
    <>
      <PageHeader
        description="Relatórios por evento, serviço, vaga e freelancer."
        eyebrow="Relatórios"
        title="Análises da operação"
      />
      <Card className="mb-5">
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Período">
            <Select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="current_month">Mês atual</option>
              <option value="last_30">Últimos 30 dias</option>
              <option value="last_3_months">Últimos 3 meses</option>
              <option value="last_6_months">Últimos 6 meses</option>
              <option value="current_year">Ano atual</option>
              <option value="custom">Período personalizado</option>
            </Select>
          </Field>
          <Field label="Data inicial">
            <Input disabled={period !== "custom"} type="date" />
          </Field>
          <Field label="Data final">
            <Input disabled={period !== "custom"} type="date" />
          </Field>
          <div className="flex items-end">
            <Badge tone="brand">CSV disponível no financeiro</Badge>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Eventos por mês">
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="eventos" fill="#2f7a78" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Eventos por status">
          <ResponsiveContainer height={300} width="100%">
            <PieChart>
              <Pie data={statusChart} dataKey="value" outerRadius={96}>
                {statusChart.map((_, index) => (
                  <Cell
                    fill={chartColors[index % chartColors.length]}
                    key={index}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Valor por serviço">
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={serviceChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) => formatMoney(Number(value) * 100)}
              />
              <Bar dataKey="valor" fill="#496aaf" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Trabalhos por freelancer">
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={byFreelancerChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="trabalhos" fill="#236f59" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}

function SettingsPage({
  calendarConnected,
  organization,
  services,
  onConnectCalendar,
}: {
  calendarConnected: boolean;
  organization: Organization;
  services: ServiceRecord[];
  onConnectCalendar: () => void;
}) {
  return (
    <>
      <PageHeader
        description="Dados da organização e preferências de operação."
        eyebrow="Configurações"
        title="Traços Detalhados"
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organização</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Nome">
              <Input value={organization.name} readOnly />
            </Field>
            <Field label="Slug">
              <Input value={organization.slug} readOnly />
            </Field>
            <Field label="Timezone">
              <Input value={organization.timezone} readOnly />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Catálogo de serviços</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {services.map((service) => (
              <div
                className="rounded-lg border border-[var(--border)] p-3 text-sm"
                key={service.id}
              >
                <strong>{service.name}</strong>
                <span className="block text-[var(--muted)]">
                  Padrão: {service.defaultProfessionals} profissional(is) -{" "}
                  {service.defaultFeeCents
                    ? formatMoney(service.defaultFeeCents)
                    : "sem valor padrão"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Integrações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-4">
              <div>
                <strong>Google Agenda</strong>
                <span className="block text-sm text-[var(--muted)]">
                  {calendarConnected ? "Conectado" : "Não conectado"}
                </span>
              </div>
              <Button onClick={onConnectCalendar} variant="bronze">
                Conectar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function IntegrationsPage({
  calendarConnected,
  onConnect,
  onDisconnect,
}: {
  calendarConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  return (
    <>
      <PageHeader
        description="Conexão administrativa para ler eventos da agenda da empresa."
        eyebrow="Admin"
        title="Google Agenda"
      />
      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-md bg-[var(--surface-muted)] text-[var(--brand)]">
                <Plug size={18} />
              </span>
              <div>
                <strong className="text-lg text-[var(--text)]">
                  Google Agenda da empresa
                </strong>
                <p className="text-sm text-[var(--muted)]">
                  Esta conexão é separada do login com Google. O login autentica
                  usuários; esta autorização permite apenas ler eventos da
                  agenda da empresa. Serviços, equipe, valores e aceite são
                  definidos depois.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone={calendarConnected ? "success" : "warning"}>
                {calendarConnected ? "Conectado" : "Não conectado"}
              </Badge>
              <Badge tone="brand">calendar.readonly</Badge>
              <Badge tone="neutral">OAuth 2.0</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button onClick={onConnect} variant="bronze">
              {calendarConnected ? "Reconectar" : "Conectar Google Agenda"}
            </Button>
            <Button
              disabled={!calendarConnected}
              onClick={onDisconnect}
              variant="secondary"
            >
              Desconectar
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function FreelancerDashboard({
  freelancer,
  metrics,
  events,
  slots,
  eventServices,
  entries,
  onAccept,
}: {
  freelancer: Profile;
  metrics: ReturnType<typeof getFreelancerMetrics>;
  events: EventRecord[];
  slots: EventProfessionalSlot[];
  eventServices: EventService[];
  entries: FinancialEntry[];
  onAccept: (slotId: string) => void;
}) {
  const assignedSlots = slots.filter(
    (slot) => slot.assignedFreelancerId === freelancer.id,
  );
  const upcomingSlots = assignedSlots.filter(
    (slot) => slot.status !== "completed" && slot.status !== "cancelled",
  );
  const completedSlots = assignedSlots.filter(
    (slot) => slot.status === "completed",
  );
  const openSlots = getOpenSlotsForFreelancer(slots, freelancer.id);

  return (
    <>
      <section id="inicio">
        <PageHeader
          description="Tudo que você precisa acompanhar está reunido nesta página."
          eyebrow="Freelancer"
          title={`Olá, ${freelancer.fullName.split(" ")[0]}`}
        />
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          description="Trabalhos já designados"
          icon={CalendarClock}
          title="Próximos trabalhos"
          value={metrics.upcomingJobs}
        />
        <StatCard
          description="Eventos com trabalho concluído"
          icon={CheckCircle2}
          title="Eventos realizados"
          tone="green"
          value={metrics.completedEvents}
        />
        <StatCard
          description="Vagas profissionais concluídas"
          icon={ClipboardList}
          title="Trabalhos realizados"
          value={metrics.completedThisMonth}
        />
        <StatCard
          description="Receitas registradas"
          icon={Banknote}
          title="Valor gerado"
          value={formatMoney(metrics.generatedThisMonth)}
        />
        <StatCard
          description="Pagamentos e adiantamentos"
          icon={CreditCard}
          title="Valor recebido"
          tone="blue"
          value={formatMoney(metrics.paidThisMonth)}
        />
        <StatCard
          description={describeBalance(metrics.balance, "freelancer")}
          icon={Wallet}
          title="Saldo atual"
          tone={metrics.balance < 0 ? "red" : "green"}
          value={formatMoney(Math.abs(metrics.balance))}
        />
      </div>
      <section className="mt-5 grid gap-5 xl:grid-cols-2" id="trabalhos">
        <FreelancerSlotList
          entries={entries}
          eventServices={eventServices}
          events={events}
          slots={upcomingSlots}
          title="Próximos trabalhos"
        />
        <FreelancerSlotList
          entries={entries}
          eventServices={eventServices}
          events={events}
          slots={completedSlots}
          title="Eventos realizados"
        />
      </section>
      <section className="mt-5" id="oportunidades">
        <Card>
          <CardHeader>
            <CardTitle>Oportunidades abertas</CardTitle>
            <CardDescription>
              Vagas disponíveis para aceite na Traços Detalhados.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {openSlots.length > 0 ? (
              openSlots.map((slot) => {
                const event = events.find((item) => item.id === slot.eventId);
                const service = eventServices.find(
                  (item) => item.id === slot.eventServiceId,
                );
                if (!event || !service) return null;
                return (
                  <OpenSlotCard
                    event={event}
                    key={slot.id}
                    service={service}
                    slot={slot}
                    onAccept={onAccept}
                  />
                );
              })
            ) : (
              <EmptyState
                description="Novas vagas abertas aparecerão aqui."
                title="Sem oportunidades"
              />
            )}
          </CardContent>
        </Card>
      </section>
      <section
        className="mt-5 grid gap-5 xl:grid-cols-[360px_1fr]"
        id="financeiro"
      >
        <BalanceDisplay actor="freelancer" cents={metrics.balance} />
        <LedgerCard
          entries={entries}
          eventServices={eventServices}
          events={events}
          profiles={[freelancer]}
          slots={slots}
        />
      </section>
    </>
  );
}

function FreelancerEvents({
  freelancer,
  events,
  slots,
  eventServices,
  entries,
  opportunitiesOnly,
  onAccept,
}: {
  freelancer: Profile;
  events: EventRecord[];
  slots: EventProfessionalSlot[];
  eventServices: EventService[];
  entries: FinancialEntry[];
  opportunitiesOnly: boolean;
  onAccept: (slotId: string) => void;
}) {
  const relevantSlots = opportunitiesOnly
    ? getOpenSlotsForFreelancer(slots, freelancer.id)
    : slots.filter(
        (slot) =>
          slot.assignedFreelancerId === freelancer.id || slot.status === "open",
      );

  return (
    <>
      <PageHeader
        description="Cada card representa uma vaga profissional, não o evento inteiro."
        eyebrow={opportunitiesOnly ? "Oportunidades" : "Minha agenda"}
        title="Eventos e oportunidades"
      />
      <div className="grid gap-3">
        {relevantSlots.length > 0 ? (
          relevantSlots.map((slot) => {
            const event = events.find((item) => item.id === slot.eventId);
            const service = eventServices.find(
              (item) => item.id === slot.eventServiceId,
            );
            if (!event || !service) return null;
            if (slot.status === "open" && !slot.assignedFreelancerId) {
              return (
                <OpenSlotCard
                  event={event}
                  key={slot.id}
                  service={service}
                  slot={slot}
                  onAccept={onAccept}
                />
              );
            }
            return (
              <FreelancerAssignedSlotCard
                entries={entries}
                event={event}
                key={slot.id}
                service={service}
                slot={slot}
              />
            );
          })
        ) : (
          <EmptyState
            description="Nenhuma vaga encontrada para este filtro."
            title="Sem trabalhos"
          />
        )}
      </div>
    </>
  );
}

function FreelancerFinance({
  freelancer,
  events,
  slots,
  eventServices,
  entries,
}: {
  freelancer: Profile;
  events: EventRecord[];
  slots: EventProfessionalSlot[];
  eventServices: EventService[];
  entries: FinancialEntry[];
}) {
  const balance = getFreelancerBalance(entries, freelancer.id);
  return (
    <>
      <PageHeader
        description="Extrato individual por vaga, evento e pagamento."
        eyebrow="Meu financeiro"
        title="Extrato e saldo"
      />
      <BalanceDisplay actor="freelancer" cents={balance} />
      <LedgerCard
        className="mt-5"
        entries={entries}
        eventServices={eventServices}
        events={events}
        profiles={[freelancer]}
        slots={slots}
      />
    </>
  );
}

function FreelancerProfile({
  freelancer,
  profiles,
  onSelectFreelancer,
}: {
  freelancer: Profile;
  profiles: Profile[];
  onSelectFreelancer: (id: string) => void;
}) {
  return (
    <>
      <PageHeader
        description="Dados pessoais básicos que o freelancer pode consultar."
        eyebrow="Perfil"
        title={freelancer.fullName}
      />
      <Card>
        <CardContent className="grid gap-4 p-5">
          <Field label="Selecionar perfil">
            <Select
              value={freelancer.id}
              onChange={(event) => onSelectFreelancer(event.target.value)}
            >
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <InfoGrid
            rows={[
              ["E-mail", freelancer.email],
              ["Telefone", freelancer.phone],
              ["Pix", freelancer.pixKey ?? "Não informado"],
              ["Situação", freelancer.isActive ? "Ativo" : "Inativo"],
            ]}
          />
        </CardContent>
      </Card>
    </>
  );
}

function FreelancerSlotList({
  title,
  slots,
  events,
  eventServices,
  entries,
}: {
  title: string;
  slots: EventProfessionalSlot[];
  events: EventRecord[];
  eventServices: EventService[];
  entries: FinancialEntry[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {slots.length > 0 ? (
          slots.map((slot) => {
            const event = events.find((item) => item.id === slot.eventId);
            const service = eventServices.find(
              (item) => item.id === slot.eventServiceId,
            );
            if (!event || !service) return null;
            return (
              <FreelancerAssignedSlotCard
                entries={entries}
                event={event}
                key={slot.id}
                service={service}
                slot={slot}
              />
            );
          })
        ) : (
          <EmptyState
            description="Os trabalhos confirmados aparecerão aqui."
            title="Sem trabalhos"
          />
        )}
      </CardContent>
    </Card>
  );
}

function FreelancerAssignedSlotCard({
  event,
  service,
  slot,
  entries,
}: {
  event: EventRecord;
  service: EventService;
  slot: EventProfessionalSlot;
  entries: FinancialEntry[];
}) {
  const summary = getSlotFinancialSummary(slot, entries);
  return (
    <Card>
      <CardContent className="grid gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <strong>{event.title}</strong>
            <span className="block text-sm text-[var(--muted)]">
              Função: {service.serviceNameSnapshot} - Vaga {slot.slotNumber}
            </span>
          </div>
          <Badge tone="brand">{formatMoney(slot.agreedFeeCents)}</Badge>
        </div>
        <div className="grid gap-1 text-sm text-[var(--muted)]">
          <span>{formatDateTimeRange(event.startsAt, event.endsAt)}</span>
          <span>{event.locationName}</span>
        </div>
        <div className="grid gap-2 rounded-md bg-[var(--surface-muted)] p-3 text-sm">
          <div className="flex justify-between gap-3">
            <span>Pago</span>
            <strong>{formatMoney(summary.paid)}</strong>
          </div>
          <div className="flex justify-between gap-3">
            <span>Saldo</span>
            <strong>{formatMoney(summary.balance)}</strong>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LedgerCard({
  entries,
  events,
  profiles,
  slots,
  eventServices,
  className,
}: {
  entries: FinancialEntry[];
  events: EventRecord[];
  profiles: Profile[];
  slots: EventProfessionalSlot[];
  eventServices: EventService[];
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Extrato completo</CardTitle>
        <CardDescription>
          Valores positivos aumentam a dívida; negativos diminuem.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {entries.length > 0 ? (
          entries.map((entry) => {
            const event = events.find((item) => item.id === entry.eventId);
            const profile = profiles.find(
              (item) => item.id === entry.freelancerId,
            );
            const slot = slots.find(
              (item) => item.id === entry.eventProfessionalSlotId,
            );
            const service = slot
              ? eventServices.find((item) => item.id === slot.eventServiceId)
              : null;
            return (
              <div
                className="grid gap-3 rounded-lg border border-[var(--border)] p-3 md:grid-cols-[1fr_auto]"
                key={entry.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={entry.amountCents >= 0 ? "success" : "warning"}
                    >
                      {translateEntryType(entry.entryType)}
                    </Badge>
                    <span className="text-xs text-[var(--muted)]">
                      {formatShortDate(entry.effectiveDate)}
                    </span>
                  </div>
                  <strong className="mt-2 block text-sm text-[var(--text)]">
                    {entry.description}
                  </strong>
                  <span className="text-xs text-[var(--muted)]">
                    {profile?.fullName ?? "Freelancer"}{" "}
                    {event ? `- ${event.title}` : ""}
                    {service ? ` - ${service.serviceNameSnapshot}` : ""}
                    {slot ? ` - Vaga ${slot.slotNumber}` : ""}
                  </span>
                </div>
                <strong
                  className={cn(
                    "text-lg",
                    entry.amountCents >= 0
                      ? "text-[var(--success)]"
                      : "text-[var(--danger)]",
                  )}
                >
                  {formatMoney(entry.amountCents)}
                </strong>
              </div>
            );
          })
        ) : (
          <EmptyState
            description="Os lançamentos aparecerão quando houver eventos realizados, pagamentos ou ajustes."
            title="Sem extrato"
          />
        )}
      </CardContent>
    </Card>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function MetricBox({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md bg-[var(--surface-muted)] p-3">
      <strong className="block truncate whitespace-nowrap text-sm tabular-nums">
        {value}
      </strong>
      <span className="block truncate text-xs text-[var(--muted)]">
        {label}
      </span>
    </div>
  );
}

function InfoGrid({
  rows,
  className,
}: {
  rows: Array<[string, string]>;
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-2", className)}>
      {rows.map(([label, value]) => (
        <div
          className="grid gap-1 rounded-md border border-[var(--border)] bg-white p-3"
          key={label}
        >
          <dt className="text-xs font-bold uppercase text-[var(--muted)]">
            {label}
          </dt>
          <dd className="text-sm font-semibold text-[var(--text)]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function eventServicesForEvent(services: EventService[], eventId: string) {
  return services.filter((service) => service.eventId === eventId);
}

function getOpenSlotsForFreelancer(
  slots: EventProfessionalSlot[],
  freelancerId: string,
) {
  return slots.filter((slot) => {
    if (slot.status !== "open" || slot.assignedFreelancerId !== null)
      return false;
    return !slots.some(
      (current) =>
        current.eventId === slot.eventId &&
        current.status !== "cancelled" &&
        current.assignedFreelancerId === freelancerId,
    );
  });
}

function translateStatus(status: EventRecord["status"]) {
  const labels: Record<EventRecord["status"], string> = {
    draft: "Rascunho",
    open: "Aberto",
    assigned: "Designado",
    partially_assigned: "Equipe parcial",
    fully_assigned: "Equipe completa",
    completed: "Realizado",
    cancelled: "Cancelado",
  };
  return labels[status];
}

function translateEntryType(type: FinancialEntry["entryType"]) {
  const labels: Record<FinancialEntry["entryType"], string> = {
    event_earning: "Receita da vaga",
    payment: "Pagamento",
    advance: "Adiantamento",
    positive_adjustment: "Ajuste positivo",
    negative_adjustment: "Ajuste negativo",
    reversal: "Estorno",
  };
  return labels[type];
}

function freelancerAccessStatus(profile: Profile) {
  if (!profile.isActive) return "Conta inativa";
  if (profile.firstAccessAt || profile.lastAccessAt) return "Acesso ativo";
  return "Aguardando primeiro acesso";
}

function profileHasRole(profile: Profile, role: UserRole) {
  return profile.roles?.includes(role) ?? profile.role === role;
}

function makeFallbackProfile(
  organizationId: string,
  role: "admin" | "freelancer",
): Profile {
  return {
    id: "",
    organizationId,
    role,
    roles: [role],
    authUserId: null,
    fullName: role === "admin" ? "Administrador" : "Freelancer",
    email: "",
    phone: "",
    pixKey: null,
    avatarUrl: null,
    notes: null,
    isActive: false,
  };
}
