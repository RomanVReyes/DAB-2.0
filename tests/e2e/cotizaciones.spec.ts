import { test, expect } from "@playwright/test";
test("sin sesión no se puede abrir ninguna ruta comercial", async ({
  page,
}) => {
  for (const path of [
    "/cotizaciones",
    "/cotizaciones/nueva",
    "/cotizaciones/10000000-0000-4000-8000-000000000001",
    "/cotizaciones/10000000-0000-4000-8000-000000000001/editar",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeVisible();
  }
});
test("login es accesible con teclado y sin desbordamiento", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").focus();
  await expect(page.getByLabel("Correo electrónico")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Contraseña")).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("flujo ADM real: crear, listar, abrir, editar y salir", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_ADM_EMAIL || !process.env.E2E_ADM_PASSWORD,
    "Requiere cuenta ADM de pruebas en variables de entorno.",
  );
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(process.env.E2E_ADM_EMAIL!);
  await page.getByLabel("Contraseña").fill(process.env.E2E_ADM_PASSWORD!);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/cotizaciones/);
  await page.getByRole("link", { name: "Nueva cotización" }).click();
  await page
    .getByLabel("Empresa", { exact: true })
    .selectOption("10000000-0000-4000-8000-000000000001");
  await page
    .getByLabel("Solicitante", { exact: true })
    .selectOption("20000000-0000-4000-8000-000000000001");
  const name = `E2E prueba ${Date.now()}`;
  await page.getByLabel("Nombre del proyecto").fill(name);
  await page.getByRole("button", { name: "Agregar partida" }).click();
  await page
    .getByLabel("Concepto 1", { exact: true })
    .selectOption("40000000-0000-4000-8000-000000000001");
  await page.getByLabel("Cantidad 1", { exact: true }).fill("1.25");
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Borrador guardado correctamente",
  );
  await page.getByRole("link", { name: "Ver detalle", exact: true }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page
    .getByRole("link", { name: "Editar borrador", exact: true })
    .click();
  await page.getByLabel("Nombre del proyecto").fill(`${name} editado`);
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Borrador guardado correctamente",
  );
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login/);
});
