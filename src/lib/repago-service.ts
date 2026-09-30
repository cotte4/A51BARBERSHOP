import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { repagoMemas, repagoMemasCuotas } from "@/db/schema";
import {
  calcularEstadoRepago,
  convertirMontoAUsd,
  formatUSD,
  redondearUsd,
  type EstadoRepago,
  type PagoRepago,
  type PlanRepago,
} from "@/lib/amortizacion";

type RepagoRow = typeof repagoMemas.$inferSelect;
type PagoRow = typeof repagoMemasCuotas.$inferSelect;

export function fechaHoyArgentina(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function planDesdeRepago(repago: RepagoRow): PlanRepago {
  return {
    deudaUsd: Number(repago.deudaUsd ?? 1500),
    tasaAnual: Number(repago.tasaAnualUsd ?? 0.1),
    cantidadCuotas: repago.cantidadCuotasPactadas ?? 12,
  };
}

/**
 * Monto en USD que efectivamente entró con ese pago. Se deriva de lo que la
 * persona entregó (moneda + monto + TC), no del reparto capital/interés
 * guardado, porque ese reparto se recalcula con el modelo vigente.
 */
export function montoUsdDeFila(fila: PagoRow): number {
  const ingresado = Number(fila.montoIngresado);
  const tc = Number(fila.tcDia);
  if (fila.montoIngresado != null && Number.isFinite(ingresado) && ingresado > 0) {
    if (fila.monedaIngresada === "USD") return redondearUsd(ingresado);
    if (Number.isFinite(tc) && tc > 0) return convertirMontoAUsd(ingresado, "ARS", tc);
  }
  // Filas legacy sin monto ingresado: el USD aplicado es capital + interés.
  return redondearUsd(Number(fila.capitalPagado ?? 0) + Number(fila.interesPagado ?? 0));
}

/**
 * Orden canónico de los pagos: por fecha y, dentro del mismo día, por id.
 * El índice de cada fila coincide con `estado.aplicaciones`.
 */
function ordenarFilas(filas: PagoRow[]): PagoRow[] {
  return filas
    .filter((fila) => fila.fechaPago)
    .sort(
      (a, b) =>
        String(a.fechaPago).localeCompare(String(b.fechaPago)) || a.id.localeCompare(b.id)
    );
}

function pagosDesdeFilas(filas: PagoRow[]): PagoRepago[] {
  return filas.map((fila) => ({
    fecha: String(fila.fechaPago).slice(0, 10),
    montoUsd: montoUsdDeFila(fila),
  }));
}

export type EstadoRepagoCompleto = {
  repago: RepagoRow;
  plan: PlanRepago;
  /** Filas en orden canónico — mismo índice que estado.aplicaciones */
  filas: PagoRow[];
  estado: EstadoRepago;
};

/** Carga el repago y lo recalcula entero a la fecha de corte (hoy por defecto). */
export async function getEstadoRepago(
  hasta: string = fechaHoyArgentina()
): Promise<EstadoRepagoCompleto | null> {
  const [repago] = await db.select().from(repagoMemas).limit(1);
  if (!repago) return null;

  const filas = ordenarFilas(
    await db.select().from(repagoMemasCuotas).where(eq(repagoMemasCuotas.repagoId, repago.id))
  );

  const plan = planDesdeRepago(repago);
  return { repago, plan, filas, estado: calcularEstadoRepago(plan, pagosDesdeFilas(filas), hasta) };
}

export type RegistrarCuotaRepagoInput = {
  montoIngresado: number;
  moneda: "USD" | "ARS";
  tcDia: number;
  /** "YYYY-MM-DD" — día en que se recibió la plata */
  fechaPago: string;
  notas?: string | null;
};

export type RegistrarCuotaRepagoResult =
  | { ok: true; pagadoCompleto: boolean; nuevoSaldoUsd: number; montoUsd: number }
  | {
      ok: false;
      error: string;
    };

/**
 * Registra un pago sobre el repago Memas.
 *
 * Modelo: primero el capital (todo el pago baja la deuda) y el interés se
 * acumula aparte (ver `calcularEstadoRepago`). Después de insertar, se
 * recalcula TODO el historial y se reescriben las filas y el cache del
 * repago, para que lo guardado siempre coincida con el cálculo vigente.
 */
export async function registrarCuotaRepagoMemas(
  input: RegistrarCuotaRepagoInput
): Promise<RegistrarCuotaRepagoResult> {
  if (!Number.isFinite(input.montoIngresado) || input.montoIngresado <= 0) {
    return { ok: false, error: "El monto pagado debe ser mayor a 0." };
  }

  if (!Number.isFinite(input.tcDia) || input.tcDia <= 0) {
    return { ok: false, error: "El tipo de cambio del dia debe ser mayor a 0." };
  }

  const hoy = fechaHoyArgentina();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fechaPago)) {
    return { ok: false, error: "La fecha del pago no es valida." };
  }
  if (input.fechaPago > hoy) {
    return { ok: false, error: "La fecha del pago no puede ser futura." };
  }

  const montoPagadoUsd = convertirMontoAUsd(input.montoIngresado, input.moneda, input.tcDia);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('repago-memas'))`);

    const [repago] = await tx.select().from(repagoMemas).limit(1);
    if (!repago) {
      return { ok: false, error: "No hay deuda configurada." };
    }

    const plan = planDesdeRepago(repago);
    const filasPrevias = ordenarFilas(
      await tx.select().from(repagoMemasCuotas).where(eq(repagoMemasCuotas.repagoId, repago.id))
    );
    const pagosPrevios = pagosDesdeFilas(filasPrevias);

    const ultimaFecha = pagosPrevios.at(-1)?.fecha;
    if (ultimaFecha && input.fechaPago < ultimaFecha) {
      return {
        ok: false,
        error: `La fecha no puede ser anterior al último pago cargado (${ultimaFecha}).`,
      };
    }

    const antes = calcularEstadoRepago(plan, pagosPrevios, input.fechaPago);
    if (antes.capitalDevuelto) {
      return { ok: false, error: "Ya devolvieron todo el préstamo." };
    }
    if (montoPagadoUsd > antes.saldoCapital + 0.005) {
      return {
        ok: false,
        error: `El pago (${formatUSD(montoPagadoUsd)}) supera lo que falta devolver (${formatUSD(antes.saldoCapital)}).`,
      };
    }

    const [nuevaFila] = await tx
      .insert(repagoMemasCuotas)
      .values({
        repagoId: repago.id,
        numeroCuota: filasPrevias.length + 1,
        fechaPago: input.fechaPago,
        montoPagado: (montoPagadoUsd * input.tcDia).toFixed(2),
        tcDia: input.tcDia.toFixed(2),
        notas: input.notas?.trim() || null,
        monedaIngresada: input.moneda,
        montoIngresado: input.montoIngresado.toFixed(2),
      })
      .returning();

    const estado = await recalcularYPersistir(tx, repago.id, plan, [...filasPrevias, nuevaFila]);

    return {
      ok: true,
      pagadoCompleto: estado.capitalDevuelto,
      nuevoSaldoUsd: estado.saldoCapital,
      montoUsd: montoPagadoUsd,
    };
  });
}

/**
 * Vuelve a calcular y guardar todo el historial con el modelo vigente, sin
 * agregar pagos. Se usa cuando cambia la regla de cálculo.
 */
export async function recalcularRepagoMemas(): Promise<EstadoRepago | null> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('repago-memas'))`);
    const [repago] = await tx.select().from(repagoMemas).limit(1);
    if (!repago) return null;
    const filas = await tx
      .select()
      .from(repagoMemasCuotas)
      .where(eq(repagoMemasCuotas.repagoId, repago.id));
    return recalcularYPersistir(tx, repago.id, planDesdeRepago(repago), filas);
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Reescribe cada fila y el cache del repago con el cálculo vigente.
 * `capital_pagado` = lo que bajó la deuda; `interes_pagado` = 0 (el interés
 * se acumula aparte, no se cobra de los pagos). `numero_cuota` = número de
 * pago (1, 2, 3…). `pagado_completo` = capital devuelto.
 */
async function recalcularYPersistir(
  tx: Tx,
  repagoId: string,
  plan: PlanRepago,
  filas: PagoRow[]
): Promise<EstadoRepago> {
  const ordenadas = ordenarFilas(filas);
  const pagos = pagosDesdeFilas(ordenadas);
  const estado = calcularEstadoRepago(plan, pagos, pagos.at(-1)?.fecha ?? fechaHoyArgentina());

  for (const [i, fila] of ordenadas.entries()) {
    const aplicacion = estado.aplicaciones[i];
    await tx
      .update(repagoMemasCuotas)
      .set({
        numeroCuota: i + 1,
        capitalPagado: aplicacion.capital.toFixed(2),
        interesPagado: "0.00",
      })
      .where(eq(repagoMemasCuotas.id, fila.id));
  }

  await tx
    .update(repagoMemas)
    .set({
      cuotasPagadas: estado.cuotasCubiertas,
      saldoPendiente: estado.saldoCapital.toFixed(2),
      pagadoCompleto: estado.capitalDevuelto,
    })
    .where(eq(repagoMemas.id, repagoId));

  return estado;
}
