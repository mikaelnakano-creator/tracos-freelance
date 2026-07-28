import { redirect } from "next/navigation";
import { AuthCard } from "@/components/app/auth-card";
import { ConfigurationPending } from "@/components/app/configuration-pending";
import { accessRedirectPath, getCurrentAppAccess } from "@/lib/auth/access";
import {
  getMissingRuntimeEnv,
  hasSupabasePublicEnv,
  shouldShowPendingConfiguration,
} from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (shouldShowPendingConfiguration()) {
    return <ConfigurationPending missing={getMissingRuntimeEnv()} />;
  }

  if (hasSupabasePublicEnv()) {
    const access = await getCurrentAppAccess();

    if (access.status !== "unauthenticated") {
      redirect(accessRedirectPath(access));
    }
  }

  return <AuthCard />;
}
