import { ConfigurationPending } from "@/components/app/configuration-pending";
import {
  TracosWorkspace,
  type WorkspaceView,
} from "@/components/app/tracos-workspace";
import { getWorkspaceData } from "@/lib/data/workspace";
import {
  getMissingRuntimeEnv,
  hasSupabaseServerEnv,
  isDemoModeAllowed,
  shouldShowPendingConfiguration,
} from "@/lib/env";

type WorkspacePageProps = {
  view: WorkspaceView;
  entityId?: string;
  role: "admin" | "freelancer";
};

export async function WorkspacePage({
  view,
  entityId,
  role,
}: WorkspacePageProps) {
  if (shouldShowPendingConfiguration()) {
    return <ConfigurationPending missing={getMissingRuntimeEnv()} />;
  }

  if (hasSupabaseServerEnv()) {
    const data = await getWorkspaceData();
    return (
      <TracosWorkspace
        data={data}
        demoMode={false}
        entityId={entityId}
        role={role}
        view={view}
      />
    );
  }

  if (isDemoModeAllowed()) {
    return (
      <TracosWorkspace demoMode entityId={entityId} role={role} view={view} />
    );
  }

  return <ConfigurationPending missing={getMissingRuntimeEnv()} />;
}
