import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("links internos administrativos", () => {
  const workspaceSource = readFileSync(
    "components/app/tracos-workspace.tsx",
    "utf8",
  );

  it("mantem menus administrativos como caminhos relativos", () => {
    const expectedLinks = [
      "/admin/dashboard",
      "/admin/eventos",
      "/admin/freelancers",
      "/admin/servicos",
      "/admin/financeiro",
      "/admin/relatorios",
      "/admin/google-agenda",
      "/admin/configuracoes",
    ];

    expectedLinks.forEach((href) => {
      expect(workspaceSource).toContain(`href: "${href}"`);
    });
  });

  it("nao usa dominio absoluto ou preview da Vercel em links internos", () => {
    expect(workspaceSource).not.toMatch(/NEXT_PUBLIC_APP_URL.*\/admin/);
    expect(workspaceSource).not.toMatch(/https:\/\/[^"']*vercel\.app\/admin/);
  });

  it("desativa prefetch nos links protegidos da navegacao", () => {
    expect(workspaceSource).toContain("prefetch={false}");
  });
});
