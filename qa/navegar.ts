// Navegador de los agentes-persona. Cada persona tiene su propio Chromium con perfil persistente
// (qa/.perfiles/<persona>): la sesión sobrevive entre llamadas y dos personas nunca se pisan.
// (El MCP de Playwright es UN navegador compartido: cinco agentes a la vez se cambiarían la pestaña.)
//
// Uso: npx tsx qa/navegar.ts <persona> '<acciones JSON>'
//   personas: duena | barbero | mostrador | cliente | marciano
//   acciones (en orden), por ejemplo:
//     [{"login":true}]                         entra con la cuenta de prueba de la persona
//     [{"goto":"/caja"}]
//     [{"click":"Cobrar"}]                      botón o link por nombre visible; si no, por texto
//     [{"click":{"role":"tab","name":"Hoy"}}]
//     [{"fill":{"label":"Monto","value":"15000"}}]
//     [{"fill":{"label":"Contraseña","value":"$QA_PASSWORD"}}]   clave de prueba (ej. reserva pública)
//     [{"select":{"label":"Servicio","value":"Corte"}}]
//     [{"check":"Es Marciano"}] · [{"press":"Enter"}] · [{"wait":1500}] · [{"back":true}]
// Sin "goto", sigue en la última página de esa persona. Al final imprime la URL, el árbol de
// accesibilidad (lo que un lector de pantalla "ve"), errores de consola y de red, y guarda un
// screenshot en qa/salida/<persona>/.
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { chromium, devices, type Page } from "@playwright/test";

const BASE = "http://localhost:3000";
const RAIZ = path.join(__dirname);

type Persona = "duena" | "barbero" | "mostrador" | "cliente" | "marciano";
const PERSONAS: Record<Persona, { email?: string; login?: string; celular: boolean }> = {
  duena: { email: "pinky@a51barber.com", login: "/login", celular: false },
  barbero: { email: "qa-barbero@a51.test", login: "/login", celular: true },
  mostrador: { email: "qa-barbero@a51.test", login: "/login", celular: false },
  cliente: { celular: true },
  marciano: { email: "qa-marciano@a51.test", login: "/marciano/login", celular: true },
};

type Objetivo = string | { role: string; name: string };
type Accion =
  | { login: true }
  | { goto: string }
  | { click: Objetivo }
  | { fill: { label: string; value: string } }
  | { select: { label: string; value: string } }
  | { check: string }
  | { press: string }
  | { wait: number }
  | { back: true };

function qaPassword(): string {
  const env = readFileSync(path.join(RAIZ, "..", ".env.qa.local"), "utf8");
  const linea = env.split(/\r?\n/).find((l) => l.startsWith("QA_PASSWORD="));
  if (!linea) throw new Error("Falta QA_PASSWORD en .env.qa.local (correr qa/preparar-branch.ts)");
  return linea.slice("QA_PASSWORD=".length);
}

async function tocar(page: Page, objetivo: Objetivo) {
  if (typeof objetivo !== "string") {
    await page.getByRole(objetivo.role as Parameters<Page["getByRole"]>[0], { name: objetivo.name }).first().click();
    return;
  }
  for (const role of ["button", "link", "tab", "menuitem", "option"] as const) {
    const el = page.getByRole(role, { name: objetivo });
    if ((await el.count()) > 0 && (await el.first().isVisible())) {
      await el.first().click();
      return;
    }
  }
  await page.getByText(objetivo).first().click();
}

async function main() {
  const persona = process.argv[2] as Persona;
  if (!PERSONAS[persona]) throw new Error(`Persona desconocida: ${persona}`);
  const acciones: Accion[] = JSON.parse(process.argv[3] ?? "[]");
  const conf = PERSONAS[persona];

  const perfil = path.join(RAIZ, ".perfiles", persona);
  const salida = path.join(RAIZ, "salida", persona);
  mkdirSync(perfil, { recursive: true });
  mkdirSync(salida, { recursive: true });
  const ultimaUrl = path.join(perfil, "ultima-url.txt");

  const contexto = await chromium.launchPersistentContext(path.join(perfil, "chromium"), {
    ...(conf.celular ? devices["Pixel 7"] : { viewport: { width: 1280, height: 860 } }),
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
  });
  const page = contexto.pages()[0] ?? (await contexto.newPage());

  const errores: string[] = [];
  page.on("console", (m) => m.type() === "error" && errores.push(`consola: ${m.text().slice(0, 300)}`));
  page.on("pageerror", (e) => errores.push(`excepción: ${e.message.slice(0, 300)}`));
  page.on("response", (r) => r.status() >= 400 && errores.push(`red ${r.status()}: ${r.request().method()} ${r.url().replace(BASE, "")}`));
  page.on("dialog", async (d) => {
    errores.push(`diálogo (${d.type()}): ${d.message()} → aceptado`);
    await d.accept();
  });

  let error: string | null = null;
  try {
    if (!acciones.some((a) => "goto" in a || "login" in a)) {
      await page.goto(existsSync(ultimaUrl) ? readFileSync(ultimaUrl, "utf8") : BASE);
    }
    for (const a of acciones) {
      if ("login" in a) {
        if (!conf.email || !conf.login) throw new Error("Esta persona no tiene cuenta");
        await page.goto(BASE + conf.login);
        await page.waitForSelector("#email", { timeout: 20_000 });
        await page.fill("#email", conf.email);
        await page.fill("#password", qaPassword());
        await page.click('button[type="submit"]');
        await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 30_000 });
      } else if ("goto" in a) await page.goto(a.goto.startsWith("http") ? a.goto : BASE + a.goto);
      else if ("click" in a) await tocar(page, a.click);
      else if ("fill" in a) {
        // "$QA_PASSWORD" se reemplaza por la clave de prueba, sin que el agente la vea.
        const valor = a.fill.value === "$QA_PASSWORD" ? qaPassword() : a.fill.value;
        await page.getByLabel(a.fill.label).first().fill(valor);
      }
      else if ("select" in a) await page.getByLabel(a.select.label).first().selectOption({ label: a.select.value });
      else if ("check" in a) await page.getByLabel(a.check).first().check();
      else if ("press" in a) await page.keyboard.press(a.press);
      else if ("wait" in a) await page.waitForTimeout(a.wait);
      else if ("back" in a) await page.goBack();
      await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    }
  } catch (e) {
    error = e instanceof Error ? e.message.split("\n")[0] : String(e);
  }

  await page.waitForTimeout(400);
  const n = readdirSync(salida).filter((f) => f.endsWith(".png")).length + 1;
  const shot = path.join(salida, `${String(n).padStart(3, "0")}.png`);
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  writeFileSync(ultimaUrl, page.url());

  const arbol = await page.locator("body").ariaSnapshot().catch(() => "(sin árbol)");
  console.log(`URL: ${page.url().replace(BASE, "")}`);
  console.log(`Título: ${await page.title()}`);
  if (error) console.log(`⚠ LA ACCIÓN FALLÓ: ${error}`);
  console.log(`Screenshot: ${path.relative(path.join(RAIZ, ".."), shot)}`);
  if (errores.length) console.log(`Errores:\n  ${[...new Set(errores)].join("\n  ")}`);
  console.log("--- Pantalla (árbol de accesibilidad) ---");
  console.log(arbol.length > 14_000 ? `${arbol.slice(0, 14_000)}\n…(cortado)` : arbol);

  await contexto.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
