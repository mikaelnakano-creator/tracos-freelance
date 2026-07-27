import { ConfigurationPending } from "@/components/app/configuration-pending";
import { getMissingRuntimeEnv } from "@/lib/env";

export default function PendingConfigurationPage() {
  return <ConfigurationPending missing={getMissingRuntimeEnv()} />;
}
