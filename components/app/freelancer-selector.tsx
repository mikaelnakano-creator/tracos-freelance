import { Select } from "@/components/ui/input";
import type { Profile } from "@/lib/domain/types";

export function FreelancerSelector({
  value,
  freelancers,
  onChange,
  includeOpen = false,
}: {
  value?: string;
  freelancers: Profile[];
  onChange: (value: string) => void;
  includeOpen?: boolean;
}) {
  return (
    <Select
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    >
      {includeOpen ? <option value="">Deixar aberto</option> : null}
      {freelancers
        .filter((profile) => profile.role === "freelancer" && profile.isActive)
        .map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.fullName}
          </option>
        ))}
    </Select>
  );
}
