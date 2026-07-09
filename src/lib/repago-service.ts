import "server-only";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { repagoMemas, repagoMemasCuotas } from "@/db/schema";
import { calcularSaldoReal, generarCronograma } from "@/lib/amortizacion";

export type RegistrarCuotaRepagoInput = {
  montoPagadoUsd: number;
  tcDia: number;
  notas?: string | null;
};

export type RegistrarCuotaRepagoResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

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
    const cuotaActual = cronograma[cuotasPagadas];
    // Saldo real (USD): cache coherente o teórico como fallback (ver calcularSaldoReal)
    const saldoPendienteActual = calcularSaldoReal(
      repago.saldoPendiente == null ? null : Number(repago.saldoPendiente),
      deudaUsd,
      cuotaActual.saldoInicial
    );
    const interesCuota = saldoPendienteActual * (tasaAnual / 12);
    // Pago mínimo = cuota completa (capital fijo + interés). Sin pagos parciales:
    // un pago parcial marcaría la cuota como pagada y dejaría el plan inconsistente.
    const capitalRequerido = Math.min(cuotaActual.capital, saldoPendienteActual);
    const cuotaMinima = capitalRequerido + interesCuota;

    if (input.montoPagadoUsd + 0.01 < cuotaMinima) {
      return {
        ok: false,
        error: `El pago mínimo es la cuota completa: u$d ${cuotaMinima.toFixed(2)}. No se aceptan pagos parciales.`,
      };
    }

    const interesPagado = interesCuota;
    // Sobrepago amortiza capital extra, con tope en el saldo real
    const capitalPagado = Math.min(input.montoPagadoUsd - interesPagado, saldoPendienteActual);
    const montoPagadoArs = input.montoPagadoUsd * input.tcDia;
    const numeroCuota = cuotasPagadas + 1;
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
    const nuevasCuotas = cuotasPagadas + 1;
    const pagadoCompleto = nuevoSaldo <= 0.01;

    await tx
      .update(repagoMemas)
      .set({
        cuotasPagadas: nuevasCuotas,
        saldoPendiente: String(nuevoSaldo.toFixed(2)),
        pagadoCompleto,
      })
      .where(eq(repagoMemas.id, repago.id));

    return { ok: true };
  });
}
