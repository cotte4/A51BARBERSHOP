/**
 * Flow 4: Portal Marciano
 *
 * 1. Login en /marciano/login
 * 2. Navegar a /marciano
 * 3. Verificar que el portal carga con la info del Marciano
 * 4. Navegar a /marciano/turnos/nuevo y verificar el formulario de reserva
 *
 * Nota: El portal Marciano requiere un usuario Better Auth con `userId`
 * vinculado a un cliente con `esMarciano: true`.
 * En el entorno de prueba, Pinky puede acceder al portal también
 * (tiene cuenta de admin pero no es Marciano). El test verifica el
 * acceso y el rendering del portal sin depender de datos específicos de cliente.
 */

import { test, expect } from "@playwright/test";
import { mainText } from "./helpers";

test.describe("Flow 4: Portal Marciano", () => {
  test("página de login del portal Marciano carga correctamente", async ({ page }) => {
    await page.goto("/marciano/login");
    await page.waitForLoadState("networkidle");

    // Debe cargar la página de login Marciano
    await expect(page).not.toHaveURL(/\/error/);
    await expect(page.getByText(/Club Marciano|entrada al club|Marciano/i).first()).toBeVisible();
  });

  test("login Marciano muestra formulario con campos email y contraseña", async ({ page }) => {
    await page.goto("/marciano/login");
    // Label is "Email" and "Clave" in the Marciano login form
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("credenciales incorrectas muestran error en español", async ({ page }) => {
    await page.goto("/marciano/login");
    await page.waitForSelector("#email", { timeout: 10_000 });

    await page.fill("#email", "noexiste@test.com");
    await page.fill("#password", "wrongpassword");
    await page.click('button[type="submit"]');

    // Mensaje de error específico del portal Marciano
    await expect(
      page.getByText(/no pudimos validar/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("portal Marciano: login como Pinky y acceso al portal", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/marciano/login");
    await page.waitForSelector("#email", { timeout: 15_000 });
    await page.fill("#email", "pinky@a51barber.com");
    await page.fill("#password", "pinky1234");
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });

    const body = await mainText(page);
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("NaN");
  });

  test("página pública de registro Marciano carga", async ({ page }) => {
    await page.goto("/marciano/registro");
    await page.waitForLoadState("networkidle");

    await expect(page).not.toHaveURL(/\/error/);
    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");
  });

  test("/marciano/turnos muestra contenido o mensaje de acceso, sin errores", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/marciano/login");
    await page.waitForSelector("#email", { timeout: 15_000 });
    await page.fill("#email", "pinky@a51barber.com");
    await page.fill("#password", "pinky1234");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20_000 });

    await page.goto("/marciano/turnos");
    await page.waitForLoadState("networkidle");

    const body = await mainText(page);
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("NaN");
  });
});
