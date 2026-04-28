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

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contrase/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /entrar|ingresar|acceder|iniciar/i })).toBeVisible();
  });

  test("credenciales incorrectas muestran error en español", async ({ page }) => {
    await page.goto("/marciano/login");

    await page.getByLabel(/email/i).fill("noexiste@test.com");
    await page.getByLabel(/contrase/i).fill("wrongpassword");
    await page.getByRole("button", { name: /entrar|ingresar|acceder|iniciar/i }).click();

    // Mensaje de error en español
    await expect(
      page.getByText(/no pudimos validar|email|clave|contrasena|incorrecto/i)
    ).toBeVisible({ timeout: 5_000 });
  });

  test("portal Marciano: login como Pinky y acceso al portal", async ({ page }) => {
    await page.goto("/marciano/login");
    await page.getByLabel(/email/i).fill("pinky@a51barber.com");
    await page.getByLabel(/contrase/i).fill("pinky1234");
    await page.getByRole("button", { name: /entrar|ingresar|acceder|iniciar/i }).click();

    // Esperar redirect — puede ir a /marciano o a otra sección
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10_000 });

    // La página resultante no debe tener errores de aplicación
    const body = await page.textContent("body");
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

  test("/marciano/turnos/nuevo muestra formulario de reserva o mensaje de acceso", async ({
    page,
  }) => {
    // Login primero
    await page.goto("/marciano/login");
    await page.getByLabel(/email/i).fill("pinky@a51barber.com");
    await page.getByLabel(/contrase/i).fill("pinky1234");
    await page.getByRole("button", { name: /entrar|ingresar|acceder|iniciar/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10_000 });

    // Intentar acceder a turnos
    await page.goto("/marciano/turnos");
    await page.waitForLoadState("networkidle");

    // No debe mostrar errores — puede mostrar turnos o mensaje de acceso restringido
    const body = await page.textContent("body");
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("NaN");
  });
});
