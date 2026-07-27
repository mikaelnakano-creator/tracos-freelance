import { Badge } from "@/components/ui/badge";
import type { EventStatus } from "@/lib/domain/types";

const labels: Record<EventStatus, string> = {
  draft: "Rascunho",
  open: "Aberto",
  assigned: "Designado",
  partially_assigned: "Equipe parcial",
  fully_assigned: "Equipe completa",
  completed: "Realizado",
  cancelled: "Cancelado",
};

const tones: Record<
  EventStatus,
  "neutral" | "warning" | "success" | "danger" | "info"
> = {
  draft: "neutral",
  open: "warning",
  assigned: "info",
  partially_assigned: "warning",
  fully_assigned: "success",
  completed: "success",
  cancelled: "danger",
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}
