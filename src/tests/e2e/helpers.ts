import type { Page } from "@playwright/test";

export const CREDENTIALS = {
  pinky: { email: "pinky@a51barber.com", password: "pinky1234" },
  gabote: { email: "gabote@a51barber.com", password: "gabote1234" },
};

export async function loginAs(
  page: Page,
  role: keyof typeof CREDENTIALS,
  loginPath = "/login"
) {
  await page.goto(loginPath);
  await page.getByLabel(/email/i).fill(CREDENTIALS[role].email);
  await page.getByLabel(/contrase/i).fill(CREDENTIALS[role].password);
  await page.getByRole("button", { name: /entrar|ingresar|acceder|iniciar/i }).click();
  // Wait for redirect away from login
  await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 10_000 });
}

export async function loginAsMarcianoUser(page: Page) {
  await page.goto("/marciano/login");
  await page.getByLabel(/email/i).fill(CREDENTIALS.pinky.email);
  await page.getByLabel(/contrase/i).fill(CREDENTIALS.pinky.password);
  await page.getByRole("button", { name: /entrar|ingresar|acceder|iniciar/i }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/marciano"), { timeout: 10_000 });
}

export function isNumericText(text: string): boolean {
  // Accepts Argentine formatted numbers like "$13.000" or "13.000,00" or "0"
  return /[\d$]/.test(text) && !text.includes("NaN") && !text.includes("undefined");
}
