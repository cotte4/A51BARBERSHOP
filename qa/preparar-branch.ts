// Prepara el branch de Neon "qa-agentes" para que los agentes-persona usen la app sin tocar prod:
// - corta la conexión a Spotify (los tokens copiados de prod manejarían el Spotify real del local),
// - borra las sesiones copiadas,
// - deja una clave de prueba (QA_PASSWORD de .env.qa.local) en Pinky y en la reserva pública de Pinky,
// - crea un barbero, un Marciano y un turno de prueba (todo con "QA" en el nombre).
// Uso: npx tsx --conditions=react-server qa/preparar-branch.ts
import { randomBytes } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import dotenv from "dotenv";

// Endpoint de la base de producción: si DATABASE_URL apunta acá, no se corre nada.
const PROD_ENDPOINT = "ep-cold-darkness-ac2v9rww";
const ENV_QA = ".env.qa.local";

dotenv.config({ path: ENV_QA, override: true });
dotenv.config({ path: ".env.local" }); // solo completa lo que falte (BETTER_AUTH_SECRET, etc.)

const url = process.env.DATABASE_URL ?? "";
if (!url || url.includes(PROD_ENDPOINT)) {
  throw new Error("Frenado: DATABASE_URL no es el branch de QA.");
}

if (!process.env.QA_PASSWORD) {
  const password = `qa-${randomBytes(9).toString("base64url")}`;
  const actual = readFileSync(ENV_QA, "utf8");
  appendFileSync(ENV_QA, `${actual.endsWith("\n") ? "" : "\n"}QA_PASSWORD=${password}\n`);
  process.env.QA_PASSWORD = password;
}
const QA_PASSWORD = process.env.QA_PASSWORD;

async function main() {
  const { eq, and } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const { auth } = await import("../src/lib/auth");
  const { hashPublicReservaPassword } = await import("../src/lib/public-reserva-access");

  await db
    .update(schema.musicProviderConnections)
    .set({ accessToken: null, refreshToken: null, status: "disconnected", accountName: null });
  await db.delete(schema.session);
  console.log("✓ Spotify desconectado y sesiones borradas");

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(QA_PASSWORD);

  const pinky = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, "pinky@a51barber.com") });
  if (!pinky) throw new Error("No está Pinky en el branch");
  await db
    .update(schema.account)
    .set({ password: hash })
    .where(and(eq(schema.account.userId, pinky.id), eq(schema.account.providerId, "credential")));
  await db
    .update(schema.barberos)
    .set({ publicReservaPasswordHash: hashPublicReservaPassword(QA_PASSWORD) })
    .where(eq(schema.barberos.publicSlug, "pinky"));
  console.log("✓ Clave de prueba en Pinky y en /reservar/pinky");

  async function usuario(email: string, name: string, role: "barbero" | "marciano") {
    const existente = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, email) });
    if (existente) return existente.id;
    const creado = await auth.api.createUser({ body: { email, password: QA_PASSWORD, name, role } });
    return creado.user.id;
  }

  const barberoUserId = await usuario("qa-barbero@a51.test", "Nico QA", "barbero");
  let barbero = await db.query.barberos.findFirst({ where: (b, { eq }) => eq(b.userId, barberoUserId) });
  if (!barbero) {
    [barbero] = await db
      .insert(schema.barberos)
      .values({
        nombre: "Nico QA",
        rol: "barbero",
        tipoModelo: "variable",
        porcentajeComision: "50.00",
        activo: true,
        userId: barberoUserId,
      })
      .returning();
  }
  console.log("✓ Barbero de prueba: qa-barbero@a51.test");

  const marcianoUserId = await usuario("qa-marciano@a51.test", "Tomás QA", "marciano");
  let cliente = await db.query.clients.findFirst({ where: (c, { eq }) => eq(c.userId, marcianoUserId) });
  if (!cliente) {
    [cliente] = await db
      .insert(schema.clients)
      .values({
        name: "Tomás QA",
        email: "qa-marciano@a51.test",
        phoneRaw: "11 5555-0151",
        phoneNormalized: "5491155550151",
        esMarciano: true,
        marcianoDesde: new Date(),
        createdByUserId: pinky.id,
        userId: marcianoUserId,
      })
      .returning();
  }

  const pinkyBarbero = await db.query.barberos.findFirst({ where: (b, { eq }) => eq(b.publicSlug, "pinky") });
  const corte = await db.query.servicios.findFirst({ where: (s, { eq }) => eq(s.nombre, "Corte") });
  const turnoExistente = await db.query.turnos.findFirst({ where: (t, { eq }) => eq(t.clientId, cliente.id) });
  if (pinkyBarbero && corte && !turnoExistente) {
    // Pasado mañana a las 11, fecha de Argentina.
    const enDosDias = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const fecha = enDosDias.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
    await db.insert(schema.turnos).values({
      barberoId: pinkyBarbero.id,
      clienteNombre: cliente.name,
      clienteTelefonoRaw: cliente.phoneRaw,
      clienteTelefonoNormalizado: cliente.phoneNormalized,
      clientId: cliente.id,
      fecha,
      horaInicio: "11:00",
      duracionMinutos: 30,
      servicioId: corte.id,
      precioEsperado: corte.precioBase,
      estado: "confirmado",
      esMarcianoSnapshot: true,
      prioridadAbsoluta: true,
    });
  }
  console.log("✓ Marciano de prueba con turno: qa-marciano@a51.test");
  console.log(`  (barbero de prueba id ${barbero.id})`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
