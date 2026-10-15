import "server-only";

import { randomInt } from "node:crypto";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { torneoCambiosEquipo, torneoEquipos, torneoJugadores, torneoPartidos, torneos } from "@/db/schema";
import { elegirEquipo, leerReveal, momentoPremium, ordenRuleta, type MomentoPremium } from "@/lib/torneo";
import { esTocho, PROBABILIDAD_TOCHO } from "@/lib/torneo-escudos";

// Ventana premium: Pinky la abre después de la ruleta de equipos, cambia el equipo de quien pagó
// (la plata se arregla en el local, acá no se registra) y la cierra para seguir con los cruces.

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type MotivoPremium = "no_existe" | "fuera_de_momento" | "cerrada" | "no_sorteado" | "sin_libres" | "equipo_ocupado";
export type ResultadoPremium = { ok: true } | { ok: false; motivo: MotivoPremium };
export type ResultadoCambio = { ok: true; equipo: string } | { ok: false; motivo: MotivoPremium };

class Rechazo extends Error {
  constructor(public motivo: MotivoPremium) {
    super(motivo);
  }
}

/** Azar del reroll: criptográfico, no reproducible (no hay semilla que adivinar). */
const azarSeguro = () => randomInt(0, 2 ** 32) / 2 ** 32;

async function momentoEnTx(tx: Tx, torneoId: string): Promise<{ momento: MomentoPremium; estado: string } | null> {
  const [torneo] = await tx.select().from(torneos).where(eq(torneos.id, torneoId)).for("update").limit(1);
  if (!torneo) return null;
  const ronda1 = await tx
    .select({
      ronda: torneoPartidos.ronda,
      posicion: torneoPartidos.posicion,
      jugadorAId: torneoPartidos.jugadorAId,
      jugadorBId: torneoPartidos.jugadorBId,
    })
    .from(torneoPartidos)
    .where(and(eq(torneoPartidos.torneoId, torneoId), eq(torneoPartidos.ronda, 1)));
  const jugadores = ordenRuleta(ronda1).length;
  if (jugadores === 0) return { momento: "todavia", estado: torneo.estado };
  const reveal = leerReveal(torneo.revealPaso, torneo.sorteoSemilla, jugadores, ronda1.length);
  return { momento: momentoPremium(reveal, torneo.ventanaPremium), estado: torneo.estado };
}

export async function abrirVentanaPremium(torneoId: string): Promise<ResultadoPremium> {
  return db.transaction(async (tx) => {
    const m = await momentoEnTx(tx, torneoId);
    if (!m) return { ok: false, motivo: "no_existe" } as const;
    if (m.momento === "abierta") return { ok: true } as const;
    if (m.estado !== "sorteado" || m.momento !== "disponible") return { ok: false, motivo: "fuera_de_momento" } as const;
    await tx.update(torneos).set({ ventanaPremium: "abierta", updatedAt: new Date() }).where(eq(torneos.id, torneoId));
    return { ok: true } as const;
  });
}

export async function cerrarVentanaPremium(torneoId: string): Promise<ResultadoPremium> {
  await db
    .update(torneos)
    .set({ ventanaPremium: "cerrada", updatedAt: new Date() })
    .where(and(eq(torneos.id, torneoId), eq(torneos.ventanaPremium, "abierta")));
  return { ok: true };
}

export type PedidoCambio = { tipo: "reroll" } | { tipo: "elegir"; equipoId: string };

/** Cambia el equipo de un jugador sorteado, solo con la ventana abierta y a un equipo que nadie tiene. */
export async function cambiarEquipoPremium(jugadorId: string, pedido: PedidoCambio): Promise<ResultadoCambio> {
  try {
    return await db.transaction(async (tx) => {
      const [jugador] = await tx.select().from(torneoJugadores).where(eq(torneoJugadores.id, jugadorId)).limit(1);
      if (!jugador) throw new Rechazo("no_existe");

      const m = await momentoEnTx(tx, jugador.torneoId);
      if (!m) throw new Rechazo("no_existe");
      if (m.momento !== "abierta") throw new Rechazo("cerrada");
      if (jugador.estadoPago !== "pagado" || jugador.posicionSorteo === null) throw new Rechazo("no_sorteado");

      const [equipos, ocupados] = await Promise.all([
        tx.select().from(torneoEquipos).where(eq(torneoEquipos.torneoId, jugador.torneoId)),
        tx
          .select({ equipoId: torneoJugadores.equipoId })
          .from(torneoJugadores)
          .where(and(eq(torneoJugadores.torneoId, jugador.torneoId), isNotNull(torneoJugadores.equipoId))),
      ]);
      const usados = new Set(ocupados.map((o) => o.equipoId));
      const libres = equipos.filter((e) => !usados.has(e.id));
      if (libres.length === 0) throw new Rechazo("sin_libres");

      let nuevo: (typeof equipos)[number];
      if (pedido.tipo === "elegir") {
        const elegido = libres.find((e) => e.id === pedido.equipoId);
        if (!elegido) throw new Rechazo("equipo_ocupado");
        nuevo = elegido;
      } else {
        // Mismas reglas que la ruleta: los tochos salen 1,5% cada uno.
        const nombre = new Map(libres.map((e) => [e.id, e.nombre]));
        const id = elegirEquipo(
          libres.map((e) => e.id),
          azarSeguro,
          { esTocho: (equipoId) => esTocho(nombre.get(equipoId) ?? ""), probabilidad: PROBABILIDAD_TOCHO },
        );
        nuevo = libres.find((e) => e.id === id)!;
      }

      await tx.update(torneoJugadores).set({ equipoId: nuevo.id }).where(eq(torneoJugadores.id, jugador.id));
      await tx.insert(torneoCambiosEquipo).values({
        torneoId: jugador.torneoId,
        jugadorId: jugador.id,
        equipoAnteriorId: jugador.equipoId,
        equipoNuevoId: nuevo.id,
        tipo: pedido.tipo,
      });
      await tx.update(torneos).set({ updatedAt: new Date() }).where(eq(torneos.id, jugador.torneoId));
      return { ok: true, equipo: nuevo.nombre } as const;
    });
  } catch (error) {
    if (error instanceof Rechazo) return { ok: false, motivo: error.motivo };
    throw error;
  }
}

export type CambioPremium = { id: string; jugadorId: string; tipo: "reroll" | "elegir" };

/** El último cambio del torneo: la tele lo anima cuando aparece uno nuevo. */
export async function ultimoCambioPremium(torneoId: string): Promise<CambioPremium | null> {
  const [fila] = await db
    .select({ id: torneoCambiosEquipo.id, jugadorId: torneoCambiosEquipo.jugadorId, tipo: torneoCambiosEquipo.tipo })
    .from(torneoCambiosEquipo)
    .where(eq(torneoCambiosEquipo.torneoId, torneoId))
    .orderBy(desc(torneoCambiosEquipo.createdAt))
    .limit(1);
  return fila ?? null;
}
