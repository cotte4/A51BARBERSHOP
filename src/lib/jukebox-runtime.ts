import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { jukeboxRuntime } from "@/db/schema";

const ID = "singleton";

/** Por dónde sale la música: Spotify (lo normal) o YouTube en el celu del staff (si Spotify falla). */
export type FuenteJukebox = "spotify" | "youtube";

export type TemaSpotify = { uri: string | null; nombre: string; artistas: string; tapa: string | null };

/** La última vez que el latido miró Spotify. La leen el staff y el público sin hablar con Spotify. */
export type FotoSpotify = {
  en: string;
  /** desconectado = nadie conectó una cuenta (o se desconectó); error = la cuenta está pero falla. */
  conexion: "conectado" | "desconectado" | "error";
  cuenta: string | null;
  /** sin_dispositivo = Spotify no está abierto en ningún lado (o el celu lo cerró). */
  estado: "sonando" | "pausa" | "sin_dispositivo";
  tema: TemaSpotify | null;
  progresoMs: number;
  duracionMs: number;
  dispositivo: string | null;
  /** Lo último que salió mal hablando con Spotify, en castellano para Pinky. */
  error: string | null;
  /** Spotify pidió esperar (o falla seguido): hasta acá no se le habla. ISO. */
  pausaHasta?: string | null;
};

export type RuntimeJukebox = { fuente: FuenteJukebox; foto: FotoSpotify | null };

export async function leerRuntime(): Promise<RuntimeJukebox> {
  const [fila] = await db.select().from(jukeboxRuntime).where(eq(jukeboxRuntime.id, ID)).limit(1);
  if (!fila) {
    await db.insert(jukeboxRuntime).values({ id: ID }).onConflictDoNothing();
    return { fuente: "spotify", foto: null };
  }
  return { fuente: fila.source, foto: (fila.spotifySnapshot as FotoSpotify | null) ?? null };
}

/** Lo máximo que puede tardar un latido. Si se cae a mitad de camino, el turno se libera solo después de esto. */
const PRESTAMO_MS = 15_000;

/**
 * Reclama el turno de hablar con Spotify: solo uno cada `cadaMs` lo consigue, aunque sondeen veinte
 * celulares a la vez (el UPDATE con la condición es atómico). El turno se toma "prestado" hacia el
 * futuro mientras el latido trabaja, así dos latidos nunca se pisan; al terminar se suelta con soltarTurno.
 */
export async function reclamarTurno(cadaMs: number): Promise<boolean> {
  await leerRuntime(); // crea la fila la primera vez
  const ahora = new Date();
  const reclamada = await db
    .update(jukeboxRuntime)
    .set({ syncedAt: new Date(ahora.getTime() + PRESTAMO_MS) })
    .where(
      and(
        eq(jukeboxRuntime.id, ID),
        or(isNull(jukeboxRuntime.syncedAt), lt(jukeboxRuntime.syncedAt, new Date(ahora.getTime() - cadaMs))),
      ),
    )
    .returning({ id: jukeboxRuntime.id });
  return reclamada.length > 0;
}

/** Fin del latido: desde ahora corren los `cadaMs` hasta el próximo. */
export async function soltarTurno(): Promise<void> {
  await db.update(jukeboxRuntime).set({ syncedAt: new Date() }).where(eq(jukeboxRuntime.id, ID));
}

export async function guardarFoto(foto: FotoSpotify): Promise<void> {
  await db
    .update(jukeboxRuntime)
    .set({ spotifySnapshot: foto, updatedAt: new Date() })
    .where(eq(jukeboxRuntime.id, ID));
}

export async function guardarFuente(fuente: FuenteJukebox): Promise<void> {
  await leerRuntime();
  await db
    .update(jukeboxRuntime)
    // syncedAt en null: el próximo sondeo habla con Spotify sin esperar su turno.
    .set({ source: fuente, syncedAt: null, updatedAt: new Date() })
    .where(eq(jukeboxRuntime.id, ID));
}

/** Una foto vieja no dice nada: si nadie miró Spotify en este rato, no se muestra lo que sonaba. */
export function fotoVigente(foto: FotoSpotify | null, maxMs = 90_000): FotoSpotify | null {
  if (!foto) return null;
  return Date.now() - new Date(foto.en).getTime() <= maxMs ? foto : null;
}
