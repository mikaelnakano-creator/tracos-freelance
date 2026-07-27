import { Badge } from "@/components/ui/badge";
import type { ComponentProps } from "react";
import type { SlotStatus } from "@/lib/domain/types";

const labels: Record<SlotStatus, string> = {
  draft: "Rascunho",
  open: "Aberta",
  assigned: "Confirmada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const tones: Record<SlotStatus, ComponentProps<typeof Badge>["tone"]> = {
  draft: "neutral",
  open: "info",
  assigned: "success",
  completed: "success",
  cancelled: "danger",
};

export function SlotStatusBadge({ status }: { status: SlotStatus }) {
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}
