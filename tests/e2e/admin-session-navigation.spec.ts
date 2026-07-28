import { expect, test } from "@playwright/test";

test("admin navega pelos menus internos sem retornar para login", async ({
  page,
}) => {
  await page.goto("/admin/dashboard");
  await expect(page).not.toHaveURL(/\/login/);

  for (const href of [
    "/admin/eventos",
    "/admin/freelancers",
    "/admin/servicos",
    "/admin/financeiro",
    "/admin/relatorios",
    "/admin/google-agenda",
    "/admin/configuracoes",
  ]) {
    if ((page.viewportSize()?.width ?? 0) < 1024) {
      await page.getByRole("button", { name: "Abrir menu" }).click();
    }

    await page.locator(`a[href="${href}"]`).first().click();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText("Acesso autorizado");
  }
});
