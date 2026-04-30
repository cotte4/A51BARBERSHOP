import type { Page } from "@playwright/test";
import { test } from "@playwright/test";

export const CREDENTIALS = {
  pinky: { email: "pinky@a51barber.com", password: "pinky1234" },
  gabote: { email: "gabote@a51barber.com", password: "gabote1234" },
};

export async function loginAs(
  page: Page,
  role: keyof typeof CREDENTIALS,
  loginPath = "/login"
) {
  await page.context().clearCookies();
  await page.goto(loginPath);
  // Wait for hydration — client component inputs won't respond before it.
  await page.waitForSelector("#email", { timeout: 15_000 });
  await page.fill("#email", CREDENTIALS[role].email);
  await page.fill("#password", CREDENTIALS[role].password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 20_000,
  });
}

export async function cajaCerrada(page: Page): Promise<boolean> {
  return page
    .getByText(/ya fue cerrada|caja cerrada/i)
    .isVisible({ timeout: 2_500 })
    .catch(() => false);
}

/** Safely get visible text from <main> only — avoids Next.js __NEXT_DATA__ script blobs. */
export async function mainText(page: Page): Promise<string> {
  const el = page.locator("main").first();
  return (await el.textContent()) ?? "";
}

export function isNumericText(text: string): boolean {
  return /[\d$]/.test(text) && !text.includes("NaN") && !text.includes("undefined");
}
