import { expect, test } from "@playwright/test";

test("admin visualiza dashboard e cria evento", async ({ page }) => {
  await page.goto("/admin/dashboard");
  await expect(
    page.getByRole("heading", { name: "Dashboard da empresa" }),
  ).toBeVisible();

  await page.goto("/admin/eventos/novo");
  await expect(
    page.getByRole("heading", { name: "Novo evento" }),
  ).toBeVisible();
  await page.getByLabel("Tipo de serviço").fill("Fotografia principal");
  await page.getByLabel("Local").fill("Espaço Jardim");
  await page.getByRole("button", { name: /Publicar aberto/i }).click();
  await expect(page.getByText("Evento salvo com sucesso.")).toBeVisible();
});

test("freelancer aceita trabalho aberto e vê extrato", async ({ page }) => {
  await page.goto("/freelancer/oportunidades");
  await expect(
    page.getByRole("heading", { name: "Eventos e oportunidades" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aceitar trabalho" }).first().click();
  await expect(
    page.getByText("Trabalho aceito. Você ficou com este evento."),
  ).toBeVisible();

  await page.goto("/freelancer/financeiro");
  await expect(
    page.getByRole("heading", { name: "Extrato e saldo" }),
  ).toBeVisible();
});
