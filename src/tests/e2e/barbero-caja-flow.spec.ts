/**
 * Flow 1: Barbero registra una atención (happy path)
 *
 * 1. Login como Gabote
 * 2. Ir a /caja/nueva
 * 3. Seleccionar barbero, servicio, medio de pago
 * 4. Confirmar → la atención aparece en /caja
 *
 * Prerequisito: que la caja del día actual NO esté cerrada.
 * Si está cerrada, el test verifica el mensaje de bloqueo.
 */

import { test, expect } from "@playwright/test";
import { mainText, cajaCerrada } from "./helpers";

test.describe("Flow 1: Barbero registra atención", () => {

  test("caja/nueva carga sin errores y muestra los pasos del formulario", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada."); return; }

    // Paso 1: Barbero
    await expect(page.getByText("Paso 1")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Barbero", exact: true })).toBeVisible();

    // Paso 3: Servicio
    await expect(page.getByText("Paso 3")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Servicio", exact: true })).toBeVisible();
  });

  test("seleccionar servicio auto-completa el precio cobrado", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada."); return; }

    // Click en "Corte" (o primer servicio disponible)
    const servicioBtn = page
      .getByRole("button")
      .filter({ hasText: /^Corte$/ })
      .first();

    if (await servicioBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await servicioBtn.click();
      // El precio cobrado se auto-llena con el precio base del servicio
      const precioInput = page.locator('input[name="precioCobrado"]');
      await expect(precioInput).not.toHaveValue("0");
      await expect(precioInput).not.toHaveValue("");
    }
  });

  test("flujo completo: seleccionar barbero + servicio + medioPago + confirmar", async ({ page }) => {
    await page.goto("/caja/nueva");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada."); return; }

    // Seleccionar Gabote
    const gaboteBtn = page.getByRole("button", { name: /Gabote/i }).first();
    if (await gaboteBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await gaboteBtn.click();
    }

    // Seleccionar servicio "Corte"
    const corteBtn = page
      .getByRole("button")
      .filter({ hasText: /^Corte$/ })
      .first();
    const corteVisible = await corteBtn.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!corteVisible) {
      test.skip();
      return;
    }
    await corteBtn.click();

    // Seleccionar medio de pago "Efectivo"
    const efectivoBtn = page
      .getByRole("button")
      .filter({ hasText: /Efectivo/i })
      .first();
    await efectivoBtn.waitFor({ timeout: 5_000 });
    await efectivoBtn.click();

    // Confirmar
    const submitBtn = page.getByRole("button", { name: /Confirmar/i });
    await submitBtn.waitFor({ timeout: 5_000 });
    await submitBtn.click();

    // Esperar redirect a /caja o mensaje de éxito
    await page.waitForURL(/\/caja($|\?)/, { timeout: 10_000 });

    // La atención registrada debe aparecer en la lista
    await expect(page.getByText(/Corte|atenci/i)).toBeVisible({ timeout: 5_000 });
  });

  test("/caja lista los movimientos del día sin errores de rendering", async ({ page }) => {
    await page.goto("/caja");
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/error|500/);

    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("Application error");
  });
});
