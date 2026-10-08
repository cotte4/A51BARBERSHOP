import "server-only";

import { and, eq } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { torneoJugadores, torneoPartidos, torneos } from "@/db/schema";
import { normalizePhone } from "@/lib/phone";
import { buscarOCrearCliente, type DatosInscripcion } from "@/lib/torneo-data";

export type ReemplazoDe =
  | { tipo: "espera"; jugadorId: string }
  | { tipo: "nuevo"; datos: DatosInscripcion };

type Motivo =
  | "no_existe"
  | "sin_sorteo"
  | "ya_empezo"
  | "no_sorteado"
  | "reemplazo_invalido"
  | "ya_anotado"
  | "telefono_invalido";

export type ResultadoReemplazo = { ok: true } | { ok: false; motivo: Motivo };

class Rechazo extends Error {
  constructor(public motivo: Motivo) {
    super(motivo);
  }
}

/**
 * El jugador que se baja deja su lugar (equipo, posición y cruce) a otro que paga la cuota.
 * Solo vale mientras no se jugó ningún partido: después el cuadro ya no se toca.
 * El que se baja queda como "baja" (no se borra, se le devolvió la cuota).
 */
export async function reemplazarJugador(
  bajaId: string,
  reemplazo: ReemplazoDe,
): Promise<ResultadoReemplazo> {
  let clientId: string | null = null;
  let nuevo: DatosInscripcion | null = null;
  if (reemplazo.tipo === "nuevo") {
    const telefono = normalizePhone(reemplazo.datos.whatsapp);
    if (!telefono) return { ok: false, motivo: "telefono_invalido" };
    nuevo = { ...reemplazo.datos, email: reemplazo.datos.email.trim().toLowerCase() };
    clientId = await buscarOCrearCliente(nuevo, telefono);
  }

  try {
    await db.transaction(async (tx) => {
      const [baja] = await tx.select().from(torneoJugadores).where(eq(torneoJugadores.id, bajaId)).limit(1);
      if (!baja) throw new Rechazo("no_existe");

      const [torneo] = await tx
        .select()
        .from(torneos)
        .where(eq(torneos.id, baja.torneoId))
        .for("update")
        .limit(1);
      if (!torneo || torneo.estado === "inscripcion") throw new Rechazo("sin_sorteo");
      if (baja.estadoPago !== "pagado" || baja.posicionSorteo === null) throw new Rechazo("no_sorteado");

      const partidos = await tx.select().from(torneoPartidos).where(eq(torneoPartidos.torneoId, torneo.id));
      if (partidos.some((p) => !p.esBye && p.ganadorId !== null)) throw new Rechazo("ya_empezo");

      const todos = await tx
        .select({ ordenPago: torneoJugadores.ordenPago })
        .from(torneoJugadores)
        .where(eq(torneoJugadores.torneoId, torneo.id));
      const heredado = {
        estadoPago: "pagado" as const,
        pagadoEn: new Date(),
        ordenPago: todos.reduce((m, j) => Math.max(m, j.ordenPago ?? 0), 0) + 1,
        equipoId: baja.equipoId,
        posicionSorteo: baja.posicionSorteo,
      };

      // Se resuelve quién entra antes de tocar nada.
      let entraId: string | null = null;
      if (reemplazo.tipo === "espera") {
        const [candidato] = await tx
          .select()
          .from(torneoJugadores)
          .where(eq(torneoJugadores.id, reemplazo.jugadorId))
          .limit(1);
        if (
          !candidato ||
          candidato.torneoId !== torneo.id ||
          candidato.estadoPago !== "pendiente" ||
          candidato.posicionSorteo !== null
        ) {
          throw new Rechazo("reemplazo_invalido");
        }
        entraId = candidato.id;
      } else if (nuevo) {
        const [existente] = await tx
          .select()
          .from(torneoJugadores)
          .where(and(eq(torneoJugadores.torneoId, torneo.id), eq(torneoJugadores.email, nuevo.email)))
          .limit(1);
        if (existente && (existente.estadoPago !== "pendiente" || existente.posicionSorteo !== null)) {
          throw new Rechazo("ya_anotado");
        }
        entraId = existente?.id ?? null;
      }

      await tx
        .update(torneoJugadores)
        .set({ estadoPago: "baja", ordenPago: null, equipoId: null, posicionSorteo: null })
        .where(eq(torneoJugadores.id, baja.id));

      if (entraId) {
        // Si la persona nueva ya estaba anotada (mismo email), vale el alias que dio ahora.
        await tx
          .update(torneoJugadores)
          .set(nuevo ? { ...heredado, alias: nuevo.alias } : heredado)
          .where(eq(torneoJugadores.id, entraId));
      } else if (nuevo) {
        const [creado] = await tx
          .insert(torneoJugadores)
          .values({
            torneoId: torneo.id,
            clientId,
            nombre: nuevo.nombre,
            alias: nuevo.alias,
            email: nuevo.email,
            whatsapp: nuevo.whatsapp,
            consentimiento: true,
            ...heredado,
          })
          .returning({ id: torneoJugadores.id });
        entraId = creado.id;
      }
      if (!entraId) throw new Rechazo("reemplazo_invalido");

      // El nuevo toma el lugar de la baja en el cruce (y en el ganador de un pase directo).
      const ahora = new Date();
      const donde = (columna: AnyPgColumn) =>
        and(eq(torneoPartidos.torneoId, torneo.id), eq(columna, baja.id));
      await tx.update(torneoPartidos).set({ jugadorAId: entraId, updatedAt: ahora }).where(donde(torneoPartidos.jugadorAId));
      await tx.update(torneoPartidos).set({ jugadorBId: entraId, updatedAt: ahora }).where(donde(torneoPartidos.jugadorBId));
      await tx.update(torneoPartidos).set({ ganadorId: entraId, updatedAt: ahora }).where(donde(torneoPartidos.ganadorId));
      await tx.update(torneos).set({ updatedAt: ahora }).where(eq(torneos.id, torneo.id));
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Rechazo) return { ok: false, motivo: error.motivo };
    throw error;
  }
}
