"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  Banknote,
  BarChart3,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileDown,
  LayoutDashboard,
  LogOut,
  Menu,
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
import { Button, LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/skeleton";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { DateRangeFilter } from "@/components/app/date-range-filter";
import { EventCard } from "@/components/app/event-card";
import { DataTable } from "@/components/app/data-table";
import { BalanceDisplay } from "@/components/app/balance-display";
import { FinancialSummary } from "@/components/app/financial-summary";
import { EventStatusBadge } from "@/components/app/event-status-badge";
import { AuditTimeline } from "@/components/app/audit-timeline";
import { EventForm } from "@/components/forms/event-form";
import { FinancialEntryForm } from "@/components/forms/financial-entry-form";
import { GoogleCalendarImportDialog } from "@/components/google/google-calendar-import-dialog";
import {
  demoAcceptances,
  demoAuditLogs,
  demoEvents,
  demoFinancialEntries,
  demoGoogleEvents,
  demoOrganization,
  demoProfiles,
} from "@/lib/demo/seed-data";
import {
  getAdminMetrics,
  getFreelancerMetrics,
  getFreelancerSummaries,
} from "@/lib/demo/analytics";
import {
  acceptOpenEvent,
  canProfileReadEvent,
  canProfileReadFinancialEntry,
  completeEventIdempotently,
  getFreelancerBalance,
  registerPayment,
} from "@/lib/domain/finance";
import {
  parseMoneyToCents,
  formatMoney,
  describeBalance,
} from "@/lib/domain/money";
import type {
  AuditLog,
  EventAcceptance,
  EventRecord,
  FinancialEntry,
  GoogleCalendarEvent,
  Profile,
} from "@/lib/domain/types";
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
  | "admin-finance"
  | "admin-financial-entries"
  | "admin-reports"
  | "admin-settings"
  | "admin-integrations"
  | "freelancer-dashboard"
  | "freelancer-events"
  | "freelancer-opportunities"
  | "freelancer-finance"
  | "freelancer-profile";

const adminLinks = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/admin/freelancers", label: "Freelancers", icon: Users },
  { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/admin/relatorios", label: "Relatórios", icon: BarChart3 },
  {
    href: "/admin/configuracoes/integracoes",
    label: "Integrações",
    icon: Plug,
  },
];

const freelancerLinks = [
  { href: "/freelancer/dashboard", label: "Meu painel", icon: LayoutDashboard },
  { href: "/freelancer/eventos", label: "Meus eventos", icon: CalendarCheck },
  {
    href: "/freelancer/oportunidades",
    label: "Oportunidades",
    icon: ClipboardList,
  },
  { href: "/freelancer/financeiro", label: "Financeiro", icon: Banknote },
  { href: "/freelancer/perfil", label: "Perfil", icon: Settings },
];

const chartColors = ["#2f7a78", "#496aaf", "#236f59", "#bd3f32", "#805ad5"];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function TracosWorkspace({
  view,
  entityId,
  role,
}: {
  view: WorkspaceView;
  entityId?: string;
  role: "admin" | "freelancer";
}) {
  const [events, setEvents] = useState<EventRecord[]>(demoEvents);
  const [profiles, setProfiles] = useState<Profile[]>(demoProfiles);
  const [entries, setEntries] =
    useState<FinancialEntry[]>(demoFinancialEntries);
  const [acceptances, setAcceptances] =
    useState<EventAcceptance[]>(demoAcceptances);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(demoAuditLogs);
  const [period, setPeriod] = useState("month");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [freelancerFilter, setFreelancerFilter] = useState("all");
  const [selectedFreelancerId, setSelectedFreelancerId] = useState(
    demoProfiles.find((profile) => profile.role === "freelancer")?.id ?? "",
  );
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false);
  const [importedEvent, setImportedEvent] =
    useState<GoogleCalendarEvent | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState(
    "MVP em modo demonstração com regras reais.",
  );

  const admin = profiles.find((profile) => profile.role === "admin")!;
  const activeFreelancers = profiles.filter(
    (profile) => profile.role === "freelancer" && profile.isActive,
  );
  const currentFreelancer =
    profiles.find((profile) => profile.id === selectedFreelancerId) ??
    activeFreelancers[0];
  const currentUser = role === "admin" ? admin : currentFreelancer;
  const adminMetrics = getAdminMetrics(events, entries);
  const freelancerMetrics = getFreelancerMetrics(
    currentFreelancer.id,
    events,
    entries,
  );
  const freelancerSummaries = getFreelancerSummaries(profiles, events, entries);
  const balancesByFreelancer = Object.fromEntries(
    profiles
      .filter((profile) => profile.role === "freelancer")
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
      : events.filter((event) => canProfileReadEvent(currentFreelancer, event));
  const visibleEntries =
    role === "admin"
      ? entries
      : entries.filter((entry) =>
          canProfileReadFinancialEntry(currentFreelancer, entry),
        );

  const monthlyChart = useMemo(
    () => [
      { month: "Mar", eventos: 7, gerado: 1600, pago: 1280 },
      { month: "Abr", eventos: 9, gerado: 2300, pago: 2100 },
      { month: "Mai", eventos: 8, gerado: 2050, pago: 1760 },
      { month: "Jun", eventos: 12, gerado: 3120, pago: 2860 },
      { month: "Jul", eventos: events.length, gerado: 1180, pago: 750 },
      { month: "Ago", eventos: 5, gerado: 1120, pago: 260 },
    ],
    [events.length],
  );

  const statusChart = [
    "draft",
    "open",
    "assigned",
    "completed",
    "cancelled",
  ].map((item) => ({
    name: translateStatus(item as EventRecord["status"]),
    value: events.filter((event) => event.status === item).length,
  }));

  const byFreelancerChart = freelancerSummaries.map((summary) => ({
    name: summary.profile.fullName.split(" ")[0],
    eventos: summary.completedEvents,
    saldo: summary.balance / 100,
  }));

  function addAudit(action: string, entityType: string, entityIdValue: string) {
    const createdAt = new Date().toISOString();
    setAuditLogs((current) => [
      {
        id: makeId("audit"),
        organizationId: demoOrganization.id,
        userId: currentUser.id,
        action,
        entityType,
        entityId: entityIdValue,
        oldValues: null,
        newValues: { source: "demo-ui" },
        createdAt,
      },
      ...current,
    ]);
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
    const assignmentMode =
      publishAction === "open" || values.assignmentMode === "open"
        ? "open"
        : "direct";
    const assignedFreelancerId =
      assignmentMode === "direct"
        ? (values.assignedFreelancerId ?? null)
        : null;
    const nextEvent: EventRecord = {
      id: makeId("event"),
      organizationId: demoOrganization.id,
      title: values.title,
      serviceName: values.serviceName,
      description: values.description ?? "",
      locationName: values.locationName,
      locationAddress: values.locationAddress ?? "",
      startsAt,
      endsAt,
      allDay: values.allDay,
      freelancerFeeCents: parseMoneyToCents(values.freelancerFee),
      status:
        publishAction === "draft"
          ? "draft"
          : assignmentMode === "open"
            ? "open"
            : "assigned",
      assignmentMode,
      assignedFreelancerId,
      googleCalendarId: values.googleCalendarId || null,
      googleEventId: values.googleEventId || null,
      googleEventLink: values.googleEventLink || null,
      source: values.source,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      createdBy: admin.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const duplicateGoogleEvent = events.some(
      (event) =>
        nextEvent.googleCalendarId &&
        nextEvent.googleEventId &&
        event.googleCalendarId === nextEvent.googleCalendarId &&
        event.googleEventId === nextEvent.googleEventId,
    );

    if (duplicateGoogleEvent) {
      showToast("Este evento do Google Agenda já foi importado.");
      return;
    }

    setEvents((current) =>
      [nextEvent, ...current].sort((a, b) =>
        a.startsAt.localeCompare(b.startsAt),
      ),
    );
    addAudit(
      nextEvent.source === "google_calendar"
        ? "google_event.imported"
        : "event.created",
      "events",
      nextEvent.id,
    );
    setImportedEvent(null);
    showToast("Evento salvo com sucesso.");
  }

  function handleCompleteEvent(eventId: string) {
    const event = events.find((item) => item.id === eventId);
    if (!event) return;
    const result = completeEventIdempotently({
      event,
      entries,
      entryId: makeId("entry"),
      completedAt: new Date().toISOString(),
      actorId: admin.id,
    });
    setEvents((current) =>
      current.map((item) => (item.id === eventId ? result.event : item)),
    );
    setEntries(result.entries);
    addAudit("event.completed", "events", eventId);
    showToast("Evento realizado e valor devido gerado sem duplicar receita.");
  }

  function handleCancelEvent(eventId: string) {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId
          ? {
              ...event,
              status: "cancelled",
              cancelledAt: new Date().toISOString(),
              cancellationReason: "Cancelado pela equipe administrativa.",
              updatedAt: new Date().toISOString(),
            }
          : event,
      ),
    );
    addAudit("event.cancelled", "events", eventId);
    showToast("Evento cancelado e histórico atualizado.");
  }

  function handleAcceptEvent(eventId: string) {
    const event = events.find((item) => item.id === eventId);
    if (!event) return;
    const result = acceptOpenEvent({
      event,
      freelancer: currentFreelancer,
      existingAcceptances: acceptances,
      acceptanceId: makeId("acceptance"),
      createdAt: new Date().toISOString(),
    });

    if (!result.ok) {
      showToast(result.message);
      return;
    }

    setEvents((current) =>
      current.map((item) => (item.id === eventId ? result.event : item)),
    );
    setAcceptances(result.acceptances);
    addAudit("event.accepted", "events", eventId);
    showToast("Trabalho aceito. Você ficou com este evento.");
  }

  function handleFinancialSubmit(values: FinancialEntryFormValues) {
    const amount = parseMoneyToCents(values.amount);
    const signedEntry =
      values.entryType === "payment" || values.entryType === "advance"
        ? registerPayment({
            id: makeId("entry"),
            organizationId: demoOrganization.id,
            freelancerId: values.freelancerId,
            eventId: values.eventId || null,
            amountCents: amount,
            entryType: values.entryType,
            description: values.description,
            effectiveDate: values.effectiveDate,
            createdBy: admin.id,
            createdAt: new Date().toISOString(),
          })
        : {
            id: makeId("entry"),
            organizationId: demoOrganization.id,
            freelancerId: values.freelancerId,
            eventId: values.eventId || null,
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
    addAudit(
      values.entryType === "advance" ? "advance.created" : "payment.created",
      "financial_entries",
      signedEntry.id,
    );
    showToast("Lançamento financeiro registrado.");
  }

  function handleInviteFreelancer(values: FreelancerFormValues) {
    const profile: Profile = {
      id: makeId("profile"),
      organizationId: demoOrganization.id,
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
    showToast(
      "Freelancer cadastrado. O convite real será enviado pelo Supabase.",
    );
  }

  function exportCsv() {
    const header = "data,tipo,freelancer,evento,descricao,valor";
    const lines = entries.map((entry) => {
      const profile = profiles.find((item) => item.id === entry.freelancerId);
      const event = events.find((item) => item.id === entry.eventId);
      return [
        entry.effectiveDate,
        entry.entryType,
        profile?.fullName ?? "",
        event?.title ?? "",
        entry.description,
        (entry.amountCents / 100).toFixed(2),
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",");
    });
    const csv = [header, ...lines].join("\n");
    navigator.clipboard?.writeText(csv);
    showToast("CSV copiado para a área de transferência.");
  }

  function renderView() {
    if (view === "admin-dashboard") {
      return (
        <AdminDashboard
          adminMetrics={adminMetrics}
          auditLogs={auditLogs}
          byFreelancerChart={byFreelancerChart}
          entries={entries}
          events={events}
          monthlyChart={monthlyChart}
          period={period}
          profiles={profiles}
          setPeriod={setPeriod}
          statusChart={statusChart}
          summaries={freelancerSummaries}
          onCancel={handleCancelEvent}
          onComplete={handleCompleteEvent}
        />
      );
    }

    if (view === "admin-events") {
      return (
        <AdminEvents
          entries={entries}
          events={visibleEvents}
          freelancer={freelancerFilter}
          profiles={profiles}
          query={query}
          status={status}
          onAccept={handleAcceptEvent}
          onCancel={handleCancelEvent}
          onComplete={handleCompleteEvent}
          onFreelancerChange={setFreelancerFilter}
          onQueryChange={setQuery}
          onStatusChange={setStatus}
        />
      );
    }

    if (view === "admin-event-new" || view === "admin-event-edit") {
      return (
        <>
          <EventEditor
            importedEvent={importedEvent}
            profiles={profiles}
            title={view === "admin-event-new" ? "Novo evento" : "Editar evento"}
            onOpenGoogle={() => setGoogleDialogOpen(true)}
            onSubmit={handleCreateEvent}
          />
          <GoogleCalendarImportDialog
            connected={calendarConnected}
            existingEvents={events}
            googleEvents={demoGoogleEvents}
            isOpen={googleDialogOpen}
            onClose={() => setGoogleDialogOpen(false)}
            onConnect={() => {
              setCalendarConnected(true);
              showToast(
                "Conexão simulada. Em produção, abre o OAuth do Google.",
              );
            }}
            onSelect={(event) => {
              setImportedEvent(event);
              setGoogleDialogOpen(false);
              showToast(
                "Evento selecionado. Complete os dados antes de salvar.",
              );
            }}
          />
        </>
      );
    }

    if (view === "admin-event-detail") {
      return (
        <EventDetail
          auditLogs={auditLogs}
          entries={entries}
          event={selectedEvent}
          profiles={profiles}
          role="admin"
          onCancel={handleCancelEvent}
          onComplete={handleCompleteEvent}
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
          profile={selectedFreelancer}
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
          events={events}
          metrics={adminMetrics}
          profiles={profiles}
          showForm={view === "admin-financial-entries"}
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
          statusChart={statusChart}
        />
      );
    }

    if (view === "admin-settings") {
      return (
        <SettingsPage
          calendarConnected={calendarConnected}
          onConnectCalendar={() => setCalendarConnected(true)}
        />
      );
    }

    if (view === "admin-integrations") {
      return (
        <IntegrationsPage
          calendarConnected={calendarConnected}
          onConnect={() => {
            setCalendarConnected(true);
            showToast("Conexão marcada como ativa no modo demonstração.");
          }}
          onDisconnect={() => {
            setCalendarConnected(false);
            showToast("Google Agenda desconectado.");
          }}
        />
      );
    }

    if (view === "freelancer-dashboard") {
      return (
        <FreelancerDashboard
          entries={visibleEntries}
          events={visibleEvents}
          freelancer={currentFreelancer}
          metrics={freelancerMetrics}
          onAccept={handleAcceptEvent}
        />
      );
    }

    if (view === "freelancer-events" || view === "freelancer-opportunities") {
      return (
        <FreelancerEvents
          entries={visibleEntries}
          events={
            view === "freelancer-opportunities"
              ? events.filter((event) => event.status === "open")
              : visibleEvents
          }
          freelancer={currentFreelancer}
          onAccept={handleAcceptEvent}
        />
      );
    }

    if (view === "freelancer-finance") {
      return (
        <FreelancerFinance
          entries={visibleEntries}
          events={events}
          freelancer={currentFreelancer}
        />
      );
    }

    return (
      <FreelancerProfile
        freelancer={currentFreelancer}
        onSelectFreelancer={setSelectedFreelancerId}
        profiles={activeFreelancers}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="lg:hidden">
        <MobileNavigation
          isOpen={mobileOpen}
          links={role === "admin" ? adminLinks : freelancerLinks}
          onClose={() => setMobileOpen(false)}
          onOpen={() => setMobileOpen(true)}
          role={role}
        />
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">
        <AppSidebar
          currentUser={currentUser}
          links={role === "admin" ? adminLinks : freelancerLinks}
          role={role}
          selectedFreelancerId={selectedFreelancerId}
          freelancers={activeFreelancers}
          onFreelancerChange={setSelectedFreelancerId}
        />
      </aside>

      <main className="min-w-0 px-4 py-5 lg:ml-72 lg:px-8 lg:py-7">
        {toast ? (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text)] shadow-[var(--shadow)]">
            <span>{toast}</span>
            <Button onClick={() => setToast("")} size="sm" variant="ghost">
              <X size={14} />
            </Button>
          </div>
        ) : null}
        {renderView()}
      </main>
    </div>
  );
}

function AppSidebar({
  links,
  currentUser,
  role,
  freelancers,
  selectedFreelancerId,
  onFreelancerChange,
}: {
  links: typeof adminLinks;
  currentUser: Profile;
  role: "admin" | "freelancer";
  freelancers: Profile[];
  selectedFreelancerId: string;
  onFreelancerChange: (id: string) => void;
}) {
  return (
    <div className="flex h-full flex-col bg-[var(--graphite)] p-5 text-white">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-[var(--brand)] font-black text-[var(--brand-contrast)]">
          TD
        </div>
        <div>
          <strong className="block text-base">Traços Freelance</strong>
          <span className="text-xs text-white/62">
            Gestão de eventos e parceiros
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-white/10 bg-white/7 p-4">
        <span className="text-xs font-bold uppercase text-white/55">
          Espaço do logotipo
        </span>
        <div className="mt-3 grid h-20 place-items-center rounded-md border border-dashed border-white/20 text-sm text-white/55">
          Traços Detalhados
        </div>
      </div>

      {role === "freelancer" ? (
        <label className="mt-5 grid gap-2 text-sm font-semibold">
          Perfil demo
          <select
            className="min-h-10 rounded-md border border-white/10 bg-white/10 px-3 text-white"
            value={selectedFreelancerId}
            onChange={(event) => onFreelancerChange(event.target.value)}
          >
            {freelancers.map((profile) => (
              <option
                className="text-[var(--text)]"
                key={profile.id}
                value={profile.id}
              >
                {profile.fullName}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <nav className="mt-6 grid gap-1">
        {links.map((link) => (
          <Link
            className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
            href={link.href}
            key={link.href}
          >
            <link.icon size={18} />
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-white/10 bg-white/7 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-[var(--graphite)] text-sm font-black">
            {initials(currentUser.fullName)}
          </div>
          <div className="min-w-0">
            <strong className="block truncate text-sm">
              {currentUser.fullName}
            </strong>
            <span className="block truncate text-xs text-white/58">
              {role === "admin" ? "Administrador" : "Freelancer"}
            </span>
          </div>
        </div>
        <Link
          className="mt-3 flex items-center gap-2 text-xs font-semibold text-white/58"
          href="/login"
        >
          <LogOut size={14} />
          Sair
        </Link>
      </div>
    </div>
  );
}

function MobileNavigation({
  isOpen,
  links,
  role,
  onOpen,
  onClose,
}: {
  isOpen: boolean;
  links: typeof adminLinks;
  role: "admin" | "freelancer";
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-white px-4 py-3">
        <strong>Traços Freelance</strong>
        <Button onClick={onOpen} size="icon" variant="secondary">
          <Menu size={18} />
        </Button>
      </div>
      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-black/45">
          <div className="h-full w-80 max-w-[85vw] bg-[var(--graphite)] p-5 text-white">
            <div className="flex items-center justify-between">
              <strong>{role === "admin" ? "Admin" : "Freelancer"}</strong>
              <Button onClick={onClose} size="icon" variant="ghost">
                <X size={18} />
              </Button>
            </div>
            <nav className="mt-6 grid gap-2">
              {links.map((link) => (
                <Link
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-white/78"
                  href={link.href}
                  key={link.href}
                  onClick={onClose}
                >
                  <link.icon size={18} />
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </>
  );
}

function AdminDashboard({
  adminMetrics,
  monthlyChart,
  statusChart,
  byFreelancerChart,
  events,
  entries,
  profiles,
  summaries,
  auditLogs,
  period,
  setPeriod,
  onComplete,
  onCancel,
}: {
  adminMetrics: ReturnType<typeof getAdminMetrics>;
  monthlyChart: Array<Record<string, string | number>>;
  statusChart: Array<{ name: string; value: number }>;
  byFreelancerChart: Array<Record<string, string | number>>;
  events: EventRecord[];
  entries: FinancialEntry[];
  profiles: Profile[];
  summaries: ReturnType<typeof getFreelancerSummaries>;
  auditLogs: AuditLog[];
  period: string;
  setPeriod: (value: string) => void;
  onComplete: (eventId: string) => void;
  onCancel: (eventId: string) => void;
}) {
  const upcoming = events
    .filter((event) => event.status === "assigned")
    .slice(0, 3);
  const open = events.filter((event) => event.status === "open");

  return (
    <>
      <PageHeader
        actions={
          <>
            <DateRangeFilter value={period} onChange={setPeriod} />
            <LinkButton href="/admin/eventos/novo" variant="bronze">
              <Plus size={16} />
              Novo evento
            </LinkButton>
          </>
        }
        description="Visão geral operacional e financeira da Traços Detalhados."
        eyebrow="Administrativo"
        title="Dashboard da empresa"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Eventos atribuídos e futuros"
          icon={CalendarClock}
          title="Próximos eventos"
          value={adminMetrics.upcomingEvents}
        />
        <StatCard
          description="Disponíveis para aceite"
          icon={ClipboardList}
          title="Eventos em aberto"
          tone="blue"
          value={adminMetrics.openEvents}
        />
        <StatCard
          description="Sem freelancer definido"
          icon={Users}
          title="Sem freelancer"
          tone="red"
          value={adminMetrics.eventsWithoutFreelancer}
        />
        <StatCard
          description="No período selecionado"
          icon={CheckCircle2}
          title="Realizados"
          tone="green"
          value={adminMetrics.completedThisMonth}
        />
        <StatCard
          description="Receitas de eventos concluídos"
          icon={Banknote}
          title="Valor gerado"
          value={formatMoney(adminMetrics.generatedThisMonth)}
        />
        <StatCard
          description="Pagamentos registrados"
          icon={CreditCard}
          title="Valor pago"
          tone="blue"
          value={formatMoney(adminMetrics.paidThisMonth)}
        />
        <StatCard
          description="Saldo positivo dos parceiros"
          icon={Wallet}
          title="Empresa deve"
          tone="green"
          value={formatMoney(adminMetrics.totalDue)}
        />
        <StatCard
          description="Saldos negativos"
          icon={ArrowLeftRight}
          title="Adiantamentos"
          tone="red"
          value={formatMoney(adminMetrics.totalAdvances)}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Eventos por mês">
          <ResponsiveContainer height={280} width="100%">
            <BarChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="eventos" fill="#2f7a78" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Valor gerado versus pago">
          <ResponsiveContainer height={280} width="100%">
            <AreaChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => formatMoney(Number(value) * 100)}
              />
              <Legend />
              <Area dataKey="gerado" fill="#2f7a78" stroke="#2f7a78" />
              <Area dataKey="pago" fill="#2e5d91" stroke="#2e5d91" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Próximos eventos</CardTitle>
            <CardDescription>
              Eventos atribuídos aguardando realização.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {upcoming.map((event) => (
              <EventCard
                entries={entries}
                event={event}
                freelancer={profiles.find(
                  (profile) => profile.id === event.assignedFreelancerId,
                )}
                key={event.id}
                role="admin"
                onCancel={onCancel}
                onComplete={onComplete}
              />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Atividade recente</CardTitle>
          </CardHeader>
          <CardContent>
            <AuditTimeline logs={auditLogs.slice(0, 5)} profiles={profiles} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <ChartCard title="Eventos por status">
          <ResponsiveContainer height={260} width="100%">
            <PieChart>
              <Pie
                data={statusChart}
                dataKey="value"
                innerRadius={62}
                outerRadius={96}
              >
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
        <ChartCard title="Distribuição por freelancer">
          <ResponsiveContainer height={260} width="100%">
            <BarChart data={byFreelancerChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="eventos" fill="#236f59" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Eventos aguardando freelancer</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {open.length > 0 ? (
              open.map((event) => (
                <EventCard
                  entries={entries}
                  event={event}
                  key={event.id}
                  role="admin"
                  onCancel={onCancel}
                  onComplete={onComplete}
                />
              ))
            ) : (
              <EmptyState
                description="Todos os eventos publicados já foram atribuídos."
                title="Nenhum evento aberto"
              />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Freelancers com saldo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {summaries.map((summary) => (
              <div
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3"
                key={summary.profile.id}
              >
                <div>
                  <strong className="block text-sm text-[var(--text)]">
                    {summary.profile.fullName}
                  </strong>
                  <span className="text-xs text-[var(--muted)]">
                    {describeBalance(summary.balance, "admin")}
                  </span>
                </div>
                <BalanceDisplay cents={summary.balance} compact />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function AdminEvents(props: {
  events: EventRecord[];
  entries: FinancialEntry[];
  profiles: Profile[];
  query: string;
  status: string;
  freelancer: string;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onFreelancerChange: (value: string) => void;
  onAccept: (eventId: string) => void;
  onComplete: (eventId: string) => void;
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
        description="Tabela no desktop, cards no celular, filtros por status, freelancer, serviço e busca."
        eyebrow="Eventos"
        title="Agenda operacional"
      />
      <DataTable {...props} />
      <div className="mt-5 grid gap-3">
        {props.events.map((event) => (
          <EventCard
            entries={props.entries}
            event={event}
            freelancer={props.profiles.find(
              (profile) => profile.id === event.assignedFreelancerId,
            )}
            key={event.id}
            role="admin"
            onCancel={props.onCancel}
            onComplete={props.onComplete}
          />
        ))}
      </div>
    </>
  );
}

function EventEditor({
  title,
  profiles,
  importedEvent,
  onSubmit,
  onOpenGoogle,
}: {
  title: string;
  profiles: Profile[];
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
        description="Formulário dividido por informações principais, freelancer, financeiro e origem."
        eyebrow="Eventos"
        title={title}
      />
      <EventForm
        freelancers={profiles}
        importedEvent={importedEvent}
        onOpenGoogle={onOpenGoogle}
        onSubmit={onSubmit}
      />
    </>
  );
}

function EventDetail({
  event,
  profiles,
  entries,
  auditLogs,
  role,
  onComplete,
  onCancel,
}: {
  event: EventRecord;
  profiles: Profile[];
  entries: FinancialEntry[];
  auditLogs: AuditLog[];
  role: "admin" | "freelancer";
  onComplete: (eventId: string) => void;
  onCancel: (eventId: string) => void;
}) {
  const freelancer = profiles.find(
    (profile) => profile.id === event.assignedFreelancerId,
  );
  const eventEntries = entries.filter((entry) => entry.eventId === event.id);

  return (
    <>
      <PageHeader
        actions={
          role === "admin" ? (
            <>
              <LinkButton
                href={`/admin/eventos/${event.id}/editar`}
                variant="secondary"
              >
                Editar
              </LinkButton>
              <Button onClick={() => onComplete(event.id)} variant="bronze">
                Marcar como realizado
              </Button>
              <Button onClick={() => onCancel(event.id)} variant="danger">
                Cancelar evento
              </Button>
            </>
          ) : null
        }
        description={formatDateTimeRange(event.startsAt, event.endsAt)}
        eyebrow="Detalhes do evento"
        title={event.title}
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="grid gap-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <EventStatusBadge status={event.status} />
              <Badge tone="brand">
                {event.source === "google_calendar"
                  ? "Google Agenda"
                  : "Manual"}
              </Badge>
            </div>
            <InfoGrid
              rows={[
                ["Serviço", event.serviceName],
                ["Local", `${event.locationName} - ${event.locationAddress}`],
                ["Freelancer", freelancer?.fullName ?? "Aberto para aceite"],
                ["Valor combinado", formatMoney(event.freelancerFeeCents)],
                [
                  "Origem",
                  event.source === "google_calendar"
                    ? "Google Agenda"
                    : "Manual",
                ],
              ]}
            />
            {event.googleEventLink ? (
              <LinkButton href={event.googleEventLink} variant="secondary">
                Abrir no Google Agenda
              </LinkButton>
            ) : null}
            <div>
              <h3 className="font-bold text-[var(--text)]">Observações</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {event.description}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Histórico financeiro</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {eventEntries.map((entry) => (
              <div
                className="flex justify-between gap-3 rounded-md border border-[var(--border)] p-3 text-sm"
                key={entry.id}
              >
                <div>
                  <strong>{translateEntryType(entry.entryType)}</strong>
                  <span className="block text-xs text-[var(--muted)]">
                    {entry.description} - {formatShortDate(entry.createdAt)}
                  </span>
                </div>
                <strong>{formatMoney(entry.amountCents)}</strong>
              </div>
            ))}
            {eventEntries.length === 0 ? (
              <EmptyState
                description="Os pagamentos e receitas aparecerão aqui."
                title="Sem lançamentos"
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle>Histórico de alterações</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditTimeline
            logs={auditLogs.filter((log) => log.entityId === event.id)}
            profiles={profiles}
          />
        </CardContent>
      </Card>
    </>
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
        description="Cadastro, situação e resumo financeiro dos parceiros."
        eyebrow="Parceiros"
        title="Freelancers"
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaries.map((summary) => (
          <Card key={summary.profile.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--graphite)] text-white font-black">
                    {initials(summary.profile.fullName)}
                  </div>
                  <div>
                    <strong>{summary.profile.fullName}</strong>
                    <span className="block text-xs text-[var(--muted)]">
                      {summary.profile.phone}
                    </span>
                  </div>
                </div>
                <Badge tone={summary.profile.isActive ? "success" : "danger"}>
                  {summary.profile.isActive ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <InfoGrid
                className="mt-4"
                rows={[
                  ["E-mail", summary.profile.email],
                  ["Próximo evento", summary.nextEvent?.title ?? "Sem agenda"],
                  ["Eventos realizados", String(summary.completedEvents)],
                  ["Total gerado", formatMoney(summary.totalGenerated)],
                  ["Total pago", formatMoney(summary.totalPaid)],
                ]}
              />
              <BalanceDisplay cents={summary.balance} />
              <div className="mt-4 flex gap-2">
                <LinkButton
                  href={`/admin/freelancers/${summary.profile.id}`}
                  onClick={() => onSelectFreelancer(summary.profile.id)}
                  variant="secondary"
                >
                  Ver detalhes
                </LinkButton>
                <LinkButton
                  href="/admin/financeiro/lancamentos"
                  variant="bronze"
                >
                  Registrar pagamento
                </LinkButton>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function FreelancerNew({
  onSubmit,
}: {
  onSubmit: (values: FreelancerFormValues) => void;
}) {
  const [values, setValues] = useState<FreelancerFormValues>({
    fullName: "Novo Parceiro",
    email: "parceiro@exemplo.com",
    phone: "(65) 98888-0000",
    pixKey: "",
    notes: "",
    isActive: true,
  });

  return (
    <>
      <PageHeader
        description="O convite real deve ser enviado pelo servidor com a operação administrativa do Supabase."
        eyebrow="Freelancers"
        title="Novo freelancer"
      />
      <Card>
        <CardContent className="grid gap-4 p-5">
          <Field label="Nome">
            <Input
              value={values.fullName}
              onChange={(event) =>
                setValues({ ...values, fullName: event.target.value })
              }
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="E-mail">
              <Input
                value={values.email}
                onChange={(event) =>
                  setValues({ ...values, email: event.target.value })
                }
              />
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
          <Field label="Chave Pix">
            <Input
              value={values.pixKey}
              onChange={(event) =>
                setValues({ ...values, pixKey: event.target.value })
              }
            />
          </Field>
          <Field label="Observações internas">
            <Textarea
              value={values.notes}
              onChange={(event) =>
                setValues({ ...values, notes: event.target.value })
              }
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              checked={values.isActive}
              onChange={(event) =>
                setValues({ ...values, isActive: event.target.checked })
              }
              type="checkbox"
            />
            Freelancer ativo
          </label>
          <Button onClick={() => onSubmit(values)} variant="bronze">
            <UserPlus size={16} />
            Cadastrar e convidar
          </Button>
        </CardContent>
      </Card>
    </>
  );
}

function FreelancerDetail({
  profile,
  events,
  entries,
  onToggleActive,
}: {
  profile: Profile;
  events: EventRecord[];
  entries: FinancialEntry[];
  onToggleActive: () => void;
}) {
  const freelancerEvents = events.filter(
    (event) => event.assignedFreelancerId === profile.id,
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
            <CardTitle>Histórico de eventos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {freelancerEvents.map((event) => (
              <EventCard
                entries={entries}
                event={event}
                key={event.id}
                role="admin"
              />
            ))}
          </CardContent>
        </Card>
      </div>
      <LedgerCard
        className="mt-5"
        entries={freelancerEntries}
        events={events}
        profiles={[profile]}
      />
    </>
  );
}

function AdminFinance({
  metrics,
  profiles,
  events,
  entries,
  balancesByFreelancer,
  showForm,
  onSubmit,
  onExportCsv,
}: {
  metrics: ReturnType<typeof getAdminMetrics>;
  profiles: Profile[];
  events: EventRecord[];
  entries: FinancialEntry[];
  balancesByFreelancer: Record<string, number>;
  showForm: boolean;
  onSubmit: (values: FinancialEntryFormValues) => void;
  onExportCsv: () => void;
}) {
  const freelancers = profiles.filter(
    (profile) => profile.role === "freelancer",
  );

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
        description="Livro-caixa com pagamentos, adiantamentos, ajustes, estornos e saldos."
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
      <div className="mt-5 grid gap-5 xl:grid-cols-[380px_1fr]">
        {showForm ? (
          <Card>
            <CardHeader>
              <CardTitle>Novo lançamento</CardTitle>
              <CardDescription>
                Confira a prévia do saldo antes de confirmar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FinancialEntryForm
                balancesByFreelancer={balancesByFreelancer}
                events={events}
                freelancers={freelancers}
                onSubmit={onSubmit}
              />
            </CardContent>
          </Card>
        ) : null}
        <LedgerCard entries={entries} events={events} profiles={profiles} />
      </div>
    </>
  );
}

function ReportsPage({
  monthlyChart,
  statusChart,
  byFreelancerChart,
}: {
  monthlyChart: Array<Record<string, string | number>>;
  statusChart: Array<{ name: string; value: number }>;
  byFreelancerChart: Array<Record<string, string | number>>;
}) {
  return (
    <>
      <PageHeader
        description="Relatórios operacionais e financeiros para leitura rápida."
        eyebrow="Relatórios"
        title="Análises da operação"
      />
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
        <ChartCard title="Gerado versus pago">
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
              <Area dataKey="pago" fill="#2e5d91" stroke="#2e5d91" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Distribuição por freelancer">
          <ResponsiveContainer height={300} width="100%">
            <BarChart data={byFreelancerChart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="eventos" fill="#236f59" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </>
  );
}

function SettingsPage({
  calendarConnected,
  onConnectCalendar,
}: {
  calendarConnected: boolean;
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
              <Input value={demoOrganization.name} readOnly />
            </Field>
            <Field label="Slug">
              <Input value={demoOrganization.slug} readOnly />
            </Field>
            <Field label="Timezone">
              <Input value={demoOrganization.timezone} readOnly />
            </Field>
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
        description="Conexões externas exclusivas para administradores."
        eyebrow="Configurações > Integrações"
        title="Integrações"
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
                  Google Agenda
                </strong>
                <p className="text-sm text-[var(--muted)]">
                  Escopo somente leitura, OAuth 2.0 e tokens criptografados no
                  servidor.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone={calendarConnected ? "success" : "warning"}>
                {calendarConnected ? "Conectado" : "Não conectado"}
              </Badge>
              <Badge tone="brand">calendar.readonly</Badge>
              <Badge tone="neutral">Authorization Code Flow</Badge>
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
  entries,
  onAccept,
}: {
  freelancer: Profile;
  metrics: ReturnType<typeof getFreelancerMetrics>;
  events: EventRecord[];
  entries: FinancialEntry[];
  onAccept: (eventId: string) => void;
}) {
  const assigned = events.filter(
    (event) => event.assignedFreelancerId === freelancer.id,
  );
  const open = events.filter((event) => event.status === "open");

  return (
    <>
      <PageHeader
        description="Acesso restrito ao próprio calendário e extrato."
        eyebrow="Freelancer"
        title={`Olá, ${freelancer.fullName.split(" ")[0]}`}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          description="Trabalhos já designados"
          icon={CalendarClock}
          title="Próximos trabalhos"
          value={metrics.upcomingJobs}
        />
        <StatCard
          description="Eventos concluídos"
          icon={CheckCircle2}
          title="Realizados no mês"
          tone="green"
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
        <StatCard
          description="Disponíveis para aceite"
          icon={ClipboardList}
          title="Trabalhos abertos"
          tone="blue"
          value={metrics.availableJobs}
        />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Próximos eventos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {assigned.map((event) => (
              <EventCard
                entries={entries}
                event={event}
                freelancer={freelancer}
                key={event.id}
                role="freelancer"
              />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Trabalhos disponíveis</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {open.map((event) => (
              <EventCard
                entries={entries}
                event={event}
                key={event.id}
                role="freelancer"
                onAccept={onAccept}
              />
            ))}
          </CardContent>
        </Card>
      </div>
      <LedgerCard
        className="mt-5"
        entries={entries}
        events={events}
        profiles={[freelancer]}
      />
    </>
  );
}

function FreelancerEvents({
  freelancer,
  events,
  entries,
  onAccept,
}: {
  freelancer: Profile;
  events: EventRecord[];
  entries: FinancialEntry[];
  onAccept: (eventId: string) => void;
}) {
  return (
    <>
      <PageHeader
        description="Cards otimizados para celular com valores próprios e local do evento."
        eyebrow="Minha agenda"
        title="Eventos e oportunidades"
      />
      <div className="grid gap-3">
        {events.map((event) => (
          <EventCard
            entries={entries}
            event={event}
            freelancer={event.assignedFreelancerId ? freelancer : undefined}
            key={event.id}
            role="freelancer"
            onAccept={onAccept}
          />
        ))}
      </div>
    </>
  );
}

function FreelancerFinance({
  freelancer,
  events,
  entries,
}: {
  freelancer: Profile;
  events: EventRecord[];
  entries: FinancialEntry[];
}) {
  const balance = getFreelancerBalance(entries, freelancer.id);
  return (
    <>
      <PageHeader
        description="Extrato financeiro individual, sem dados de outros parceiros."
        eyebrow="Meu financeiro"
        title="Extrato e saldo"
      />
      <BalanceDisplay actor="freelancer" cents={balance} />
      <LedgerCard
        className="mt-5"
        entries={entries}
        events={events}
        profiles={[freelancer]}
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
          <Field label="Selecionar perfil demo">
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

function LedgerCard({
  entries,
  events,
  profiles,
  className,
}: {
  entries: FinancialEntry[];
  events: EventRecord[];
  profiles: Profile[];
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

function translateStatus(status: EventRecord["status"]) {
  const labels: Record<EventRecord["status"], string> = {
    draft: "Rascunho",
    open: "Aberto",
    assigned: "Designado",
    completed: "Realizado",
    cancelled: "Cancelado",
  };
  return labels[status];
}

function translateEntryType(type: FinancialEntry["entryType"]) {
  const labels: Record<FinancialEntry["entryType"], string> = {
    event_earning: "Receita do evento",
    payment: "Pagamento",
    advance: "Adiantamento",
    positive_adjustment: "Ajuste positivo",
    negative_adjustment: "Ajuste negativo",
    reversal: "Estorno",
  };
  return labels[type];
}
