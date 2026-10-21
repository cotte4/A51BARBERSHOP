import "server-only";

import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { atenciones, barberos, liquidaciones } from "@/db/schema";

export type GenerarLiquidacionInput = {
  barberoId: string;
  periodoInicio: string;
  periodoFin: string;
  notas?: string | null;
};

export type GenerarLiquidacionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; yaExiste?: true };

export type MarcarPagadaResult = { ok: true } | { ok: false; error: string };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function generarLiquidacionDesdeInput(
  input: GenerarLiquidacionInput,
  txExterna?: Tx
): Promise<GenerarLiquidacionResult> {
  const runner = async (tx: Tx): Promise<GenerarLiquidacionResult> => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.barberoId}))`);

    const [existente] = await tx
      .select({ id: liquidaciones.id })
      .from(liquidaciones)
      .where(
        and(
          eq(liquidaciones.barberoId, input.barberoId),
          lte(liquidaciones.periodoInicio, input.periodoFin),
          gte(liquidaciones.periodoFin, input.periodoInicio)
        )
      )
      .limit(1);

    if (existente) {
      return {
        ok: false,
        error: "Ya existe una liquidación para este barbero en ese periodo.",
        yaExiste: true,
      };
    }

    const [barbero] = await tx
      .select()
      .from(barberos)
      .where(eq(barberos.id, input.barberoId))
      .limit(1);

    if (!barbero) {
      return { ok: false, error: "Barbero no encontrado." };
    }

    if (barbero.rol === "admin") {
      return { ok: false, error: "Pinky no se liquida como empleado. Elegí un barbero liquidable." };
    }

    const atencionesDelPeriodo = await tx
      .select()
      .from(atenciones)
      .where(
        and(
          eq(atenciones.barberoId, input.barberoId),
          eq(atenciones.anulado, false),
          gte(atenciones.fecha, input.periodoInicio),
          lte(atenciones.fecha, input.periodoFin)
        )
      );

    const totalCortes = atencionesDelPeriodo.length;
    const totalBrutoCortes = atencionesDelPeriodo.reduce(
      (sum, atencion) => sum + Number(atencion.precioCobrado ?? 0),
      0
    );
    const totalComisionCalculada = atencionesDelPeriodo.reduce(
      (sum, atencion) => sum + Number(atencion.comisionBarberoMonto ?? 0),
      0
    );

    const [nuevaLiquidacion] = await tx
      .insert(liquidaciones)
      .values({
        barberoId: input.barberoId,
        periodoInicio: input.periodoInicio,
        periodoFin: input.periodoFin,
        totalCortes,
        totalBrutoCortes: String(totalBrutoCortes.toFixed(2)),
        totalComisionCalculada: String(totalComisionCalculada.toFixed(2)),
        montoAPagar: String(totalComisionCalculada.toFixed(2)),
        pagado: false,
        notas: input.notas?.trim() || null,
      })
      .returning({ id: liquidaciones.id });

    return { ok: true, id: nuevaLiquidacion.id };
  };

  // Si viene una tx externa (p.ej. desde cerrarCaja), ejecutamos el cuerpo
  // directo sobre esa tx en vez de abrir una transacción anidada.
  if (txExterna) {
    return runner(txExterna);
  }

  return db.transaction(runner);
}

export async function marcarLiquidacionPagada(id: string): Promise<MarcarPagadaResult> {
  const hoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(liquidaciones)
      .set({ pagado: true, fechaPago: hoy })
      .where(and(eq(liquidaciones.id, id), eq(liquidaciones.pagado, false)))
      .returning({ id: liquidaciones.id });

    if (updated) {
      return { ok: true };
    }

    const [liquidacion] = await tx
      .select({ id: liquidaciones.id, pagado: liquidaciones.pagado })
      .from(liquidaciones)
      .where(eq(liquidaciones.id, id))
      .limit(1);

    if (!liquidacion) {
      return { ok: false, error: "Liquidación no encontrada." };
    }

    return { ok: false, error: "Esta liquidación ya está marcada como pagada." };
  });
}

export async function generarLiquidacionesDiariasParaFecha(
  input: {
    fecha: string;
    notas?: string | null;
  },
  txExterna?: Tx
) {
  const runner = txExterna ?? db;
  const barberosLiquidables = await runner
    .select({ id: barberos.id })
    .from(barberos)
    .where(and(eq(barberos.activo, true), eq(barberos.rol, "barbero")));

  for (const barbero of barberosLiquidables) {
    const result = await generarLiquidacionDesdeInput(
      {
        barberoId: barbero.id,
        periodoInicio: input.fecha,
        periodoFin: input.fecha,
        notas: input.notas ?? "Generada automáticamente en cierre diario.",
      },
      txExterna
    );

    // Por bandera y no por texto: el texto del error cambió de tildes y esto dejó de reconocerlo.
    if (!result.ok && !result.yaExiste) {
      throw new Error(result.error);
    }
  }
}

export type DiaSinPagar = {
  barberoId: string;
  barberoNombre: string;
  fecha: string;
  cortes: number;
  monto: number;
};

export type PendienteEquipo = {
  total: number;
  porBarbero: { id: string; nombre: string; pendiente: number }[];
  /** Días trabajados que ninguna liquidación cubre: los barberos cobran por día y a mano. */
  diasSinPagar: DiaSinPagar[];
};

/**
 * Lo que falta pagarle al equipo: liquidaciones generadas sin pagar + días trabajados que
 * ninguna liquidación cubre. Antes solo contaba lo primero, y como la liquidación del día
 * se genera al cerrar la caja (que casi nunca se cierra) daba $0 aunque un barbero trabajara.
 */
export async function getPendienteEquipo(): Promise<PendienteEquipo> {
  const equipo = await db
    .select({ id: barberos.id, nombre: barberos.nombre })
    .from(barberos)
    .where(and(eq(barberos.activo, true), eq(barberos.rol, "barbero")));
  if (equipo.length === 0) return { total: 0, porBarbero: [], diasSinPagar: [] };

  const ids = equipo.map((b) => b.id);
  const [dias, liquidacionesEquipo] = await Promise.all([
    db
      .select({
        barberoId: atenciones.barberoId,
        fecha: atenciones.fecha,
        cortes: sql<number>`count(*)::int`,
        monto: sql<string>`coalesce(sum(${atenciones.comisionBarberoMonto}), 0)`,
      })
      .from(atenciones)
      .where(and(inArray(atenciones.barberoId, ids), eq(atenciones.anulado, false)))
      .groupBy(atenciones.barberoId, atenciones.fecha),
    db
      .select({
        barberoId: liquidaciones.barberoId,
        periodoInicio: liquidaciones.periodoInicio,
        periodoFin: liquidaciones.periodoFin,
        pagado: liquidaciones.pagado,
        montoAPagar: liquidaciones.montoAPagar,
      })
      .from(liquidaciones)
      .where(inArray(liquidaciones.barberoId, ids)),
  ]);

  const nombres = new Map(equipo.map((b) => [b.id, b.nombre]));
  const pendientePorBarbero = new Map<string, number>(ids.map((id) => [id, 0]));

  for (const liq of liquidacionesEquipo) {
    if (liq.pagado || !liq.barberoId) continue;
    pendientePorBarbero.set(liq.barberoId, (pendientePorBarbero.get(liq.barberoId) ?? 0) + Number(liq.montoAPagar ?? 0));
  }

  const diasSinPagar: DiaSinPagar[] = [];
  for (const dia of dias) {
    if (!dia.barberoId || !dia.fecha) continue;
    const monto = Number(dia.monto);
    if (monto <= 0) continue;
    const cubierto = liquidacionesEquipo.some(
      (liq) =>
        liq.barberoId === dia.barberoId &&
        liq.periodoInicio != null &&
        liq.periodoFin != null &&
        liq.periodoInicio <= dia.fecha! &&
        dia.fecha! <= liq.periodoFin
    );
    if (cubierto) continue;
    diasSinPagar.push({
      barberoId: dia.barberoId,
      barberoNombre: nombres.get(dia.barberoId) ?? "Barbero",
      fecha: dia.fecha,
      cortes: Number(dia.cortes),
      monto,
    });
    pendientePorBarbero.set(dia.barberoId, (pendientePorBarbero.get(dia.barberoId) ?? 0) + monto);
  }

  diasSinPagar.sort((a, b) => (a.fecha === b.fecha ? a.barberoNombre.localeCompare(b.barberoNombre) : a.fecha < b.fecha ? -1 : 1));
  const porBarbero = equipo
    .map((b) => ({ id: b.id, nombre: b.nombre, pendiente: Math.round((pendientePorBarbero.get(b.id) ?? 0) * 100) / 100 }))
    .filter((row) => row.pendiente > 0)
    .sort((a, b) => b.pendiente - a.pendiente);

  return { total: porBarbero.reduce((sum, row) => sum + row.pendiente, 0), porBarbero, diasSinPagar };
}

/** "Pagado" sobre un día sin liquidar: genera la liquidación de ese día y la marca pagada, todo junto. */
export async function pagarDiaBarbero(barberoId: string, fecha: string): Promise<MarcarPagadaResult> {
  const generada = await generarLiquidacionDesdeInput({
    barberoId,
    periodoInicio: fecha,
    periodoFin: fecha,
    notas: "Pagado a mano desde Liquidaciones.",
  });
  if (!generada.ok) return { ok: false, error: generada.error };
  return marcarLiquidacionPagada(generada.id);
}
