// Test de humo del torneo contra la base real, con limpieza garantizada.
//   npx tsx --conditions=react-server scripts/smoke-torneo.ts
// Crea un torneo de prueba (emails @example.invalid), recorre inscripción -> pago -> sorteo ->
// reveal -> resultados -> podio y BORRA todo lo que creó. Aborta si ya existe algún torneo.
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DOMINIO = "example.invalid";

function afirmar(condicion: unknown, mensaje: string): asserts condicion {
  if (!condicion) throw new Error(`FALLÓ: ${mensaje}`);
  console.log(`  ok  ${mensaje}`);
}

async function main() {
  const { like, eq, sql } = await import("drizzle-orm");
  const { db } = await import("@/db");
  const { clients, torneos, torneoJugadores } = await import("@/db/schema");
  const datos = await import("@/lib/torneo-data");
  const juego = await import("@/lib/torneo-juego");

  const [{ n: existentes }] = await db.select({ n: sql<number>`count(*)::int` }).from(torneos);
  if (existentes > 0) {
    throw new Error(`Ya hay ${existentes} torneo(s) en la base: no corro el test para no interferir.`);
  }

  let torneoId: string | null = null;
  try {
    console.log("1. Torneo y equipos");
    const torneo = await datos.asegurarTorneo();
    torneoId = torneo.id;
    afirmar((await datos.listarEquipos(torneo.id)).length === 20, "se crearon los 20 equipos placeholder");

    console.log("2. Inscripción pública");
    for (let i = 1; i <= 17; i++) {
      const r = await datos.inscribirJugador({
        nombre: `Jugador Prueba ${i}`,
        email: `torneo-smoke-${i}@${DOMINIO}`,
        whatsapp: `223 000 ${String(9000 + i)}`,
      });
      afirmar(r.ok, `jugador ${i} se anotó`);
    }
    const repetido = await datos.inscribirJugador({
      nombre: "Repetido",
      email: `torneo-smoke-1@${DOMINIO}`,
      whatsapp: "223 000 9999",
    });
    afirmar(!repetido.ok && repetido.motivo === "ya_anotado", "el mismo email no se anota dos veces");
    const creados = await db.select().from(clients).where(like(clients.email, `torneo-smoke-%@${DOMINIO}`));
    afirmar(creados.length === 17, "se crearon 17 clientes con tag torneo-fifa");
    afirmar(creados.every((c) => c.tags.includes("torneo-fifa")), "los clientes llevan el tag torneo-fifa");

    console.log("2b. Sacar a un anotado");
    const extra18 = await datos.inscribirJugador({
      nombre: "Jugador Prueba 18",
      email: `torneo-smoke-18@${DOMINIO}`,
      whatsapp: "223 000 9018",
    });
    afirmar(extra18.ok, "el jugador 18 se anotó");
    const j18 = (await datos.listarJugadores(torneo.id)).find((j) => j.email === `torneo-smoke-18@${DOMINIO}`)!;
    afirmar((await datos.marcarPago(j18.id, true)).ok, "el 18 paga");
    const noSale = await datos.eliminarJugador(j18.id);
    afirmar(!noSale.ok && noSale.motivo === "pagado", "no se saca a alguien que pagó");
    afirmar((await datos.marcarPago(j18.id, false)).ok, "se deshace el pago del 18");
    afirmar((await datos.eliminarJugador(j18.id)).ok, "se saca al 18 de la lista");
    afirmar(
      (await datos.listarJugadores(torneo.id)).length === 17,
      "quedan 17 anotados",
    );

    console.log("3. Pagos y cupo");
    const jugadores = await datos.listarJugadores(torneo.id);
    for (const j of jugadores.slice(0, 16)) {
      const r = await datos.marcarPago(j.id, true);
      afirmar(r.ok, `pagó ${j.nombre}`);
    }
    const diecisiete = await datos.marcarPago(jugadores[16].id, true);
    afirmar(!diecisiete.ok && diecisiete.motivo === "cupo_lleno", "el pagado número 17 es rechazado (cupo lleno)");
    afirmar((await datos.marcarPago(jugadores[0].id, false)).ok, "se puede deshacer un pago");
    afirmar((await datos.marcarPago(jugadores[16].id, true)).ok, "el lugar liberado lo toma el 17");
    afirmar((await datos.marcarPago(jugadores[0].id, true)).ok === false, "el 1 ya no entra (cupo lleno)");
    afirmar((await datos.marcarPago(jugadores[16].id, false)).ok, "se deshace el pago del 17");
    afirmar((await datos.marcarPago(jugadores[0].id, true)).ok, "el 1 vuelve a entrar");

    console.log("4. Sorteo");
    const sorteo = await juego.sortearYGuardar(torneo.id);
    afirmar(sorteo.ok, "el sorteo se hizo");
    const segundo = await juego.sortearYGuardar(torneo.id);
    afirmar(!segundo.ok && segundo.motivo === "ya_sorteado", "un segundo sorteo es rechazado");
    const tras = await datos.marcarPago(jugadores[16].id, true);
    afirmar(!tras.ok && tras.motivo === "cerrado", "después del sorteo no se cambia el pago");
    const sorteados = (await datos.listarJugadores(torneo.id)).filter((j) => j.equipoId);
    afirmar(sorteados.length === 16, "16 jugadores tienen equipo");
    afirmar(new Set(sorteados.map((j) => j.equipoId)).size === 16, "los equipos son únicos");
    let partidos = await datos.listarPartidos(torneo.id);
    afirmar(partidos.length === 15, "el cuadro tiene 15 partidos");

    console.log("5. Reveal");
    for (let paso = 1; paso <= 4; paso++) {
      const r = await juego.avanzarReveal(torneo.id);
      afirmar(r.ok && r.revelados === paso * 2, `reveal paso ${paso}: ${paso * 2} cruces`);
    }
    const extra = await juego.avanzarReveal(torneo.id);
    afirmar(extra.ok && extra.revelados === 8, "el reveal no pasa de 8 cruces");
    afirmar((await datos.getTorneoVigente())?.estado === "en_juego", "el torneo pasó a en_juego");

    console.log("6. Resultados");
    const antes = await juego.getTableroPublico();
    afirmar(
      !JSON.stringify(antes).includes(DOMINIO) && !JSON.stringify(antes).includes("223 000"),
      "el tablero público no expone email ni WhatsApp",
    );
    for (let ronda = 1; ronda <= 4; ronda++) {
      partidos = await datos.listarPartidos(torneo.id);
      for (const p of partidos.filter((x) => x.ronda === ronda)) {
        afirmar(!!p.jugadorAId && !!p.jugadorBId, `ronda ${ronda} cruce ${p.posicion} tiene los dos jugadores`);
        const r = await juego.cargarResultado(p.id, p.jugadorAId!);
        afirmar(r.ok, `ronda ${ronda} cruce ${p.posicion} cargado`);
      }
    }
    const final = await juego.getTableroPublico();
    afirmar(final?.torneo.estado === "finalizado", "el torneo quedó finalizado");
    afirmar(!!final?.podio.campeonId && !!final.podio.subcampeonId, "hay campeón y subcampeón");
    afirmar(final?.podio.tercerosIds.length === 2, "hay 2 semifinalistas");
    const corregir = await juego.cargarResultado(
      (await datos.listarPartidos(torneo.id)).find((p) => p.ronda === 1)!.id,
      (await datos.listarJugadores(torneo.id))[0].id,
    );
    afirmar(!corregir.ok, "no se puede corregir un partido cuando la ronda siguiente ya se jugó");

    console.log("\nTODO OK");
  } finally {
    console.log("\nLimpieza");
    if (torneoId) await db.delete(torneos).where(eq(torneos.id, torneoId));
    await db.delete(clients).where(like(clients.email, `torneo-smoke-%@${DOMINIO}`));

    const [t] = await db.select({ n: sql<number>`count(*)::int` }).from(torneos);
    const [j] = await db.select({ n: sql<number>`count(*)::int` }).from(torneoJugadores);
    const [c] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(clients)
      .where(like(clients.email, `%@${DOMINIO}`));
    console.log(`  filas restantes -> torneos: ${t.n}, jugadores: ${j.n}, clientes de prueba: ${c.n}`);
    if (t.n !== 0 || j.n !== 0 || c.n !== 0) process.exitCode = 2;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
