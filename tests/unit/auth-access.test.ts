import { describe, expect, it } from "vitest";
import {
  accessRedirectPath,
  dashboardPathForRole,
  type AppAccessResult,
} from "@/lib/auth/access";

describe("autorização por Google e e-mail cadastrado", () => {
  it("redireciona administrador autorizado para o dashboard admin", () => {
    expect(dashboardPathForRole("admin")).toBe("/admin/dashboard");
    expect(
      accessRedirectPath({
        status: "authorized",
        role: "admin",
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
        role: "freelancer",
        profileId: "freelancer-1",
        organizationId: "org-1",
      }),
    ).toBe("/freelancer");
  });

  it("bloqueia e-mail Google não autorizado", () => {
    const access: AppAccessResult = {
      status: "unauthorized",
      message:
        "Esta conta Google ainda não foi autorizada pela Traços Detalhados.",
    };

    expect(accessRedirectPath(access)).toBe("/acesso-negado");
  });

  it("bloqueia conta inativa", () => {
    const access: AppAccessResult = {
      status: "inactive",
      message: "Sua conta está inativa. Entre em contato com a empresa.",
    };

    expect(accessRedirectPath(access)).toBe("/conta-inativa");
  });
});
