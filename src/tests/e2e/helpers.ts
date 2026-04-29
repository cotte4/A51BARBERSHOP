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
  // Clear any existing session so switching users works correctly.
  await page.context().clearCookies();

  await page.goto(loginPath);
  // Wait for hydration — client component inputs won't respond before it.
  await page.waitForSelector("#email", { timeout: 15_000 });

  await page.fill("#email", CREDENTIALS[role].email);
  await page.fill("#password", CREDENTIALS[role].password);
  await page.click('button[type="submit"]');

  // After login the app redirects to /hoy (any logged-in user).
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 20_000,
  });
}

export async function loginAsMarcianoUser(
  page: Page,
  email = CREDENTIALS.pinky.email,
  password = CREDENTIALS.pinky.password
) {
  await page.context().clearCookies();
  await page.goto("/marciano/login");
  await page.waitForSelector("#email", { timeout: 15_000 });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 20_000,
  });
}

/** Safely get visible text from <main> only — avoids Next.js __NEXT_DATA__ script blobs. */
export async function mainText(page: Page): Promise<string> {
  const el = page.locator("main").first();
  return (await el.textContent()) ?? "";
}

export function isNumericText(text: string): boolean {
  return /[\d$]/.test(text) && !text.includes("NaN") && !text.includes("undefined");
}
