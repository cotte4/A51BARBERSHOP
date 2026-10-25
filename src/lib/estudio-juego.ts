import "server-only";

import { asc, desc, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { estudioHangar, estudioPartidas, user } from "@/db/schema";
import { puedeEntrarAlEstudio, type EstudioActor } from "@/lib/estudio";
import { esModeloNave, NAVE_INICIAL, navesDesbloqueadas, type ModeloNave } from "@/lib/estudio-naves";

// El jueguito de la nave en la base: el récord de cada uno por tema (Was vs Pinky, con la nave usada)
// y la nave elegida en el hangar, que sigue a la persona del celu a la compu.

/** `temas`: por cuántos temas pasó la partida (sigue cuando termina el tema; es del tema donde arrancó). */
export type RecordPropio = { puntos: number; modelo: ModeloNave; temas: number };
export type RecordRival = RecordPropio & { /** El primer nombre ("Pinky"). */ nombre: string };
export type RecordTema = { mio: RecordPropio | null; rival: RecordRival | null };

export type ResumenJuego = {
  /** La nodriza de esta persona en el show y en el juego. */
  naveElegida: ModeloNave;
  /** Su mejor partida en cualquier tema: destraba las naves (src/lib/estudio-naves.ts). */
  mejorRecord: number;
  /** Solo los temas que alguien jugó; los demás no tienen entrada. */
  records: Record<string, RecordTema>;
};

/** Un modelo de la base que ya no existe (o una fila rota) se lee como la nave inicial. */
function leerModelo(valor: unknown): ModeloNave {
  return esModeloNave(valor) ? valor : NAVE_INICIAL;
}

function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre;
}

type MejorFila = { temaId: string; userId: string; puntos: number; modelo: string; temas: number; nombre: string; email: string };

/**
 * La mejor partida de cada persona en cada tema (o en uno solo), en una consulta. A igual puntaje
 * vale la primera: el récord es de quien llegó antes.
 */
function mejoresPartidas(temaId?: string): Promise<MejorFila[]> {
  return db
    .selectDistinctOn([estudioPartidas.temaId, estudioPartidas.userId], {
      temaId: estudioPartidas.temaId,
      userId: estudioPartidas.userId,
      puntos: estudioPartidas.puntos,
      modelo: estudioPartidas.modelo,
      temas: estudioPartidas.temas,
      nombre: user.name,
      email: user.email,
    })
    .from(estudioPartidas)
    .innerJoin(user, eq(user.id, estudioPartidas.userId))
    .where(temaId ? eq(estudioPartidas.temaId, temaId) : undefined)
    .orderBy(estudioPartidas.temaId, estudioPartidas.userId, desc(estudioPartidas.puntos), asc(estudioPartidas.createdAt));
}

/**
 * Arma el récord de cada tema desde las mejores filas. El rival es el otro del Estudio: si algún día
 * hay más de dos, el que más hizo; alguien que ya no está en ESTUDIO_EMAILS no cuenta.
 */
function armarRecords(filas: MejorFila[], userId: string): Record<string, RecordTema> {
  const records: Record<string, RecordTema> = {};
  for (const fila of filas) {
    const record = (records[fila.temaId] ??= { mio: null, rival: null });
    const partida = { puntos: fila.puntos, modelo: leerModelo(fila.modelo), temas: fila.temas };
    if (fila.userId === userId) {
      record.mio = partida;
    } else if (puedeEntrarAlEstudio(fila.email) && (!record.rival || fila.puntos > record.rival.puntos)) {
      record.rival = { ...partida, nombre: primerNombre(fila.nombre) };
    }
  }
  return records;
}

/** Lo que el juego necesita al abrir el Estudio: dos consultas en paralelo, no una por tema. */
export async function resumenJuego(actor: EstudioActor): Promise<ResumenJuego> {
  const [filas, [hangar]] = await Promise.all([
    mejoresPartidas(),
    db.select({ modelo: estudioHangar.modelo }).from(estudioHangar).where(eq(estudioHangar.userId, actor.userId)).limit(1),
  ]);

  const mejorRecord = filas.reduce((mejor, fila) => (fila.userId === actor.userId ? Math.max(mejor, fila.puntos) : mejor), 0);
  return {
    naveElegida: naveVigente(hangar?.modelo, mejorRecord),
    mejorRecord,
    records: armarRecords(filas, actor.userId),
  };
}

/**
 * La nave elegida, si sigue destrabada. Los escalones se ajustan jugando: si uno sube y la nave
 * quedó por encima del récord, se vuelve a la inicial en vez de dejar una nave que no se ganó.
 */
function naveVigente(modelo: unknown, mejorRecord: number): ModeloNave {
  const elegida = leerModelo(modelo);
  return navesDesbloqueadas(mejorRecord).includes(elegida) ? elegida : NAVE_INICIAL;
}

/** El récord de un tema (mío y del rival). */
export async function recordDelTema(actor: EstudioActor, temaId: string): Promise<RecordTema> {
  const records = armarRecords(await mejoresPartidas(temaId), actor.userId);
  return records[temaId] ?? { mio: null, rival: null };
}

/** La mejor partida de la persona en cualquier tema; 0 si nunca jugó. */
export async function mejorRecordDe(userId: string): Promise<number> {
  const [fila] = await db.select({ mejor: max(estudioPartidas.puntos) }).from(estudioPartidas).where(eq(estudioPartidas.userId, userId));
  return fila?.mejor ?? 0;
}
