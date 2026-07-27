import { Camera, ShieldAlert } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AccessDeniedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-md bg-[var(--brand)] text-[var(--brand-contrast)]">
              <Camera size={22} />
            </span>
            <div>
              <strong className="block text-lg">Traços Freelance</strong>
              <span className="text-sm text-[var(--muted)]">
                Traços Detalhados
              </span>
            </div>
          </div>
          <ShieldAlert className="mt-8 text-[var(--danger)]" size={34} />
          <h1 className="mt-4 text-2xl font-black text-[var(--text)]">
            Acesso não autorizado
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Esta conta Google ainda não foi autorizada pela Traços Detalhados.
            Entre em contato com a empresa.
          </p>
          <LinkButton className="mt-6 w-full" href="/login" variant="secondary">
            Voltar para o login
          </LinkButton>
        </CardContent>
      </Card>
    </main>
  );
}
