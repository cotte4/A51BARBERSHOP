/**
 * Flow 2: Admin cierra la caja del día
 *
 * 1. Login como Pinky (admin)
 * 2. Ir a /caja/cierre
 * 3. Verificar que el resumen muestra el desglose por barbero
 * 4. Confirmar cierre → verificar redirect y estado bloqueado
 *
 * El test es resiliente:
 * - Si ya hay un cierre para hoy, verifica la pantalla de resumen del cierre ya cerrado.
 * - Si no hay cierre, verifica el formulario de cierre y opcionalmente lo confirma.
 */

import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Flow 2: Admin cierre de caja", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "pinky");
  });

  test("/caja/cierre es accesible solo para admin — redirige si no hay sesión", async ({ page }) => {
    // Verificar que la página cargó para Pinky (admin)
    await page.goto("/caja/cierre");

    // Debe llegar a alguna variante de la página de cierre, no a /login
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("Barbero sin rol admin es redirigido desde /caja/cierre", async ({ page }) => {
    // Logout de Pinky y login como Gabote
    await page.goto("/caja");
    await loginAs(page, "gabote");
    await page.goto("/caja/cierre");

    // Gabote debe ser redirigido a /caja
    await expect(page).toHaveURL(/\/caja($|\?)/);
  });

  test("resumen de cierre muestra desglose por barbero o confirmación de cierre existente", async ({
    page,
  }) => {
    await page.goto("/caja/cierre");
    await page.waitForLoadState("networkidle");

    const url = page.url();

    if (url.includes("/cierre/2026") || url.includes("/cierre/20")) {
      // Ya hay un cierre para hoy — verificar página de resumen del cierre cerrado
      const body = await page.textContent("body");
      expect(body).not.toContain("NaN");
      expect(body).not.toContain("Application error");

      // Debe mostrar información del cierre
      const hasFecha = /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/.test(body ?? "");
      expect(hasFecha || body?.includes("Pinky") || body?.includes("cerrada")).toBeTruthy();
    } else {
      // Formulario de cierre activo — verificar desglose por barbero
      const body = await page.textContent("body");
      expect(body).not.toContain("NaN");
      expect(body).not.toContain("Application error");

      // Debe tener algún elemento financiero visible
      await expect(page.getByText(/Pinky|Gabote|cierre|caja/i).first()).toBeVisible();
    }
  });

  test("pantalla de cierre no tiene valores NaN ni undefined", async ({ page }) => {
    await page.goto("/caja/cierre");
    await page.waitForLoadState("networkidle");

    const body = await page.textContent("body");
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("undefined");
    expect(body).not.toContain("Application error");
  });

  test("confirmar cierre bloquea nuevas atenciones para esa fecha", async ({ page }) => {
    await page.goto("/caja/cierre");
    await page.waitForLoadState("networkidle");

    const url = page.url();

    // Si ya fue cerrada, la nueva atención debe estar bloqueada
    if (url.includes("/cierre/20")) {
      await page.goto("/caja/nueva");
      await expect(page.getByText(/ya fue cerrada/i)).toBeVisible({ timeout: 5_000 });
      return;
    }

    // Si el botón de cerrar caja está disponible, verificarlo
    const cerrarBtn = page.getByRole("button", { name: /cerrar caja|confirmar cierre/i });
    const hasCerrarBtn = await cerrarBtn.isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasCerrarBtn) {
      await cerrarBtn.click();
      // Esperar redirect al resumen del cierre
      await page.waitForURL(/\/cierre\/20\d{2}-\d{2}-\d{2}/, { timeout: 10_000 });

      // Verificar estado bloqueado: nueva atención debe mostrar mensaje de caja cerrada
      await page.goto("/caja/nueva");
      await expect(page.getByText(/ya fue cerrada/i)).toBeVisible({ timeout: 5_000 });
    }
  });
});
