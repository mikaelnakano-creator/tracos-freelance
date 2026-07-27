import { expect, test } from "@playwright/test";

test("login mostra somente entrada com Google", async ({ page }) => {
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Acesso autorizado" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Continuar com Google/i }),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail")).toHaveCount(0);
});

test("admin visualiza dashboard e cria evento", async ({ page }) => {
  await page.goto("/admin/dashboard");
  await expect(
    page.getByRole("heading", { name: "Dashboard da empresa" }),
  ).toBeVisible();

  await page.goto("/admin/eventos/novo");
  await expect(
    page.getByRole("heading", { name: "Novo evento" }),
  ).toBeVisible();
  await page.getByLabel("Nome do evento").fill("Pré-wedding Rafa e Caio");
  await page.getByLabel("Local").fill("Espaço Jardim");
  await page.getByRole("button", { name: /Publicar vagas/i }).click();
  await expect(
    page.getByText("Evento salvo com serviços e vagas profissionais."),
  ).toBeVisible();
});

test("freelancer usa dashboard único e aceita trabalho aberto", async ({
  page,
}) => {
  await page.goto("/freelancer");
  await expect(page.getByRole("heading", { name: /Olá,/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Trabalhos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Financeiro" })).toBeVisible();

  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Aceitar trabalho" }).first().click();
  await expect(
    page.getByText("Vaga aceita. Você ficou com este trabalho."),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Extrato completo" }),
  ).toBeVisible();
});
