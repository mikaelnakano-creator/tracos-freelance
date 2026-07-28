import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function SessionErrorPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center sm:p-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-[var(--surface-muted)] text-[var(--danger)]">
            <AlertTriangle size={22} />
          </div>
          <h1 className="mt-5 text-2xl font-black text-[var(--text)]">
            Nao foi possivel validar seu acesso
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            A sessao existe, mas o sistema nao conseguiu confirmar suas
            permissoes neste momento. Atualize a pagina em alguns instantes.
          </p>
          <Link
            className="mt-6 inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--brand-contrast)]"
            href="/selecionar-area"
            prefetch={false}
          >
            Tentar novamente
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
