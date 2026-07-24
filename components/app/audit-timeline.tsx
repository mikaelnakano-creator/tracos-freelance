import { History } from "lucide-react";
import type { AuditLog, Profile } from "@/lib/domain/types";
import { formatDateTimeRange, formatShortDate } from "@/lib/dates";

export function AuditTimeline({
  logs,
  profiles,
}: {
  logs: AuditLog[];
  profiles: Profile[];
}) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Nenhuma alteração registrada para este filtro.
      </p>
    );
  }

  return (
    <ol className="grid gap-3">
      {logs.map((log) => {
        const user = profiles.find((profile) => profile.id === log.userId);
        return (
          <li
            className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-[var(--border)] bg-white p-3"
            key={log.id}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--surface-muted)] text-[var(--brand)]">
              <History size={16} />
            </span>
            <div>
              <strong className="block text-sm text-[var(--text)]">
                {translateAction(log.action)}
              </strong>
              <span className="text-xs text-[var(--muted)]">
                {user?.fullName ?? "Usuário"} em{" "}
                {formatShortDate(log.createdAt)}
              </span>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {formatDateTimeRange(log.createdAt, log.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function translateAction(action: string) {
  const dictionary: Record<string, string> = {
    "event.created": "Evento criado",
    "event.updated": "Evento editado",
    "event.assigned": "Freelancer designado",
    "event.accepted": "Evento aceito",
    "event.completed": "Evento concluído",
    "event.cancelled": "Evento cancelado",
    "payment.created": "Pagamento registrado",
    "advance.created": "Adiantamento registrado",
    "google_event.imported": "Evento importado do Google Agenda",
  };

  return dictionary[action] ?? action;
}
