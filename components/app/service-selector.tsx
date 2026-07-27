"use client";

import { Select } from "@/components/ui/input";
import type { ServiceRecord } from "@/lib/domain/types";

export function ServiceSelector({
  services,
  value,
  onChange,
}: {
  services: ServiceRecord[];
  value: string;
  onChange: (service: ServiceRecord) => void;
}) {
  return (
    <Select
      value={value}
      onChange={(event) => {
        const service = services.find((item) => item.id === event.target.value);
        if (service) onChange(service);
      }}
    >
      {services
        .filter((service) => service.isActive)
        .map((service) => (
          <option key={service.id} value={service.id}>
            {service.name}
          </option>
        ))}
    </Select>
  );
}
