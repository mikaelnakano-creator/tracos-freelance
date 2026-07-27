import { AlertTriangle, CheckCircle2, Database, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ConfigurationPendingProps = {
  missing: readonly string[];
};

export function ConfigurationPending({ missing }: ConfigurationPendingProps) {
  const items = missing.length > 0 ? missing : ["Configuração externa"];

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] p-4">
      <Card className="w-full max-w-2xl overflow-hidden">
        <CardHeader className="border-b border-[var(--border)] bg-white">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-[var(--brand)] text-[var(--brand-contrast)]">
              <AlertTriangle size={22} />
            </div>
            <div>
              <Badge tone="warning">Configuração pendente</Badge>
              <CardTitle className="mt-3 text-2xl">
                O sistema foi publicado, mas a conexão com o banco e a
                autenticação ainda precisam ser configuradas.
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 p-6">
          <p className="text-sm leading-6 text-[var(--muted)]">
            Para proteger os dados da Traços Detalhados, a versão de produção
            não carrega informações simuladas quando as credenciais reais ainda
            não existem. Configure as variáveis abaixo na hospedagem e faça um
            novo deploy.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((key) => (
              <div
                className="flex min-w-0 items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] p-3"
                key={key}
              >
                <KeyRound className="shrink-0 text-[var(--brand)]" size={18} />
                <span className="truncate text-sm font-bold text-[var(--text)]">
                  {key}
                </span>
              </div>
            ))}
          </div>

          <div className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">
            <div className="flex gap-3">
              <Database
                className="mt-0.5 shrink-0 text-[var(--brand)]"
                size={18}
              />
              <span>
                As migrations do Supabase estão no projeto e devem ser aplicadas
                em um projeto Supabase real antes do uso em produção.
              </span>
            </div>
            <div className="flex gap-3">
              <CheckCircle2
                className="mt-0.5 shrink-0 text-[var(--success)]"
                size={18}
              />
              <span>
                Nenhum valor secreto, token, stack trace ou dado interno é
                exibido nesta tela.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
