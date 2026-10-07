import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { torneoEquipos, torneoJugadores, torneoPartidos, torneos } from "@/db/schema";
import {
  avanzarGanador,
  calcularPodio,
  sortearTorneo,
  torneoTerminado,
  type Marcador,
  type PartidoCuadro,
  type Podio,
} from "@/lib/torneo";
import {
  getResumenPublico,
  getTorneoVigente,
  listarEquipos,
  listarJugadores,
  listarPartidos,
  type Torneo,
  type TorneoPartido,
} from "@/lib/torneo-data";

// ————————————————————————————
// Mapeo entre filas de la DB y el cuadro puro
// ————————————————————————————
function aFila(torneoId: string, p: PartidoCuadro) {
  return {
    torneoId,
    ronda: p.ronda,
    posicion: p.posicion,
    jugadorAId: p.jugadorAId,
    jugadorBId: p.jugadorBId,
    ganadorId: p.ganadorId,
    marcadorA: p.marcadorA,
    marcadorB: p.marcadorB,
    esBye: p.esBye,
    estado: p.estado,
  };
}

function aCuadro(filas: TorneoPartido[]): PartidoCuadro[] {
  return filas.map((f) => ({
    ronda: f.ronda,
    posicion: f.posicion,
    jugadorAId: f.jugadorAId,
    jugadorBId: f.jugadorBId,
    ganadorId: f.ganadorId,
    marcadorA: f.marcadorA,
    marcadorB: f.marcadorB,
    esBye: f.esBye,
    estado: f.estado,
  }));
}

// ————————————————————————————
// Sorteo
// ————————————————————————————
export type ResultadoSorteoDb =
  | { ok: true }
  | { ok: false; motivo: "no_existe" | "ya_sorteado" | "pocos_pagados" | "faltan_equipos" };

/** Sortea con los pagados, guarda todo y deja el torneo en "sorteado". Una sola vez. */
export async function sortearYGuardar(torneoId: string): Promise<ResultadoSorteoDb> {
  return db.transaction(async (tx) => {
    const [torneo] = await tx
      .select()
      .from(torneos)
      .where(eq(torneos.id, torneoId))
      .for("update")
      .limit(1);
    if (!torneo) return { ok: false, motivo: "no_existe" } as const;
    if (torneo.estado !== "inscripcion") return { ok: false, motivo: "ya_sorteado" } as const;

    const pagados = await tx
      .select({ id: torneoJugadores.id })
      .from(torneoJugadores)
      .where(and(eq(torneoJugadores.torneoId, torneoId), eq(torneoJugadores.estadoPago, "pagado")))
      .orderBy(asc(torneoJugadores.ordenPago));
    if (pagados.length < 2) return { ok: false, motivo: "pocos_pagados" } as const;

    const equipos = await tx
      .select({ id: torneoEquipos.id })
      .from(torneoEquipos)
      .where(eq(torneoEquipos.torneoId, torneoId));
    if (equipos.length < pagados.length) return { ok: false, motivo: "faltan_equipos" } as const;

    const semilla = randomUUID();
    const resultado = sortearTorneo({
      jugadorIds: pagados.map((j) => j.id),
      equipoIds: equipos.map((e) => e.id),
      semilla,
    });

    for (const a of resultado.asignaciones) {
      await tx
        .update(torneoJugadores)
        .set({ equipoId: a.equipoId, posicionSorteo: a.posicionSorteo })
        .where(eq(torneoJugadores.id, a.jugadorId));
    }
    await tx.insert(torneoPartidos).values(resultado.partidos.map((p) => aFila(torneoId, p)));
    await tx
      .update(torneos)
      .set({ estado: "sorteado", sorteoSemilla: semilla, revealPaso: 0, updatedAt: new Date() })
      .where(eq(torneos.id, torneoId));
    return { ok: true } as const;
  });
}

// ————————————————————————————
// Reveal en la pantalla
// ————————————————————————————
/** Cruces de la ronda 1 que se muestran por cada toque de "Siguiente". */
export const CRUCES_POR_PASO = 2;

export type ResultadoReveal = { ok: true; revelados: number; total: number } | { ok: false };

/** Revela los próximos 2 cruces. Al revelar todos, el torneo pasa a "en juego". */
export async function avanzarReveal(torneoId: string): Promise<ResultadoReveal> {
  return db.transaction(async (tx) => {
    const [torneo] = await tx
      .select()
      .from(torneos)
      .where(eq(torneos.id, torneoId))
      .for("update")
      .limit(1);
    if (!torneo || torneo.estado === "inscripcion") return { ok: false } as const;

    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(torneoPartidos)
      .where(and(eq(torneoPartidos.torneoId, torneoId), eq(torneoPartidos.ronda, 1)));

    const revelados = Math.min(total, torneo.revealPaso + CRUCES_POR_PASO);
    await tx
      .update(torneos)
      .set({
        revealPaso: revelados,
        estado: revelados >= total && torneo.estado === "sorteado" ? "en_juego" : torneo.estado,
        updatedAt: new Date(),
      })
      .where(eq(torneos.id, torneoId));
    return { ok: true, revelados, total } as const;
  });
}

/** Vuelve el reveal al principio (para repetir el momento en pantalla; el sorteo no cambia). */
export async function reiniciarReveal(torneoId: string): Promise<void> {
  await db
    .update(torneos)
    .set({ revealPaso: 0, updatedAt: new Date() })
    .where(and(eq(torneos.id, torneoId), ne(torneos.estado, "inscripcion")));
}

// ————————————————————————————
// Resultados
// ————————————————————————————
export type ResultadoCarga =
  | { ok: true }
  | { ok: false; motivo: "no_existe" | "sin_sorteo" | "invalido"; detalle?: string };

export async function cargarResultado(
  partidoId: string,
  ganadorId: string,
  marcador?: Marcador,
): Promise<ResultadoCarga> {
  return db.transaction(async (tx) => {
    const [partido] = await tx
      .select()
      .from(torneoPartidos)
      .where(eq(torneoPartidos.id, partidoId))
      .limit(1);
    if (!partido) return { ok: false, motivo: "no_existe" } as const;

    const [torneo] = await tx
      .select()
      .from(torneos)
      .where(eq(torneos.id, partido.torneoId))
      .for("update")
      .limit(1);
    if (!torneo || torneo.estado === "inscripcion") return { ok: false, motivo: "sin_sorteo" } as const;

    const filas = await tx
      .select()
      .from(torneoPartidos)
      .where(eq(torneoPartidos.torneoId, torneo.id));

    let despues: PartidoCuadro[];
    try {
      despues = avanzarGanador(aCuadro(filas), partido.ronda, partido.posicion, ganadorId, marcador);
    } catch (error) {
      return {
        ok: false,
        motivo: "invalido",
        detalle: error instanceof Error ? error.message : undefined,
      } as const;
    }

    for (const fila of filas) {
      const nuevo = despues.find((p) => p.ronda === fila.ronda && p.posicion === fila.posicion)!;
      const cambio =
        nuevo.jugadorAId !== fila.jugadorAId ||
        nuevo.jugadorBId !== fila.jugadorBId ||
        nuevo.ganadorId !== fila.ganadorId ||
        nuevo.marcadorA !== fila.marcadorA ||
        nuevo.marcadorB !== fila.marcadorB ||
        nuevo.estado !== fila.estado;
      if (!cambio) continue;
      await tx
        .update(torneoPartidos)
        .set({
          jugadorAId: nuevo.jugadorAId,
          jugadorBId: nuevo.jugadorBId,
          ganadorId: nuevo.ganadorId,
          marcadorA: nuevo.marcadorA,
          marcadorB: nuevo.marcadorB,
          estado: nuevo.estado,
          updatedAt: new Date(),
        })
        .where(eq(torneoPartidos.id, fila.id));
    }

    await tx
      .update(torneos)
      .set({ estado: torneoTerminado(despues) ? "finalizado" : "en_juego", updatedAt: new Date() })
      .where(eq(torneos.id, torneo.id));
    return { ok: true } as const;
  });
}

// ————————————————————————————
// Tablero público (pantalla de la tele y página /torneo)
// Nunca expone email ni WhatsApp.
// ————————————————————————————
export type TableroPublico = {
  torneo: {
    nombre: string;
    estado: Torneo["estado"];
    fecha: string | null;
    premiosTexto: string | null;
    revealPaso: number;
  };
  jugadores: { id: string; nombre: string; equipo: string | null }[];
  partidos: {
    id: string;
    ronda: number;
    posicion: number;
    jugadorAId: string | null;
    jugadorBId: string | null;
    ganadorId: string | null;
    marcadorA: number | null;
    marcadorB: number | null;
    esBye: boolean;
    estado: TorneoPartido["estado"];
  }[];
  podio: Podio;
};

/** "Juan Pérez" -> "Juan P." para no mostrar nombres completos en una pantalla pública. */
export function nombreCorto(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length < 2) return partes[0] ?? "";
  return `${partes[0]} ${partes[1].charAt(0).toUpperCase()}.`;
}

/** null mientras el torneo no se sorteó. */
export async function getTableroPublico(): Promise<TableroPublico | null> {
  const torneo = await getTorneoVigente();
  if (!torneo || torneo.estado === "inscripcion") return null;

  const [jugadoresDb, equipos, partidos] = await Promise.all([
    listarJugadores(torneo.id),
    listarEquipos(torneo.id),
    listarPartidos(torneo.id),
  ]);
  const nombreEquipo = new Map(equipos.map((e) => [e.id, e.nombre]));

  return {
    torneo: {
      nombre: torneo.nombre,
      estado: torneo.estado,
      fecha: torneo.fecha ? torneo.fecha.toISOString() : null,
      premiosTexto: torneo.premiosTexto,
      revealPaso: torneo.revealPaso,
    },
    jugadores: jugadoresDb
      .filter((j) => j.posicionSorteo !== null)
      .map((j) => ({
        id: j.id,
        nombre: nombreCorto(j.nombre),
        equipo: j.equipoId ? (nombreEquipo.get(j.equipoId) ?? null) : null,
      })),
    partidos: partidos.map((p) => ({
      id: p.id,
      ronda: p.ronda,
      posicion: p.posicion,
      jugadorAId: p.jugadorAId,
      jugadorBId: p.jugadorBId,
      ganadorId: p.ganadorId,
      marcadorA: p.marcadorA,
      marcadorB: p.marcadorB,
      esBye: p.esBye,
      estado: p.estado,
    })),
    podio: calcularPodio(aCuadro(partidos)),
  };
}

/** Todo lo que necesita la pantalla de la tele: el estado previo al sorteo y, después, el cuadro. */
export type DatosPantalla = {
  previa: { nombre: string; pagados: number; cupo: number } | null;
  tablero: TableroPublico | null;
};

export async function getDatosPantalla(): Promise<DatosPantalla> {
  const torneo = await getTorneoVigente();
  if (!torneo) return { previa: null, tablero: null };

  const [resumen, tablero] = await Promise.all([
    getResumenPublico(torneo.id, torneo.cupo),
    getTableroPublico(),
  ]);
  return {
    previa: { nombre: torneo.nombre, pagados: resumen.pagados, cupo: resumen.cupo },
    tablero,
  };
}
