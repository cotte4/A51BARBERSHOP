import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

let db: typeof import("../src/db").db;
let auth: typeof import("../src/lib/auth").auth;
let spinRuletaForClient: typeof import("../src/lib/ovnis-ruleta").spinRuletaForClient;

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const email = `ovnis-smoke-${Date.now()}@example.invalid`;
const password = "Smoke1234";
const clientId = randomUUID();

async function rows<T = Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<T[]> {
  const result = await db.execute(query);
  return result.rows as T[];
}

async function cleanup() {
  const userRows = await rows<{ id: string }>(sql`select id from "user" where email = ${email}`);
  const userIds = userRows.map((row) => row.id);
  const clientRows = await rows<{ id: string }>(sql`select id from clients where email = ${email} or id = ${clientId}`);
  const clientIds = clientRows.map((row) => row.id);

  for (const id of clientIds) {
    await db.execute(sql`delete from ovnis_ruleta_spins where client_id = ${id}`);
    await db.execute(sql`delete from ovnis_transactions where client_id = ${id} or related_client_id = ${id}`);
    await db.execute(sql`delete from ovnis_redemptions where client_id = ${id}`);
    await db.execute(sql`delete from ovnis_bets where challenger_id = ${id} or opponent_id = ${id}`);
    await db.execute(sql`delete from ovnis_balance where client_id = ${id}`);
  }

  await db.execute(sql`delete from clients where email = ${email} or id = ${clientId}`);

  for (const id of userIds) {
    await db.execute(sql`delete from session where user_id = ${id}`);
    await db.execute(sql`delete from account where user_id = ${id}`);
  }

  await db.execute(sql`delete from "user" where email = ${email}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function pass(message: string) {
  console.log(`OK ${message}`);
}

function getCookieHeader(response: Response): string {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookie = headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
  const cookiePairs: string[] = [];

  for (const header of setCookie) {
    for (const part of header.split(/,(?=(?:__Secure-)?better-auth\.)/)) {
      const cookie = part.split(";")[0]?.trim();
      if (cookie) cookiePairs.push(cookie);
    }
  }

  return cookiePairs.join("; ");
}

async function fetchText(path: string, cookie: string) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { cookie },
    redirect: "manual",
  });
  const text = await response.text();
  return { response, text };
}

async function assertPage(path: string, cookie: string, expectedPattern: RegExp) {
  const { response, text } = await fetchText(path, cookie);
  assert(response.status === 200, `${path} expected 200, got ${response.status}`);
  assert(!text.includes("data-nextjs-dialog"), `${path} rendered a Next error overlay`);
  assert(!text.includes("Application error"), `${path} rendered an application error`);
  assert(!text.includes("NEXT_REDIRECT"), `${path} unexpectedly redirected in the RSC payload`);
  assert(expectedPattern.test(text), `${path} did not include expected content`);
  pass(`${path} renders authenticated content`);
}

async function main() {
  ({ db } = await import("../src/db"));
  ({ auth } = await import("../src/lib/auth"));
  ({ spinRuletaForClient } = await import("../src/lib/ovnis-ruleta"));

  await cleanup();

  const [admin] = await rows<{ id: string }>(sql`select id from "user" where email = 'pinky@a51barber.com' limit 1`);
  assert(admin?.id, "Missing Pinky admin user for test client ownership");

  const created = await auth.api.createUser({
    body: {
      email,
      password,
      name: "OVNIS Smoke Marciano",
      role: "marciano",
    },
  });

  await db.execute(sql`
    insert into clients (id, name, email, phone_normalized, es_marciano, marciano_desde, created_by_user_id, user_id)
    values (
      ${clientId},
      'OVNIS Smoke Marciano',
      ${email},
      ${`+549${clientId.replaceAll("-", "").slice(0, 10)}`},
      true,
      now(),
      ${admin.id},
      ${created.user.id}
    )
  `);

  const signIn = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: baseUrl,
      "user-agent": "OVNIS smoke test",
    },
    body: JSON.stringify({ email, password }),
  });
  assert(signIn.ok, `sign-in failed with ${signIn.status}`);
  const cookie = getCookieHeader(signIn);
  assert(cookie.includes("better-auth.session_token"), "sign-in did not return a session cookie");
  pass("Marciano smoke user can sign in");

  const session = await fetch(`${baseUrl}/api/auth/get-session`, {
    headers: { cookie, origin: baseUrl, "user-agent": "OVNIS smoke test" },
  });
  const sessionText = await session.text();
  assert(sessionText.includes(email), "get-session did not return the smoke Marciano session");
  pass("Marciano session is valid");

  await assertPage("/marciano", cookie, /OVNIS Smoke Marciano|Portal|Marciano/i);
  await assertPage("/marciano/ovnis", cookie, /OVNIS|Historial|Canjear|Donar/i);
  await assertPage("/marciano/ovnis/canjear", cookie, /Consumicion|Descuento|Corte|Canjear/i);
  await assertPage("/marciano/ovnis/donar", cookie, /Donar|Marciano|OVNIS/i);
  await assertPage("/marciano/juegos", cookie, /Subasta|Trucong|Ternas|Apuesta|Juegos/i);
  await assertPage("/marciano/ruleta", cookie, /Ruleta|GIRAR|OVNIS/i);

  const spin = await spinRuletaForClient(clientId);
  assert(spin.success, `ruleta spin failed: ${JSON.stringify(spin)}`);
  pass(`Ruleta spin succeeds with prize: ${spin.prize.label}`);

  await assertPage("/marciano/ruleta", cookie, /Ya giraste|Premio|OVNIS|Suerte/i);
}

main()
  .then(async () => {
    await cleanup();
    pass("HTTP smoke cleanup removed temp Marciano");
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await cleanup();
    process.exit(1);
  });
