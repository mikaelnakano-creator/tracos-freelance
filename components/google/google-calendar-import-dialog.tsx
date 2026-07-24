"use client";

import { useMemo, useState } from "react";
import { CalendarSearch, Check, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import type { EventRecord, GoogleCalendarEvent } from "@/lib/domain/types";
import { formatDateTimeRange } from "@/lib/dates";

export function GoogleCalendarImportDialog({
  isOpen,
  connected,
  googleEvents,
  existingEvents,
  onClose,
  onConnect,
  onSelect,
}: {
  isOpen: boolean;
  connected: boolean;
  googleEvents: GoogleCalendarEvent[];
  existingEvents: EventRecord[];
  onClose: () => void;
  onConnect: () => void;
  onSelect: (event: GoogleCalendarEvent) => void;
}) {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("30-180");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = useMemo(
    () =>
      googleEvents.filter((event) =>
        event.title.toLowerCase().includes(query.toLowerCase()),
      ),
    [googleEvents, query],
  );
  const selected = filtered.find((event) => event.id === selectedId) ?? null;

  if (!isOpen) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
      role="dialog"
    >
      <Card className="max-h-[92vh] w-full max-w-5xl overflow-auto">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Importar do Google Agenda</CardTitle>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Selecione a agenda, o período e confirme antes de criar o evento
              no sistema.
            </p>
          </div>
          <Button onClick={onClose} variant="ghost">
            Fechar
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          {!connected ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-5">
              <Badge tone="warning">Não conectado</Badge>
              <h3 className="mt-3 font-bold text-[var(--text)]">
                Conecte a conta do Google Agenda
              </h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                A integração usa OAuth 2.0 no servidor e escopo somente leitura.
              </p>
              <Button className="mt-4" onClick={onConnect} variant="bronze">
                Conectar Google Agenda
              </Button>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-[220px_220px_1fr]">
            <Field label="Agenda">
              <Select>
                <option>Traços Detalhados - Eventos</option>
                <option>Agenda principal</option>
              </Select>
            </Field>
            <Field label="Período">
              <Select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              >
                <option value="30-180">30 dias anteriores a 180 futuros</option>
                <option value="30">Últimos 30 dias</option>
                <option value="180">Próximos 180 dias</option>
              </Select>
            </Field>
            <Field label="Pesquisar">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                  size={16}
                />
                <Input
                  className="pl-9"
                  placeholder="Nome do evento"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-2">
              {filtered.map((event) => {
                const duplicated = existingEvents.some(
                  (item) =>
                    item.googleCalendarId === event.calendarId &&
                    item.googleEventId === event.id,
                );
                return (
                  <button
                    className="rounded-lg border border-[var(--border)] bg-white p-4 text-left transition hover:border-[var(--brand)]"
                    key={event.id}
                    onClick={() => setSelectedId(event.id)}
                    type="button"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <strong className="text-[var(--text)]">
                          {event.title}
                        </strong>
                        <span className="mt-1 block text-sm text-[var(--muted)]">
                          {formatDateTimeRange(event.startsAt, event.endsAt)}
                        </span>
                      </div>
                      {duplicated ? (
                        <Badge tone="danger">Já importado</Badge>
                      ) : event.allDay ? (
                        <Badge tone="warning">Dia inteiro</Badge>
                      ) : (
                        <Badge tone="brand">Disponível</Badge>
                      )}
                    </div>
                    <span className="mt-2 block text-xs text-[var(--muted)]">
                      {event.location || "Sem local informado"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4">
              {selected ? (
                <>
                  <Badge tone="brand">Prévia</Badge>
                  <h3 className="mt-3 text-lg font-black text-[var(--text)]">
                    {selected.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {formatDateTimeRange(selected.startsAt, selected.endsAt)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {selected.location || "Sem local informado"}
                  </p>
                  {selected.htmlLink ? (
                    <a
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand)]"
                      href={selected.htmlLink}
                    >
                      Abrir no Google Agenda
                      <ExternalLink size={14} />
                    </a>
                  ) : null}
                  {existingEvents.some(
                    (item) =>
                      item.googleCalendarId === selected.calendarId &&
                      item.googleEventId === selected.id,
                  ) ? (
                    <div className="mt-4 rounded-md bg-white p-3 text-sm text-[var(--danger)]">
                      Este evento do Google Agenda já foi importado.
                    </div>
                  ) : (
                    <Button
                      className="mt-4 w-full"
                      onClick={() => onSelect(selected)}
                      variant="bronze"
                    >
                      <Check size={16} />
                      Usar este evento
                    </Button>
                  )}
                </>
              ) : (
                <div className="grid min-h-60 place-items-center text-center text-sm text-[var(--muted)]">
                  <div>
                    <CalendarSearch className="mx-auto mb-3" size={34} />
                    Selecione um evento para ver a prévia.
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
