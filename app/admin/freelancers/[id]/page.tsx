import { WorkspacePage } from "@/components/app/workspace-page";

export default async function AdminFreelancerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <WorkspacePage entityId={id} role="admin" view="admin-freelancer-detail" />
  );
}
