import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

export const DEFAULT_TIMEZONE = "America/Cuiaba";

export function formatShortDate(value: string) {
  return format(parseISO(value), "dd/MM/yyyy", { locale: ptBR });
}

export function formatLongDate(value: string) {
  return format(parseISO(value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatTime(value: string | null) {
  if (!value) return "Evento de dia inteiro";
  return format(parseISO(value), "HH:mm", { locale: ptBR });
}

export function formatDateTimeRange(startsAt: string, endsAt: string | null) {
  const date = formatLongDate(startsAt);
  if (!endsAt) return `${date} - Evento de dia inteiro`;
  return `${date}, ${formatTime(startsAt)} às ${formatTime(endsAt)}`;
}

export function toIsoDateTime(date: string, time?: string | null) {
  if (!time) return `${date}T12:00:00-04:00`;
  return `${date}T${time}:00-04:00`;
}
