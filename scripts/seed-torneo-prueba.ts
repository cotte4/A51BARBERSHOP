// Deja un torneo de ensayo listo para revisar a mano: 16 pagados + 3 en lista de espera, sin sorteo.
//   npx tsx --conditions=react-server scripts/seed-torneo-prueba.ts
// Se borra desde /torneo-admin ("Borrar torneo de prueba"). Aborta si ya existe algún torneo.
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const NOMBRES = [
  "Juan Pérez", "Juan Paz", "Lucas Gómez", "Mateo Ruiz", "Tomás Silva", "Franco Díaz",
  "Nicolás Torres", "Agustín Flores", "Bruno Acosta", "Santiago Romero", "Joaquín Herrera",
  "Ezequiel Medina", "Facundo Sosa", "Lautaro Vega", "Thiago Ríos", "Gonzalo Peña",
  "Valentín Cruz", "Emiliano Luna", "Ramiro Castro",
];

async function main() {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("@/db");
  const { torneos, torneoJugadores } = await import("@/db/schema");
  const datos = await import("@/lib/torneo-data");

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(torneos);
  if (n > 0) throw new Error(`Ya hay ${n} torneo(s): no creo el de prueba.`);

  const torneo = await datos.asegurarTorneo();
  await datos.actualizarConfig(torneo.id, {
    nombre: "Prueba · Torneo FIFA A51",
    fechaLocal: null,
    premiosTexto: "Premios de prueba: trofeo y una consumición",
  });

  const ahora = Date.now();
  await db.insert(torneoJugadores).values(
    NOMBRES.map((nombre, i) => ({
      torneoId: torneo.id,
      clientId: null,
      nombre,
      email: `prueba-${i + 1}@example.invalid`,
      whatsapp: `223 000 ${String(1000 + i)}`,
      consentimiento: true,
      estadoPago: i < 16 ? ("pagado" as const) : ("pendiente" as const),
      pagadoEn: i < 16 ? new Date(ahora) : null,
      ordenPago: i < 16 ? i + 1 : null,
      createdAt: new Date(ahora - (NOMBRES.length - i) * 60_000),
    })),
  );
  console.log(`Torneo de prueba creado: ${NOMBRES.length} anotados (16 pagados, 3 en espera).`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
