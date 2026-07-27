import { redirect } from "next/navigation";
import { BriefcaseBusiness, LayoutDashboard } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { accessRedirectPath, getCurrentAppAccess } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function SelectAreaPage() {
  const access = await getCurrentAppAccess();

  if (access.status !== "authorized") redirect(accessRedirectPath(access));

  const hasAdmin = access.roles.includes("admin");
  const hasFreelancer = access.roles.includes("freelancer");

  if (!hasAdmin || !hasFreelancer) redirect(accessRedirectPath(access));

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] p-4">
      <div className="w-full max-w-5xl">
        <div className="mb-6">
          <span className="grid h-12 w-12 place-items-center rounded-md bg-[var(--brand)] font-black text-[var(--brand-contrast)]">
            TD
          </span>
          <h1 className="mt-4 text-3xl font-black text-[var(--text)]">
            Escolha sua área
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Seu usuário possui acesso administrativo e também painel de
            freelancer. Você pode alternar entre as duas áreas quando precisar.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="grid h-11 w-11 place-items-center rounded-md bg-[var(--surface-muted)] text-[var(--brand)]">
                <LayoutDashboard size={22} />
              </div>
              <CardTitle>Área administrativa</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="min-h-12 text-sm leading-6 text-[var(--muted)]">
                Gerencie eventos, equipe, serviços e informações financeiras.
              </p>
              <LinkButton
                className="mt-5 w-full"
                href="/admin/dashboard"
                variant="bronze"
              >
                Acessar administração
              </LinkButton>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="grid h-11 w-11 place-items-center rounded-md bg-[var(--surface-muted)] text-[var(--brand)]">
                <BriefcaseBusiness size={22} />
              </div>
              <CardTitle>Meu painel de freelancer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="min-h-12 text-sm leading-6 text-[var(--muted)]">
                Consulte seus trabalhos, oportunidades e informações
                financeiras.
              </p>
              <LinkButton
                className="mt-5 w-full"
                href="/freelancer"
                variant="secondary"
              >
                Acessar meu painel
              </LinkButton>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
