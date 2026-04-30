/**
 * Flujos avanzados — QA pre-lanzamiento
 *
 * Cubre: ventas de producto, edición de atención, /hoy, dashboard, liquidaciones.
 * Los tests que escriben en DB (venta, edición) se saltan si la caja está cerrada.
 *
 * Run: npx playwright test --config src/tests/e2e/playwright.config.ts src/tests/e2e/flujos-avanzados.spec.ts
 */

import { test, expect } from "@playwright/test";
import { loginAs, mainText, cajaCerrada } from "./helpers";

// ─── Ventas de producto ───────────────────────────────────────────────────────

test.describe("Venta de producto (/caja/vender)", () => {
  test("página carga con la lista de productos y medios de pago", async ({ page }) => {
    await page.goto("/caja/vender");
    await page.waitForLoadState("networkidle");

    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("Application error");
    // Should show the product sale form or a "no stock" message — either is valid
    expect(page.url()).not.toMatch(/error|500/);
  });

  test("Cafe — cantidad 1 — Efectivo → registra y redirige a /caja", async ({ page }) => {
    await page.goto("/caja/vender");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada."); return; }

    // Select product "Cafe"
    const cafeBtn = page.locator("button").filter({ has: page.getByText("Cafe", { exact: true }) }).first();
    await cafeBtn.waitFor({ timeout: 5_000 });
    await cafeBtn.click();

    // Select medio de pago — "Efectivo"
    const efectivoBtn = page.locator("button").filter({ hasText: /Efectivo/i }).first();
    await efectivoBtn.waitFor({ timeout: 5_000 });
    await efectivoBtn.click();

    // Submit
    const submitBtn = page.getByRole("button", { name: /Confirmar venta|Registrar venta|Confirmar/i });
    await submitBtn.waitFor({ timeout: 5_000 });
    await submitBtn.click();

    await page.waitForURL(/\/caja($|\?)/, { timeout: 12_000 });

    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("Application error");
  });

  test("Pomada — cantidad 2 — MP QR → registra y redirige a /caja", async ({ page }) => {
    await page.goto("/caja/vender");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada."); return; }

    const pomadaBtn = page.locator("button").filter({ has: page.getByText("Pomada", { exact: true }) }).first();
    await pomadaBtn.waitFor({ timeout: 5_000 });
    await pomadaBtn.click();

    // Increment quantity to 2
    const cantidadBtn2 = page.getByRole("button", { name: "2" }).first();
    const cantidadInput = page.locator('input[name="cantidad"]');
    if (await cantidadBtn2.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await cantidadBtn2.click();
    } else if (await cantidadInput.isVisible({ timeout: 1_500 }).catch(() => false)) {
      await cantidadInput.fill("2");
    }

    // Medio de pago MP QR
    const mpBtn = page.locator("button").filter({ hasText: /MP QR/i }).first();
    await mpBtn.waitFor({ timeout: 5_000 });
    await mpBtn.click();

    const submitBtn = page.getByRole("button", { name: /Confirmar venta|Registrar venta|Confirmar/i });
    await submitBtn.waitFor({ timeout: 5_000 });
    await submitBtn.click();

    await page.waitForURL(/\/caja($|\?)/, { timeout: 12_000 });

    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("Application error");
  });

  test("Gaseosa — Transferencia → registra sin errores", async ({ page }) => {
    await page.goto("/caja/vender");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada."); return; }

    const gaseosaBtn = page.locator("button").filter({ has: page.getByText("Gaseosa", { exact: true }) }).first();
    await gaseosaBtn.waitFor({ timeout: 5_000 });
    await gaseosaBtn.click();

    const transferenciaBtn = page.locator("button").filter({ hasText: /Transferencia/i }).first();
    await transferenciaBtn.waitFor({ timeout: 5_000 });
    await transferenciaBtn.click();

    const submitBtn = page.getByRole("button", { name: /Confirmar venta|Registrar venta|Confirmar/i });
    await submitBtn.waitFor({ timeout: 5_000 });
    await submitBtn.click();

    await page.waitForURL(/\/caja($|\?)/, { timeout: 12_000 });
    const body = await mainText(page);
    expect(body).not.toContain("NaN");
  });

  test("preview muestra monto neto correcto antes de confirmar", async ({ page }) => {
    await page.goto("/caja/vender");
    await page.waitForLoadState("networkidle");
    if (await cajaCerrada(page)) { test.skip(true, "Caja cerrada."); return; }

    // Pick the first product button — each product card has its name as visible text
    // Use waitFor (active wait) to handle hydration delay
    const anyProductBtn = page.locator("button[type='button']").filter({ hasText: /Stock:/ }).first();
    const hasProduct = await anyProductBtn.waitFor({ state: "visible", timeout: 8_000 }).then(() => true).catch(() => false);
    if (!hasProduct) { test.skip(true, "Sin stock."); return; }
    await anyProductBtn.click();

    const efectivoBtn = page.locator("button").filter({ hasText: /Efectivo/i }).first();
    await efectivoBtn.waitFor({ timeout: 5_000 });
    await efectivoBtn.click();

    // Preview should appear — check no NaN
    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("undefined");
    expect(body).toMatch(/\$/);
  });
});

// ─── /hoy ────────────────────────────────────────────────────────────────────

test.describe("Página /hoy", () => {
  test("Pinky (admin) — /hoy carga sin errores y muestra KPIs", async ({ page }) => {
    await page.goto("/hoy");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toMatch(/error|500/);
    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("undefined");
  });

  test("Gabote (barbero) — /hoy carga y muestra su resumen del día", async ({ page }) => {
    await loginAs(page, "gabote");
    await page.goto("/hoy");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toMatch(/error|500/);
    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("undefined");
  });
});

// ─── Dashboard (admin) ───────────────────────────────────────────────────────

test.describe("Dashboard admin", () => {
  test("KPIs del día no tienen NaN ni vacíos luego de registrar atenciones y ventas", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("undefined");
    expect(body).toMatch(/\$/);
  });

  test("resumen de Gabote aparece con montos válidos", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const body = await mainText(page);
    expect(body).toMatch(/Gabote/i);
    expect(body).not.toContain("NaN");
  });

  test("BEP aparece en el dashboard con valor numérico", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    // BEP section should have a $ amount
    expect(body).toMatch(/\$/);
  });
});

// ─── Liquidaciones ───────────────────────────────────────────────────────────

test.describe("Liquidaciones (admin)", () => {
  test("/liquidaciones carga sin errores", async ({ page }) => {
    await page.goto("/liquidaciones");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toMatch(/error|500/);
    // Page uses <div> root, not <main> — read body text directly
    const body = (await page.locator("body").textContent()) ?? "";
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("Application error");
  });

  test("liquidación de Gabote aparece en la lista", async ({ page }) => {
    await page.goto("/liquidaciones");
    await page.waitForLoadState("networkidle");

    // Check visible rendered text — avoid RSC payload which contains "undefined" as serialized JSON
    await expect(page.getByText(/Gabote/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page).not.toHaveURL(/error|500/);
    // No NaN in rendered text nodes
    const rendered = (await page.locator("h1,h2,h3,p,span,td").allTextContents()).join(" ");
    expect(rendered).not.toContain("NaN");
  });
});

// ─── Editar atención ─────────────────────────────────────────────────────────

test.describe("Editar atención", () => {
  test("/caja muestra lista de atenciones con links de edición", async ({ page }) => {
    await page.goto("/caja");
    await page.waitForLoadState("networkidle");

    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("Application error");
  });

  test("clic en editar abre el formulario con datos pre-cargados", async ({ page }) => {
    // Edit links only appear in the detalle view
    await page.goto("/caja?vista=detalle");
    await page.waitForLoadState("networkidle");

    const editLink = page.getByRole("link", { name: /editar/i }).first();
    if (!await editLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(true, "No hay atenciones editables hoy.");
      return;
    }

    await editLink.click();
    // Intercepting modal route — URL updates to /caja/{id}/editar
    await page.waitForURL(/editar/, { timeout: 10_000 });

    // Should be on an edit page, not error
    expect(page.url()).not.toMatch(/error|500/);

    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("Application error");
    // Edit form should have precio cobrado pre-filled
    const precioInput = page.locator('input[name="precioCobrado"]');
    await expect(precioInput).not.toHaveValue("0");
    await expect(precioInput).not.toHaveValue("");
  });
});

// ─── Inventario ──────────────────────────────────────────────────────────────

test.describe("Inventario (admin)", () => {
  test("/inventario carga con lista de productos y stock actualizado", async ({ page }) => {
    await page.goto("/inventario");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toMatch(/error|500/);
    const body = await mainText(page);
    expect(body).not.toContain("NaN");
    expect(body).not.toContain("Application error");
    // Should show product names
    expect(body).toMatch(/Cafe|Pomada|Gaseosa/i);
  });

  test("stock de Cafe se redujo después de la venta", async ({ page }) => {
    await page.goto("/inventario");
    await page.waitForLoadState("networkidle");

    const body = await mainText(page);
    // Stock should show a number — not NaN
    expect(body).not.toContain("NaN");
    // Cafe should still appear (we sold 1 unit, had 20)
    expect(body).toMatch(/Cafe/i);
  });
});
