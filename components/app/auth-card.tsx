import { Camera, ShieldCheck } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AuthCard() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-md bg-[var(--brand)] text-[var(--brand-contrast)]">
              <Camera size={22} />
            </div>
            <div>
              <strong className="block text-lg text-[var(--text)]">
                Traços Freelance
              </strong>
              <span className="text-sm text-[var(--muted)]">
                Traços Detalhados
              </span>
            </div>
          </div>

          <h1 className="mt-8 text-2xl font-black text-[var(--text)]">
            Acesso autorizado
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Entre com a conta Google autorizada pela Traços Detalhados. O acesso
            é liberado somente para e-mails previamente cadastrados pela
            empresa.
          </p>

          <LinkButton
            className="mt-6 w-full"
            href="/auth/google"
            variant="bronze"
          >
            <span className="grid h-6 w-6 place-items-center rounded bg-white text-sm font-black text-[#4285f4]">
              G
            </span>
            Continuar com Google
          </LinkButton>

          <div className="mt-5 flex items-start gap-2 rounded-md bg-[var(--surface-muted)] p-3 text-xs leading-5 text-[var(--muted)]">
            <ShieldCheck
              className="mt-0.5 shrink-0 text-[var(--brand)]"
              size={16}
            />
            <span>
              A função de administrador ou freelancer vem do banco de dados. Não
              é possível escolher perfil pela tela de login.
            </span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
