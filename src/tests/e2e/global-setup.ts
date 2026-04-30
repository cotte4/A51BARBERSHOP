import { chromium, type FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";

const CREDENTIALS = {
  pinky: { email: "pinky@a51barber.com", password: "pinky1234" },
  gabote: { email: "gabote@a51barber.com", password: "gabote1234" },
} as const;

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:3000";
  const authDir = path.join(__dirname, ".auth");
  fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();

  for (const role of ["pinky", "gabote"] as const) {
    const { email, password } = CREDENTIALS[role];
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${baseURL}/login`);
    await page.waitForSelector("#email", { timeout: 15_000 });
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 20_000,
    });

    await context.storageState({ path: path.join(authDir, `${role}.json`) });
    await context.close();
  }

  await browser.close();
}
