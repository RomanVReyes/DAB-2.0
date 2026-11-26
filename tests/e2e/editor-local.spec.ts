import { test, expect } from "@playwright/test";
import { build } from "vite";
import path from "node:path";
import { readdir, readFile } from "node:fs/promises";

// Monta los componentes reales y el CSS compilado. Los dos guardados son dobles
// locales; la persistencia y autorización se ejercitan por separado en PostgreSQL.
let script = "",
  css = "";
test.beforeAll(async () => {
  const bundle = await build({
    configFile: false,
    logLevel: "error",
    resolve: { alias: { "@": path.resolve("src") } },
    build: {
      write: false,
      minify: false,
      lib: {
        entry: "tests/e2e/fixtures/editor.jsx",
        formats: ["iife"],
        name: "Prueba",
      },
    },
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    plugins: [
      {
        name: "editor-de-prueba",
        enforce: "pre",
        resolveId(id) {
          if (
            id.endsWith("cotizaciones.actions") ||
            id.endsWith("seguimiento.actions") ||
            id === "next/link"
          )
            return "\\0" + id;
        },
        load(id) {
          if (id === "\\0next/link")
            return 'import React from "react";export default function Link(props){return React.createElement("a",props)}';
          if (id.endsWith(".actions"))
            return 'export const guardarCotizacionAction=async()=>({});export const seguimientoAction=async()=>{document.title="Confirmado";return {}}';
        },
      },
    ],
  });
  const output = Array.isArray(bundle) ? bundle[0] : bundle;
  if (!("output" in output)) throw Error("Sin bundle de pruebas");
  script = output.output
    .filter((c) => c.type === "chunk")
    .map((c) => c.code)
    .join("\n");
  for (const name of await readdir(".next/static", { recursive: true }))
    if (name.endsWith(".css"))
      css += await readFile(path.join(".next/static", name), "utf8");
});
test("editor local: cálculo, cambios sin guardar, confirmación y distribución", async ({
  page,
}, info) => {
  await page.route("http://localhost:3199/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body:
        '<meta name="viewport" content="width=device-width"><style>' +
        css +
        '</style><main id="root" class="mx-auto max-w-6xl p-4"></main>',
    }),
  );
  await page.goto("http://localhost:3199/");
  await page.addScriptTag({ content: script });
  await page.getByRole("button", { name: "Agregar partida" }).click();
  await page.getByLabel("Concepto 1").selectOption("material");
  await page.getByLabel("Cálculo").selectOption("directo");
  await page.getByLabel("Importe negociado").fill("22.25");
  await expect(page.locator("aside")).toContainText("22.25");
  await page.getByLabel("Cálculo").selectOption("hora");
  await page.getByLabel("Horas presupuestadas 1").fill("2.5");
  await expect(page.locator("aside")).toContainText("55.63");
  await page.getByLabel("Cálculo").selectOption("unidad");
  await page.getByLabel("Cantidad 1").fill("3");
  await expect(page.locator("aside")).toContainText("66.75");
  await expect(page.locator("aside")).toHaveCSS(
    "position",
    info.project.name === "desktop" ? "sticky" : "static",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "Cancelar" }).click();
  await expect(page.getByLabel("Cantidad 1")).toHaveValue("3");
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("aprobada");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Guardar seguimiento" }).click();
  await expect(page).not.toHaveTitle("Confirmado");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Guardar seguimiento" }).click();
  await expect(page).toHaveTitle("Confirmado");
});
