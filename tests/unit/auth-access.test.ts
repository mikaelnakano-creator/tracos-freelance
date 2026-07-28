import { describe, expect, it } from "vitest";
import {
  accessRedirectPath,
  dashboardPathForRole,
  dashboardPathForRoles,
  type AppAccessResult,
} from "@/lib/auth/access";

describe("autorização por Google e e-mail cadastrado", () => {
  it("redireciona administrador autorizado para o dashboard admin", () => {
    expect(dashboardPathForRole("admin")).toBe("/admin/dashboard");
    expect(
      accessRedirectPath({
        status: "authorized",
        roles: ["admin"],
        profileId: "admin-1",
        organizationId: "org-1",
      }),
    ).toBe("/admin/dashboard");
  });

  it("redireciona freelancer autorizado para o dashboard único", () => {
    expect(dashboardPathForRole("freelancer")).toBe("/freelancer");
    expect(
      accessRedirectPath({
        status: "authorized",
        roles: ["freelancer"],
        profileId: "freelancer-1",
        organizationId: "org-1",
      }),
    ).toBe("/freelancer");
  });

  it("redireciona usuário com admin e freelancer para seleção de área", () => {
    expect(dashboardPathForRoles(["admin", "freelancer"])).toBe(
      "/selecionar-area",
    );
    expect(
      accessRedirectPath({
        status: "authorized",
        roles: ["admin", "freelancer"],
        profileId: "mikael",
        organizationId: "org-1",
      }),
    ).toBe("/selecionar-area");
  });

  it("bloqueia e-mail Google não autorizado", () => {
    const access: AppAccessResult = {
      status: "unauthorized",
      message:
        "Esta conta Google ainda não foi autorizada pela Traços Detalhados.",
    };

    expect(accessRedirectPath(access)).toBe("/acesso-negado");
  });

  it("diferencia sessao ausente de acesso negado", () => {
    const access: AppAccessResult = {
      status: "unauthenticated",
      message: "Sessao ausente.",
      code: "missing_session",
    };

    expect(accessRedirectPath(access)).toBe("/login");
  });

  it("nao transforma erro de consulta em novo login", () => {
    const access: AppAccessResult = {
      status: "error",
      message: "Nao foi possivel consultar seu acesso agora.",
      code: "profile_query_failed",
    };

    expect(accessRedirectPath(access)).toBe(
      "/erro-sessao?erro=profile_query_failed",
    );
  });

  it("bloqueia conta inativa", () => {
    const access: AppAccessResult = {
      status: "inactive",
      message: "Sua conta está inativa. Entre em contato com a empresa.",
    };

    expect(accessRedirectPath(access)).toBe("/conta-inativa");
  });
});
