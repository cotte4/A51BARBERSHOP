import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { repagoMemas, repagoMemasCuotas } from "@/db/schema";
import { calcularSaldoReal, generarCronograma } from "@/lib/amortizacion";

export type RegistrarCuotaRepagoInput = {
  montoPagadoUsd: number;
  tcDia: number;
  notas?: string | null;
};

export type RegistrarCuotaRepagoResult =
  | { ok: true; cuotaCompletada: boolean; nuevoSaldoUsd: number }
  | {
      ok: false;
      error: string;
    };

/**
 * Registra un pago flexible sobre el plan Memas.
 *
 * Modelo: se puede pagar cualquier monto > 0 ("de a cuanto puedan").
 * Cada pago cubre primero el interés pendiente de la cuota corriente
 * (calculado sobre el saldo al inicio de esa cuota) y el resto amortiza
 * capital. La cuota se marca como pagada cuando su capital objetivo
 * (cronograma alemán) queda cubierto; el excedente amortiza saldo extra.
 * Varias filas en repago_memas_cuotas pueden compartir numeroCuota.
 */
export async function registrarCuotaRepagoMemas(
  input: RegistrarCuotaRepagoInput
): Promise<RegistrarCuotaRepagoResult> {
  if (!Number.isFinite(input.montoPagadoUsd) || input.montoPagadoUsd <= 0) {
    return { ok: false, error: "El monto pagado debe ser mayor a 0." };
  }

  if (!Number.isFinite(input.tcDia) || input.tcDia <= 0) {
    return { ok: false, error: "El tipo de cambio del dia debe ser mayor a 0." };
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('repago-memas'))`);

    const [repago] = await tx.select().from(repagoMemas).limit(1);

    if (!repago) {
      return { ok: false, error: "No hay deuda configurada." };
    }

    if (repago.pagadoCompleto) {
      return { ok: false, error: "La deuda ya esta cancelada." };
    }

    const deudaUsd = Number(repago.deudaUsd ?? 1500);
    const tasaAnual = Number(repago.tasaAnualUsd ?? 0.1);
    const cantidadCuotas = repago.cantidadCuotasPactadas ?? 12;
    const cuotasPagadas = repago.cuotasPagadas ?? 0;

    if (cuotasPagadas >= cantidadCuotas) {
      return {
        ok: false,
        error: "Todas las cuotas pactadas ya fueron registradas. Si quedó saldo, hablalo con Memas.",
      };
    }

    const cronograma = generarCronograma(deudaUsd, tasaAnual, cantidadCuotas);
    const numeroCuota = cuotasPagadas + 1;
    const cuotaActual = cronograma[cuotasPagadas];

    // Saldo real (USD): cache coherente o teórico como fallback
    const saldoPendienteActual = calcularSaldoReal(
      repago.saldoPendiente == null ? null : Number(repago.saldoPendiente),
      deudaUsd,
      cuotaActual.saldoInicial
    );

    // Progreso previo dentro de la cuota corriente (pagos parciales anteriores)
    const [progreso] = await tx
      .select({
        interesAcum: sql<string>`coalesce(sum(${repagoMemasCuotas.interesPagado}), 0)`,
        capitalAcum: sql<string>`coalesce(sum(${repagoMemasCuotas.capitalPagado}), 0)`,
      })
      .from(repagoMemasCuotas)
      .where(
        and(
          eq(repagoMemasCuotas.repagoId, repago.id),
          eq(repagoMemasCuotas.numeroCuota, numeroCuota)
        )
      );

    const interesYaPagado = Number(progreso?.interesAcum ?? 0);
    const capitalYaPagado = Number(progreso?.capitalAcum ?? 0);

    // El interés de la cuota se calcula UNA vez, sobre el saldo al inicio
    // de la cuota (el saldo actual más el capital ya amortizado dentro de ella).
    const saldoInicioCuota = saldoPendienteActual + capitalYaPagado;
    const interesCuotaTotal = saldoInicioCuota * (tasaAnual / 12);
    const interesPendiente = Math.max(0, interesCuotaTotal - interesYaPagado);

    // Pago flexible: primero interés pendiente, el resto amortiza capital.
    const interesPagado = Math.min(input.montoPagadoUsd, interesPendiente);
    const capitalPagado = Math.min(
      input.montoPagadoUsd - interesPagado,
      saldoPendienteActual
    );

    const montoPagadoArs = input.montoPagadoUsd * input.tcDia;
    const hoy = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    });

    await tx.insert(repagoMemasCuotas).values({
      repagoId: repago.id,
      numeroCuota,
      fechaPago: hoy,
      montoPagado: String(montoPagadoArs.toFixed(2)),
      capitalPagado: String(capitalPagado.toFixed(2)),
      interesPagado: String(interesPagado.toFixed(2)),
      tcDia: String(input.tcDia.toFixed(2)),
      notas: input.notas?.trim() || null,
    });

    const nuevoSaldo = Math.max(0, saldoPendienteActual - capitalPagado);
    const pagadoCompleto = nuevoSaldo <= 0.01;

    // La cuota queda completada cuando su capital objetivo está cubierto
    // (o la deuda entera quedó saldada). El capital objetivo se ajusta al
    // saldo real por si hubo sobrepagos previos que adelantaron capital.
    const capitalObjetivo = Math.min(cuotaActual.capital, saldoInicioCuota);
    const cuotaCompletada =
      pagadoCompleto || capitalYaPagado + capitalPagado + 0.01 >= capitalObjetivo;

    await tx
      .update(repagoMemas)
      .set({
        cuotasPagadas: cuotaCompletada ? cuotasPagadas + 1 : cuotasPagadas,
        saldoPendiente: String(nuevoSaldo.toFixed(2)),
        pagadoCompleto,
      })
      .where(eq(repagoMemas.id, repago.id));

    return { ok: true, cuotaCompletada, nuevoSaldoUsd: nuevoSaldo };
  });
}
