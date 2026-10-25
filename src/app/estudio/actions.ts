"use server";

import { revalidatePath } from "next/cache";
import { asc, desc, eq, max } from "drizzle-orm";
import { z } from "zod";
import { del, head } from "@vercel/blob";
import { db } from "@/db";
import { estudioEscuchas, estudioHangar, estudioPartidas, estudioTemas } from "@/db/schema";
import { estudioBlobToken, getEstudioActor } from "@/lib/estudio";
import { mejorRecordDe, recordDelTema, type RecordTema } from "@/lib/estudio-juego";
import { ordenarRanking } from "@/lib/estudio-lista";
import { esModeloNave, FICHAS, navesDesbloqueadas, nuevasDesbloqueadas, type ModeloNave } from "@/lib/estudio-naves";
import {
  AUDIO_MAX_BYTES,
  AUDIO_PATHNAME,
  GENERO_MAX,
  PORTADA_PATHNAME,
  TITULO_MAX,
} from "@/lib/estudio-reglas";

export type EstudioState = { ok: boolean; mensaje: string | null };

const NO_PERMISO: EstudioState = { ok: false, mensaje: "No tenés permiso." };

const textos = {
  titulo: z.string().trim().min(1, "Ponele un nombre al tema.").max(TITULO_MAX, `El nombre puede tener hasta ${TITULO_MAX} letras.`),
  genero: z
    .string()
    .trim()
    .max(GENERO_MAX, `El género puede tener hasta ${GENERO_MAX} letras.`)
    .transform((valor) => valor || null),
};

const crearSchema = z.object({
  ...textos,
  audioPathname: z.string().regex(AUDIO_PATHNAME),
  portadaPathname: z.string().regex(PORTADA_PATHNAME).nullable(),
  duracionSeg: z.number().int().positive().max(60 * 60).nullable(),
});

const editarSchema = z.object({
  id: z.uuid(),
  ...textos,
  // undefined = no se toca; string = portada nueva
  portadaPathname: z.string().regex(PORTADA_PATHNAME).optional(),
});

function primerError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos.";
}

/** Confirma que el archivo de verdad llegó al Blob antes de apuntarle desde la base. */
async function existeEnBlob(pathname: string): Promise<{ size: number } | null> {
  try {
    const meta = await head(pathname, { token: estudioBlobToken() });
    return { size: meta.size };
  } catch {
    return null;
  }
}

async function borrarBlobs(pathnames: (string | null)[]) {
  const aBorrar = pathnames.filter((p): p is string => !!p);
  if (aBorrar.length === 0) return;
  try {
    await del(aBorrar, { token: estudioBlobToken() });
  } catch {
    // Un archivo huérfano en el Blob no rompe nada; la base ya quedó bien.
  }
}

export async function crearTemaAction(input: z.input<typeof crearSchema>): Promise<EstudioState> {
  const actor = await getEstudioActor();
  if (!actor) return NO_PERMISO;

  const datos = crearSchema.safeParse(input);
  if (!datos.success) return { ok: false, mensaje: primerError(datos.error) };

  const audio = await existeEnBlob(datos.data.audioPathname);
  if (!audio) return { ok: false, mensaje: "El tema no terminó de subir. Probá de nuevo." };
  if (audio.size > AUDIO_MAX_BYTES) return { ok: false, mensaje: "El archivo es demasiado pesado." };

  const portadaOk = datos.data.portadaPathname ? await existeEnBlob(datos.data.portadaPathname) : null;
  // Los temas nuevos entran al final del ranking.
  const [{ ultimo }] = await db.select({ ultimo: max(estudioTemas.orden) }).from(estudioTemas);

  await db.insert(estudioTemas).values({
    titulo: datos.data.titulo,
    genero: datos.data.genero,
    audioPathname: datos.data.audioPathname,
    audioBytes: audio.size,
    duracionSeg: datos.data.duracionSeg,
    portadaPathname: portadaOk ? datos.data.portadaPathname : null,
    orden: (ultimo ?? -1) + 1,
    subidoPor: actor.userId,
  });

  revalidatePath("/estudio");
  return { ok: true, mensaje: null };
}

export async function editarTemaAction(input: z.input<typeof editarSchema>): Promise<EstudioState> {
  if (!(await getEstudioActor())) return NO_PERMISO;

  const datos = editarSchema.safeParse(input);
  if (!datos.success) return { ok: false, mensaje: primerError(datos.error) };

  const [actual] = await db
    .select({ portadaPathname: estudioTemas.portadaPathname })
    .from(estudioTemas)
    .where(eq(estudioTemas.id, datos.data.id))
    .limit(1);
  if (!actual) return { ok: false, mensaje: "Ese tema ya no existe." };

  const portadaNueva = datos.data.portadaPathname;
  if (portadaNueva && !(await existeEnBlob(portadaNueva))) {
    return { ok: false, mensaje: "La portada no terminó de subir. Probá de nuevo." };
  }

  await db
    .update(estudioTemas)
    .set({
      titulo: datos.data.titulo,
      genero: datos.data.genero,
      ...(portadaNueva ? { portadaPathname: portadaNueva } : {}),
    })
    .where(eq(estudioTemas.id, datos.data.id));

  if (portadaNueva) await borrarBlobs([actual.portadaPathname]);

  revalidatePath("/estudio");
  return { ok: true, mensaje: null };
}

export async function borrarTemaAction(id: string): Promise<EstudioState> {
  if (!(await getEstudioActor())) return NO_PERMISO;
  if (!z.uuid().safeParse(id).success) return { ok: false, mensaje: "Ese tema ya no existe." };

  const [borrado] = await db
    .delete(estudioTemas)
    .where(eq(estudioTemas.id, id))
    .returning({ audioPathname: estudioTemas.audioPathname, portadaPathname: estudioTemas.portadaPathname });
  if (!borrado) return { ok: false, mensaje: "Ese tema ya no existe." };

  await borrarBlobs([borrado.audioPathname, borrado.portadaPathname]);

  revalidatePath("/estudio");
  return { ok: true, mensaje: null };
}

/** Guarda el ranking como quedó después de arrastrar. Solo escribe los puestos que cambiaron. */
export async function ordenarTemasAction(ids: string[]): Promise<EstudioState> {
  if (!(await getEstudioActor())) return NO_PERMISO;
  const datos = z.array(z.uuid()).max(500).safeParse(ids);
  if (!datos.success) return { ok: false, mensaje: "No se pudo guardar el orden." };

  const filas = await db
    .select({ id: estudioTemas.id, orden: estudioTemas.orden })
    .from(estudioTemas)
    .orderBy(asc(estudioTemas.orden), desc(estudioTemas.createdAt));
  const puestoActual = new Map(filas.map((fila) => [fila.id, fila.orden]));
  const cambios = ordenarRanking(
    filas.map((fila) => fila.id),
    datos.data
  )
    .map((id, puesto) => ({ id, puesto }))
    .filter(({ id, puesto }) => puestoActual.get(id) !== puesto);

  if (cambios.length > 0) {
    await db.transaction(async (tx) => {
      for (const { id, puesto } of cambios) await tx.update(estudioTemas).set({ orden: puesto }).where(eq(estudioTemas.id, id));
    });
  }

  revalidatePath("/estudio");
  return { ok: true, mensaje: null };
}

/** Una escucha más (la regla de cuándo cuenta está en el reproductor). No refresca la página: el contador sube en el cliente. */
export async function sumarEscuchaAction(temaId: string): Promise<EstudioState> {
  const actor = await getEstudioActor();
  if (!actor) return NO_PERMISO;
  if (!z.uuid().safeParse(temaId).success) return { ok: false, mensaje: null };
  try {
    await db.insert(estudioEscuchas).values({ temaId, userId: actor.userId });
  } catch {
    // El tema se borró mientras sonaba: no hay a quién sumarle.
    return { ok: false, mensaje: null };
  }
  return { ok: true, mensaje: null };
}

// ————————————————————————————— El jueguito de la nave —————————————————————————————
// No refrescan la página: el show sigue sonando y el cliente actualiza su estado con lo que devuelven.

/** Tope de cordura: una partida real no llega ni cerca. */
const PUNTOS_MAX = 1_000_000;
/** Lo mismo con los temas por los que pasó una partida (500 temas son más de un día jugando). */
const TEMAS_MAX = 500;

const partidaSchema = z.object({
  temaId: z.uuid(),
  puntos: z.number().int().min(0).max(PUNTOS_MAX),
  modelo: z.custom<ModeloNave>((valor) => esModeloNave(valor)),
  temas: z.number().int().min(1).max(TEMAS_MAX),
});

export type PartidaGuardada =
  | {
      ok: true;
      /** El récord del tema ya con esta partida (el mío y el del rival). */
      record: RecordTema;
      /** El mejor de la persona en cualquier tema, ya con esta partida. */
      mejorRecord: number;
      /** Las naves que destrabó esta partida (para el cartel de "nueva nave"); casi siempre vacío. */
      nuevas: ModeloNave[];
    }
  | { ok: false; mensaje: string };

export async function guardarPartidaAction(input: { temaId: string; puntos: number; modelo: ModeloNave; temas: number }): Promise<PartidaGuardada> {
  const actor = await getEstudioActor();
  if (!actor) return { ok: false, mensaje: "No tenés permiso." };

  const datos = partidaSchema.safeParse(input);
  if (!datos.success) return { ok: false, mensaje: "No se pudo guardar la partida." };
  const { temaId, puntos, modelo, temas } = datos.data;

  // Todo lo de antes en paralelo; con eso y esta partida sale la respuesta sin volver a leer.
  const [[tema], mejorAntes, recordAntes] = await Promise.all([
    db.select({ id: estudioTemas.id }).from(estudioTemas).where(eq(estudioTemas.id, temaId)).limit(1),
    mejorRecordDe(actor.userId),
    recordDelTema(actor, temaId),
  ]);
  if (!tema) return { ok: false, mensaje: "Ese tema ya no existe." };

  try {
    await db.insert(estudioPartidas).values({ temaId, userId: actor.userId, puntos, modelo, temas });
  } catch {
    // Lo más probable: el tema se borró justo ahora.
    return { ok: false, mensaje: "No se pudo guardar la partida." };
  }

  // A igual puntaje queda la anterior: el récord es de quien llegó primero (igual que en la consulta).
  const mio = recordAntes.mio && recordAntes.mio.puntos >= puntos ? recordAntes.mio : { puntos, modelo, temas };
  const mejorRecord = Math.max(mejorAntes, puntos);
  return {
    ok: true,
    record: { mio, rival: recordAntes.rival },
    mejorRecord,
    nuevas: nuevasDesbloqueadas(mejorAntes, mejorRecord),
  };
}

export type NaveElegida = { ok: true; modelo: ModeloNave } | { ok: false; mensaje: string };

/** La nave del hangar. Se destraba con el mejor récord que dice la base, no el que diga el cliente. */
export async function elegirNaveAction(modelo: ModeloNave): Promise<NaveElegida> {
  const actor = await getEstudioActor();
  if (!actor) return { ok: false, mensaje: "No tenés permiso." };
  if (!esModeloNave(modelo)) return { ok: false, mensaje: "Esa nave no existe." };

  const mejorRecord = await mejorRecordDe(actor.userId);
  if (!navesDesbloqueadas(mejorRecord).includes(modelo)) {
    const { nombre, recordParaDesbloquear } = FICHAS[modelo];
    return { ok: false, mensaje: `El ${nombre} se destraba con un récord de ${recordParaDesbloquear}.` };
  }

  await db
    .insert(estudioHangar)
    .values({ userId: actor.userId, modelo })
    .onConflictDoUpdate({ target: estudioHangar.userId, set: { modelo, updatedAt: new Date() } });

  return { ok: true, modelo };
}
