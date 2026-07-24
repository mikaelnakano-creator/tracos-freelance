import { TracosWorkspace } from "@/components/app/tracos-workspace";

export default async function AdminFreelancerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <TracosWorkspace
      entityId={id}
      role="admin"
      view="admin-freelancer-detail"
    />
  );
}
