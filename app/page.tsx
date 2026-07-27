import { redirect } from "next/navigation";
import { shouldShowPendingConfiguration } from "@/lib/env";

export default function Home() {
  if (shouldShowPendingConfiguration()) {
    redirect("/configuracao-pendente");
  }

  redirect("/login");
}
