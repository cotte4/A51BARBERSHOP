import "server-only";

import { and, eq, gte, lte, sql } from "drizzle-orm";
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
  | { ok: false; error: string };

export type MarcarPagadaResult = { ok: true } | { ok: false; error: string };

export async function generarLiquidacionDesdeInput(
  input: GenerarLiquidacionInput
): Promise<GenerarLiquidacionResult> {
  return db.transaction(async (tx) => {
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
        error: "Ya existe una liquidacion para este barbero en ese periodo.",
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
      return { ok: false, error: "Pinky no se liquida como empleado. Elegi un barbero liquidable." };
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
  });
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
      return { ok: false, error: "Liquidacion no encontrada." };
    }

    return { ok: false, error: "Esta liquidacion ya esta marcada como pagada." };
  });
}

export async function generarLiquidacionesDiariasParaFecha(input: {
  fecha: string;
  notas?: string | null;
}) {
  const barberosLiquidables = await db
    .select({ id: barberos.id })
    .from(barberos)
    .where(and(eq(barberos.activo, true), eq(barberos.rol, "barbero")));

  for (const barbero of barberosLiquidables) {
    const result = await generarLiquidacionDesdeInput({
      barberoId: barbero.id,
      periodoInicio: input.fecha,
      periodoFin: input.fecha,
      notas: input.notas ?? "Generada automaticamente en cierre diario.",
    });

    if (!result.ok && !result.error.includes("Ya existe una liquidacion")) {
      throw new Error(result.error);
    }
  }
}
