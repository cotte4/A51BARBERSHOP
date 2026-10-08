import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  torneoEquipos,
  torneoJugadores,
  torneoPartidos,
  torneos,
  user,
} from "@/db/schema";
import { normalizePhone } from "@/lib/phone";
import {
  avanzarGanador,
  calcularPodio,
  resumenCupo,
  siguienteOrdenPago,
  sortearTorneo,
  torneoTerminado,
  type Marcador,
  type PartidoCuadro,
  type Podio,
} from "@/lib/torneo";

export type Torneo = typeof torneos.$inferSelect;
export type TorneoJugador = typeof torneoJugadores.$inferSelect;
export type TorneoEquipo = typeof torneoEquipos.$inferSelect;
export type TorneoPartido = typeof torneoPartidos.$inferSelect;

/** Tope de anotados (16 con lugar + lista de espera): frena a quien llene el formulario con basura. */
export const MAX_ANOTADOS = 51;
/** Inscripciones aceptadas cada 10 min en total: holgado para el local, corta a un bot. */
const MAX_ANOTADOS_POR_RAFAGA = 40;

/** Placeholder editable: "los más grandes de cada liga". Se reemplaza con la lista real. */
const EQUIPOS_PLACEHOLDER = [
  "Real Madrid",
  "Barcelona",
  "Manchester City",
  "Liverpool",
  "Bayern Múnich",
  "PSG",
  "Arsenal",
  "Chelsea",
  "Manchester United",
  "Tottenham",
  "Juventus",
  "Inter",
  "Milan",
  "Napoli",
  "Roma",
  "Atlético de Madrid",
  "Borussia Dortmund",
  "Bayer Leverkusen",
  "Newcastle",
  "Aston Villa",
];

// ————————————————————————————
// Lectura
// ————————————————————————————
/** El torneo vigente: el último que no terminó; si no hay, el más reciente. */
export async function getTorneoVigente(): Promise<Torneo | null> {
  const [abierto] = await db
    .select()
    .from(torneos)
    .where(ne(torneos.estado, "finalizado"))
    .orderBy(desc(torneos.createdAt))
    .limit(1);
  if (abierto) return abierto;
  const [ultimo] = await db.select().from(torneos).orderBy(desc(torneos.createdAt)).limit(1);
  return ultimo ?? null;
}

export async function listarJugadores(torneoId: string): Promise<TorneoJugador[]> {
  return db
    .select()
    .from(torneoJugadores)
    .where(eq(torneoJugadores.torneoId, torneoId))
    .orderBy(asc(torneoJugadores.createdAt));
}

export async function listarEquipos(torneoId: string): Promise<TorneoEquipo[]> {
  return db
    .select()
    .from(torneoEquipos)
    .where(eq(torneoEquipos.torneoId, torneoId))
    .orderBy(asc(torneoEquipos.nombre));
}

export async function listarPartidos(torneoId: string): Promise<TorneoPartido[]> {
  return db
    .select()
    .from(torneoPartidos)
    .where(eq(torneoPartidos.torneoId, torneoId))
    .orderBy(asc(torneoPartidos.ronda), asc(torneoPartidos.posicion));
}

export async function getResumenPublico(torneoId: string, cupo: number) {
  const jugadores = await listarJugadores(torneoId);
  return { ...resumenCupo(jugadores, cupo), anotados: jugadores.length };
}

// ————————————————————————————
// Alta del torneo (la primera vez que Pinky entra al panel)
// ————————————————————————————
export async function asegurarTorneo(): Promise<Torneo> {
  const existente = await getTorneoVigente();
  if (existente) return existente;

  return db.transaction(async (tx) => {
    const [torneo] = await tx
      .insert(torneos)
      .values({ nombre: "Torneo FIFA A51" })
      .returning();
    await tx
      .insert(torneoEquipos)
      .values(EQUIPOS_PLACEHOLDER.map((nombre) => ({ torneoId: torneo.id, nombre })));
    return torneo;
  });
}

// ————————————————————————————
// Inscripción pública
// ————————————————————————————
export type DatosInscripcion = {
  nombre: string;
  email: string;
  whatsapp: string;
};

export type ResultadoInscripcion =
  | { ok: true; puestoEspera: number | null }
  | {
      ok: false;
      motivo: "cerrado" | "ya_anotado" | "lleno" | "telefono_invalido" | "sin_torneo" | "demasiados";
    };

async function getUsuarioDueno(): Promise<string> {
  const [dueno] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.role, "admin"))
    .orderBy(asc(user.createdAt))
    .limit(1);
  if (!dueno) throw new Error("No hay un usuario admin para registrar al cliente.");
  return dueno.id;
}

/**
 * Busca al cliente por email o teléfono (ya hay clientes importados de la planilla y
 * ambos campos son únicos); si no existe, lo crea. Nunca pisa datos de uno existente.
 */
export async function buscarOCrearCliente(datos: DatosInscripcion, telefonoNormalizado: string) {
  const email = datos.email.trim().toLowerCase();
  const [existente] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      or(
        sql`lower(${clients.email}) = ${email}`,
        eq(clients.phoneNormalized, telefonoNormalizado),
      ),
    )
    .limit(1);
  if (existente) return existente.id;

  const duenoId = await getUsuarioDueno();
  const [nuevo] = await db
    .insert(clients)
    .values({
      name: datos.nombre,
      email,
      phoneRaw: datos.whatsapp,
      phoneNormalized: telefonoNormalizado,
      tags: ["torneo-fifa"],
      createdByUserId: duenoId,
    })
    .onConflictDoNothing()
    .returning({ id: clients.id });
  if (nuevo) return nuevo.id;

  // Carrera con otra inscripción simultánea: ahora sí existe.
  const [carrera] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(
      or(
        sql`lower(${clients.email}) = ${email}`,
        eq(clients.phoneNormalized, telefonoNormalizado),
      ),
    )
    .limit(1);
  return carrera?.id ?? null;
}

export async function inscribirJugador(datos: DatosInscripcion): Promise<ResultadoInscripcion> {
  const torneo = await getTorneoVigente();
  if (!torneo) return { ok: false, motivo: "sin_torneo" };
  if (torneo.estado !== "inscripcion") return { ok: false, motivo: "cerrado" };

  const telefono = normalizePhone(datos.whatsapp);
  if (!telefono) return { ok: false, motivo: "telefono_invalido" };

  // Tope global de ráfaga: frena a un bot aunque cambie de IP (la base es la única memoria compartida).
  const [{ recientes }] = await db
    .select({ recientes: sql<number>`count(*)::int` })
    .from(torneoJugadores)
    .where(
      and(
        eq(torneoJugadores.torneoId, torneo.id),
        sql`${torneoJugadores.createdAt} > now() - interval '10 minutes'`,
      ),
    );
  if (recientes >= MAX_ANOTADOS_POR_RAFAGA) return { ok: false, motivo: "demasiados" };

  const clientId = await buscarOCrearCliente(datos, telefono);
  const email = datos.email.trim().toLowerCase();

  // El tope se cuenta con el torneo bloqueado: inscripciones simultáneas no lo pasan.
  return db.transaction(async (tx) => {
    await tx.select({ id: torneos.id }).from(torneos).where(eq(torneos.id, torneo.id)).for("update");
    const [{ total }] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(torneoJugadores)
      .where(eq(torneoJugadores.torneoId, torneo.id));
    if (total >= MAX_ANOTADOS) return { ok: false, motivo: "lleno" } as const;

    // Mismo teléfono (o email) con otro email: es la misma persona, no se anota dos veces.
    if (clientId) {
      const [repetido] = await tx
        .select({ id: torneoJugadores.id })
        .from(torneoJugadores)
        .where(and(eq(torneoJugadores.torneoId, torneo.id), eq(torneoJugadores.clientId, clientId)))
        .limit(1);
      if (repetido) return { ok: false, motivo: "ya_anotado" } as const;
    }

    const [insertado] = await tx
      .insert(torneoJugadores)
      .values({
        torneoId: torneo.id,
        clientId,
        nombre: datos.nombre,
        email,
        whatsapp: datos.whatsapp,
        consentimiento: true,
      })
      .onConflictDoNothing()
      .returning({ id: torneoJugadores.id });

    if (!insertado) return { ok: false, motivo: "ya_anotado" } as const;

    // Con el cupo lleno, quien se anota queda en lista de espera: su puesto es por orden de llegada.
    const todos = await tx
      .select({ estadoPago: torneoJugadores.estadoPago, ordenPago: torneoJugadores.ordenPago })
      .from(torneoJugadores)
      .where(eq(torneoJugadores.torneoId, torneo.id));
    const { lleno, enEspera } = resumenCupo(todos, torneo.cupo);
    return { ok: true, puestoEspera: lleno ? enEspera : null } as const;
  });
}

// ————————————————————————————
// Panel de Pinky
// ————————————————————————————
export type ResultadoPago = { ok: true } | { ok: false; motivo: "cupo_lleno" | "no_existe" | "cerrado" };

/** Marca o desmarca "Pagó". El cupo se chequea con el torneo bloqueado: sin carreras. */
export async function marcarPago(jugadorId: string, pagado: boolean): Promise<ResultadoPago> {
  return db.transaction(async (tx) => {
    const [jugador] = await tx
      .select()
      .from(torneoJugadores)
      .where(eq(torneoJugadores.id, jugadorId))
      .limit(1);
    if (!jugador) return { ok: false, motivo: "no_existe" } as const;

    const [torneo] = await tx
      .select()
      .from(torneos)
      .where(eq(torneos.id, jugador.torneoId))
      .for("update")
      .limit(1);
    if (!torneo || torneo.estado !== "inscripcion") return { ok: false, motivo: "cerrado" } as const;

    if (!pagado) {
      await tx
        .update(torneoJugadores)
        .set({ estadoPago: "pendiente", pagadoEn: null, ordenPago: null })
        .where(eq(torneoJugadores.id, jugadorId));
      return { ok: true } as const;
    }

    if (jugador.estadoPago === "pagado") return { ok: true } as const;

    const todos = await tx
      .select({ estadoPago: torneoJugadores.estadoPago, ordenPago: torneoJugadores.ordenPago })
      .from(torneoJugadores)
      .where(and(eq(torneoJugadores.torneoId, torneo.id)));
    const orden = siguienteOrdenPago(todos, torneo.cupo);
    if (orden === null) return { ok: false, motivo: "cupo_lleno" } as const;

    await tx
      .update(torneoJugadores)
      .set({ estadoPago: "pagado", pagadoEn: new Date(), ordenPago: orden })
      .where(eq(torneoJugadores.id, jugadorId));
    return { ok: true } as const;
  });
}

export type ResultadoEliminar =
  | { ok: true }
  | { ok: false; motivo: "no_existe" | "pagado" | "cerrado" };

/** Saca a un anotado que no pagó (pruebas, errores, duplicados). El cliente de la app queda. */
export async function eliminarJugador(jugadorId: string): Promise<ResultadoEliminar> {
  return db.transaction(async (tx) => {
    const [jugador] = await tx
      .select()
      .from(torneoJugadores)
      .where(eq(torneoJugadores.id, jugadorId))
      .limit(1);
    if (!jugador) return { ok: false, motivo: "no_existe" } as const;

    const [torneo] = await tx
      .select()
      .from(torneos)
      .where(eq(torneos.id, jugador.torneoId))
      .for("update")
      .limit(1);
    if (!torneo || torneo.estado !== "inscripcion") return { ok: false, motivo: "cerrado" } as const;
    if (jugador.estadoPago === "pagado") return { ok: false, motivo: "pagado" } as const;

    await tx.delete(torneoJugadores).where(eq(torneoJugadores.id, jugadorId));
    return { ok: true } as const;
  });
}

export type ConfigTorneo = {
  nombre: string;
  /** "YYYY-MM-DDTHH:mm" hora Argentina, o null = fecha a confirmar. */
  fechaLocal: string | null;
  premiosTexto: string | null;
};

export async function actualizarConfig(torneoId: string, config: ConfigTorneo): Promise<void> {
  // Argentina no tiene horario de verano: UTC-3 fijo.
  const fecha = config.fechaLocal ? new Date(`${config.fechaLocal}:00-03:00`) : null;
  await db
    .update(torneos)
    .set({
      nombre: config.nombre,
      fecha: fecha && !Number.isNaN(fecha.getTime()) ? fecha : null,
      premiosTexto: config.premiosTexto,
      updatedAt: new Date(),
    })
    .where(eq(torneos.id, torneoId));
}

export async function reemplazarEquipos(torneoId: string, nombres: string[]): Promise<void> {
  const limpios = [...new Set(nombres.map((n) => n.trim()).filter(Boolean))];
  await db.transaction(async (tx) => {
    await tx.delete(torneoEquipos).where(eq(torneoEquipos.torneoId, torneoId));
    if (limpios.length > 0) {
      await tx.insert(torneoEquipos).values(limpios.map((nombre) => ({ torneoId, nombre })));
    }
  });
}

// ————————————————————————————
// Torneo de ensayo
// ————————————————————————————
/** Prefijo que marca a un torneo como de prueba: solo esos se pueden borrar desde el panel. */
export const PREFIJO_TORNEO_PRUEBA = "Prueba";

export function esTorneoDePrueba(nombre: string): boolean {
  return nombre.trim().toLowerCase().startsWith(PREFIJO_TORNEO_PRUEBA.toLowerCase());
}

/** Borra un torneo de ensayo con todo lo suyo. Un torneo real (sin el prefijo) nunca se borra. */
export async function borrarTorneoDePrueba(torneoId: string): Promise<{ ok: boolean }> {
  const [torneo] = await db.select().from(torneos).where(eq(torneos.id, torneoId)).limit(1);
  if (!torneo || !esTorneoDePrueba(torneo.nombre)) return { ok: false };
  await db.delete(torneos).where(eq(torneos.id, torneoId));
  return { ok: true };
}
