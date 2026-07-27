import { AuthCard } from "@/components/app/auth-card";
import { ConfigurationPending } from "@/components/app/configuration-pending";
import {
  getMissingRuntimeEnv,
  shouldShowPendingConfiguration,
} from "@/lib/env";

export default function LoginPage() {
  if (shouldShowPendingConfiguration()) {
    return <ConfigurationPending missing={getMissingRuntimeEnv()} />;
  }

  return <AuthCard />;
}
