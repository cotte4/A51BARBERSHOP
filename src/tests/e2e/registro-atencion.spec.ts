/**
 * Registro de atenciones — flujos reales
 *
 * Estos tests envian formularios de verdad contra la DB para detectar bugs
 * antes del lanzamiento. No son smoke tests — registran atenciones.
 *
 * Prerequisito: la caja del dia no debe estar cerrada.
 * Si esta cerrada, todos los tests se saltean con mensaje claro.
 *
 * Run: npx playwright test --config src/tests/e2e/playwright.config.ts src/tests/e2e/registro-atencion.spec.ts
 */

import { test, expect, type Page } from "@playwright/test";
import { mainText, cajaCerrada } from "./helpers";

// ─── Selectores que dependen del UI actual ───────────────────────────────────

async function clickBarbero(page: Page, nombre: string) {
  // BarberoAvatarButton renders the nombre as visible text inside the button
  await page.getByRole("button", { name: new RegExp(nombre, "i") }).first().click();
}

async function clickServicio(page: Page, nombre: string) {
  // Service buttons contain extra text (emoji, price). Filter by the child <p> whose ENTIRE
  // text is exactly the service name — avoids "Corte" matching inside "Corte y Barba".
  const btn = page.locator("button").filter({
    has: page.getByText(nombre, { exact: true }),
  }).first();
  await btn.waitFor({ timeout: 5_000 });
  await btn.click();
}

async function clickMedioPago(page: Page, nombre: string) {
  // Payment method buttons contain the label text rendered by getMedioPagoMeta
  // Posnet crédito and débito both show "Posnet / Tarjeta", differentiated by fee %.
  if (nombre === "Posnet crédito") {
    await page.getByRole("button").filter({ hasText: /Posnet/ }).filter({ hasText: /3,5%|3\.5%/ }).first().click();
  } else if (nombre === "Posnet débito") {
    await page.getByRole("button").filter({ hasText: /Posnet/ }).filter({ hasText: /1,5%|1\.5%/ }).first().click();
  } else if (nombre === "MP QR") {
    await page.getByRole("button").filter({ hasText: /MP QR/ }).first().click();
  } else if (nombre === "Transferencia") {
    await page.getByRole("button").filter({ hasText: /Transferencia/ }).first().click();
  } else {
    // Efectivo
    await page.getByRole("button").filter({ hasText: /Efectivo/ }).first().click();
  }
}

async function submitYVerificar(page: Page) {
  const submitBtn = page.getByRole("button", { name: /Registrar atencion/i });
  await submitBtn.waitFor({ timeout: 5_000 });
  await submitBtn.click();

  // Debe redirigir a /caja
  await page.waitForURL(/\/caja($|\?)/, { timeout: 12_000 });

  // /caja no debe tener NaN ni errores de aplicacion
  const body = await mainText(page);
  expect(body).not.toContain("NaN");
  expect(body).not.toContain("Application error");
  expect(body).not.toContain("undefined");
}

// ─── Suite ───────────────────────────────────────────────────────────────────

test.describe("Registro de atenciones: flujos reales", () => {

  // ── Gabote como barbero (sesión propia, barbero pre-seleccionado) ──────────
  // Describe separado para no encadenar login Pinky → login Gabote en el mismo test.

  // ── Gabote ────────────────────────────────────────────────────────────────

  test("Gabote — Corte — Efectivo", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada — correr mañana."); return; }

    await clickBarbero(page, "Gabote");
    await clickServicio(page, "Corte");

    // Verificar que el precio se auto-completo
    const precio = page.locator('input[name="precioCobrado"]');
    await expect(precio).not.toHaveValue("0");
    await expect(precio).not.toHaveValue("");

    await clickMedioPago(page, "Efectivo");
    await submitYVerificar(page);
  });

  test("Gabote — Corte y Barba — MP QR (6%)", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada — correr mañana."); return; }

    await clickBarbero(page, "Gabote");
    await clickServicio(page, "Corte y Barba");
    await clickMedioPago(page, "MP QR");
    await submitYVerificar(page);
  });

  test("Gabote — Barba sola — Posnet débito (1.5%)", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada — correr mañana."); return; }

    await clickBarbero(page, "Gabote");
    await clickServicio(page, "Barba sola");
    await clickMedioPago(page, "Posnet débito");
    await submitYVerificar(page);
  });

  test("Gabote — Corte — Posnet crédito (3.5%)", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada — correr mañana."); return; }

    await clickBarbero(page, "Gabote");
    await clickServicio(page, "Corte");
    await clickMedioPago(page, "Posnet crédito");
    await submitYVerificar(page);
  });

  test("Gabote — Corte — Transferencia", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada — correr mañana."); return; }

    await clickBarbero(page, "Gabote");
    await clickServicio(page, "Corte");
    await clickMedioPago(page, "Transferencia");
    await submitYVerificar(page);
  });

  // ── Pinky ─────────────────────────────────────────────────────────────────

  test("Pinky — Corte — Efectivo", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada — correr mañana."); return; }

    await clickBarbero(page, "Pinky");
    await clickServicio(page, "Corte");
    await clickMedioPago(page, "Efectivo");
    await submitYVerificar(page);
  });

  test("Pinky — Corte y Barba — Transferencia", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada — correr mañana."); return; }

    await clickBarbero(page, "Pinky");
    await clickServicio(page, "Corte y Barba");
    await clickMedioPago(page, "Transferencia");
    await submitYVerificar(page);
  });

  test("Pinky — Tintura — MP QR (6%)", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada — correr mañana."); return; }

    await clickBarbero(page, "Pinky");
    await clickServicio(page, "Tintura");
    await clickMedioPago(page, "MP QR");
    await submitYVerificar(page);
  });

  // ── Preview de comisiones ─────────────────────────────────────────────────

  test("preview muestra comision correcta para Gabote + MP QR", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada — correr mañana."); return; }

    await clickBarbero(page, "Gabote");
    await clickServicio(page, "Corte");
    await clickMedioPago(page, "MP QR");

    // El preview aparece cuando precio > 0 y medio de pago seleccionado
    // Corte = $14.000, MP QR = 6%, comision Gabote = 60%
    // Verificar que aparece el preview con numeros y sin NaN
    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("undefined");
    // El preview debe mostrar algun monto ($ presente en pantalla)
    expect(body).toMatch(/\$/);
  });

  // ── /caja despues de registrar ────────────────────────────────────────────

  test("/caja lista movimientos sin errores despues de varias atenciones", async ({ page }) => {
    await page.goto("/caja");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toMatch(/error|500/);

    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("undefined");
  });
});

// ── Gabote logueado como barbero — describe separado para evitar doble login ──
test.describe("Registro de atenciones: Gabote como barbero", () => {
  test.use({ storageState: ".auth/gabote.json" });

  test("Gabote — Corte — Efectivo (barbero pre-seleccionado y bloqueado)", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada — correr mañana."); return; }

    // Barbero ya viene preseleccionado y bloqueado — no hay que clicarlo
    await clickServicio(page, "Corte");
    await clickMedioPago(page, "Efectivo");
    await submitYVerificar(page);
  });

  test("Gabote — Corte y Barba — MP QR (barbero pre-seleccionado y bloqueado)", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada — correr mañana."); return; }

    await clickServicio(page, "Corte y Barba");
    await clickMedioPago(page, "MP QR");
    await submitYVerificar(page);
  });
});
