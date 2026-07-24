"use client";

import Link from "next/link";
import { useState } from "react";
import { Camera, KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";

export function AuthCard({ mode }: { mode: "login" | "recover" | "change" }) {
  const [message, setMessage] = useState("");
  const title =
    mode === "login"
      ? "Entrar no Traços Freelance"
      : mode === "recover"
        ? "Recuperar senha"
        : "Alterar senha";
  const button =
    mode === "login"
      ? "Entrar"
      : mode === "recover"
        ? "Enviar recuperação"
        : "Salvar nova senha";

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--brand)] text-[var(--brand-contrast)]">
              <Camera size={22} />
            </div>
            <div>
              <strong className="block text-lg text-[var(--text)]">
                Traços Freelance
              </strong>
              <span className="text-sm text-[var(--muted)]">
                Gestão de eventos e parceiros
              </span>
            </div>
          </div>

          <h1 className="mt-8 text-2xl font-black text-[var(--text)]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            A autenticação real usa Supabase Auth com sessão segura no servidor
            e redirecionamento por perfil.
          </p>

          <form
            className="mt-6 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setMessage(
                mode === "login"
                  ? "Sessão validada no modo demonstração. Use os links de perfil no README para configurar Supabase."
                  : "Solicitação registrada. Em produção, o Supabase enviará o e-mail.",
              );
            }}
          >
            {mode !== "change" ? (
              <Field label="E-mail">
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    size={16}
                  />
                  <Input
                    className="pl-9"
                    defaultValue="admin@tracosdetalhados.com.br"
                    type="email"
                  />
                </div>
              </Field>
            ) : null}
            {mode !== "recover" ? (
              <Field label={mode === "change" ? "Nova senha" : "Senha"}>
                <div className="relative">
                  <KeyRound
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
                    size={16}
                  />
                  <Input
                    className="pl-9"
                    defaultValue="demo-seguro"
                    type="password"
                  />
                </div>
              </Field>
            ) : null}
            <Button type="submit" variant="bronze">
              <ShieldCheck size={16} />
              {button}
            </Button>
          </form>

          {message ? (
            <div className="mt-4 rounded-md bg-[var(--surface-muted)] p-3 text-sm text-[var(--text)]">
              {message}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-[var(--brand)]">
            <Link href="/admin/dashboard">Entrar como admin</Link>
            <Link href="/freelancer/dashboard">Entrar como freelancer</Link>
            {mode === "login" ? (
              <Link href="/recuperar-senha">Recuperar senha</Link>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
