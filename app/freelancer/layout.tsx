import type { ReactNode } from "react";
import { requireFreelancerRoute } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function FreelancerLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireFreelancerRoute();
  return children;
}
