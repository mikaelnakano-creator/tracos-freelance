import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { EventStatusBadge } from "@/components/app/event-status-badge";
import { BalanceDisplay } from "@/components/app/balance-display";
import type { EventRecord, FinancialEntry, Profile } from "@/lib/domain/types";
import { formatShortDate, formatTime } from "@/lib/dates";
import { formatMoney } from "@/lib/domain/money";
import { getEventBalance } from "@/lib/domain/finance";

export function DataTable({
  events,
  entries,
  profiles,
  query,
  status,
  freelancer,
  onQueryChange,
  onStatusChange,
  onFreelancerChange,
}: {
  events: EventRecord[];
  entries: FinancialEntry[];
  profiles: Profile[];
  query: string;
  status: string;
  freelancer: string;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onFreelancerChange: (value: string) => void;
}) {
  const freelancers = profiles.filter(
    (profile) =>
      profile.roles?.includes("freelancer") ?? profile.role === "freelancer",
  );
  const filtered = events
    .filter((event) => (status === "all" ? true : event.status === status))
    .filter((event) =>
      freelancer === "all" ? true : event.assignedFreelancerId === freelancer,
    )
    .filter((event) => {
      const needle = query.toLowerCase();
      return (
        event.title.toLowerCase().includes(needle) ||
        event.locationName.toLowerCase().includes(needle) ||
        event.serviceName.toLowerCase().includes(needle)
      );
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid gap-3 pb-4 lg:grid-cols-[1fr_180px_220px]">
          <label className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              size={16}
            />
            <Input
              className="pl-9"
              placeholder="Pesquisar por nome, serviço ou local"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </label>
          <Select
            value={status}
            onChange={(event) => onStatusChange(event.target.value)}
          >
            <option value="all">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="open">Aberto</option>
            <option value="assigned">Designado</option>
            <option value="completed">Realizado</option>
            <option value="cancelled">Cancelado</option>
          </Select>
          <Select
            value={freelancer}
            onChange={(event) => onFreelancerChange(event.target.value)}
          >
            <option value="all">Todos os freelancers</option>
            {freelancers.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.fullName}
              </option>
            ))}
          </Select>
        </div>

        <div className="hidden md:block">
          <Table>
            <thead>
              <tr>
                <Th>Evento</Th>
                <Th>Data</Th>
                <Th>Status</Th>
                <Th>Freelancer</Th>
                <Th>Valor</Th>
                <Th>Saldo</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => {
                const assigned = profiles.find(
                  (profile) => profile.id === event.assignedFreelancerId,
                );
                return (
                  <tr key={event.id}>
                    <Td>
                      <strong className="block text-[var(--text)]">
                        {event.title}
                      </strong>
                      <span className="text-xs text-[var(--muted)]">
                        {event.serviceName} - {event.locationName}
                      </span>
                    </Td>
                    <Td>
                      {formatShortDate(event.startsAt)}
                      <span className="block text-xs text-[var(--muted)]">
                        {event.allDay
                          ? "Dia inteiro"
                          : formatTime(event.startsAt)}
                      </span>
                    </Td>
                    <Td>
                      <EventStatusBadge status={event.status} />
                    </Td>
                    <Td>
                      {assigned?.fullName ?? (
                        <Badge tone="warning">Aberto</Badge>
                      )}
                    </Td>
                    <Td>{formatMoney(event.freelancerFeeCents)}</Td>
                    <Td>
                      <BalanceDisplay
                        cents={getEventBalance(event, entries)}
                        compact
                      />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>

        <div className="grid gap-3 md:hidden">
          {filtered.map((event) => (
            <div
              className="rounded-lg border border-[var(--border)] bg-white p-4"
              key={event.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="text-[var(--text)]">{event.title}</strong>
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    {formatShortDate(event.startsAt)} - {event.locationName}
                  </span>
                </div>
                <EventStatusBadge status={event.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="brand">
                  {formatMoney(event.freelancerFeeCents)}
                </Badge>
                <BalanceDisplay
                  cents={getEventBalance(event, entries)}
                  compact
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
