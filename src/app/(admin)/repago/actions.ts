"use server";

import { auth } from "@/lib/auth";
import { generarCronograma } from "@/lib/amortizacion";
import { db } from "@/db";
import { repagoMemas, repagoMemasCuotas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export type RegistrarCuotaState = {
  error?: string;
  success?: boolean;
};

export async function registrarCuota(
  prevState: RegistrarCuotaState,
  formData: FormData
): Promise<RegistrarCuotaState> {
  void prevState;

  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") {
    return { error: "Solo el administrador puede registrar pagos." };
  }

  const montoPagadoUsdStr = formData.get("montoPagadoUsd") as string;
  const tcDiaStr = formData.get("tcDia") as string;
  const notas = (formData.get("notas") as string)?.trim() || null;

  const montoPagadoUsd = Number(montoPagadoUsdStr);
  const tcDia = Number(tcDiaStr);

  if (!montoPagadoUsdStr || Number.isNaN(montoPagadoUsd) || montoPagadoUsd <= 0) {
    return { error: "El monto pagado debe ser mayor a 0." };
  }
  if (!tcDiaStr || Number.isNaN(tcDia) || tcDia <= 0) {
    return { error: "El tipo de cambio del dia debe ser mayor a 0." };
  }

  const [repago] = await db.select().from(repagoMemas).limit(1);
  if (!repago) {
    return { error: "No hay deuda configurada." };
  }
  if (repago.pagadoCompleto) {
    return { error: "La deuda ya esta cancelada." };
  }

  const deudaUsd = Number(repago.deudaUsd ?? 1500);
  const tasaAnual = Number(repago.tasaAnualUsd ?? 0.1);
  const cantidadCuotas = repago.cantidadCuotasPactadas ?? 12;
  const cuotasPagadas = repago.cuotasPagadas ?? 0;

  const cronograma = generarCronograma(deudaUsd, tasaAnual, cantidadCuotas);

  if (cuotasPagadas >= cantidadCuotas) {
    return { error: "La deuda ya esta cancelada." };
  }

  const cuotaActual = cronograma[cuotasPagadas];
  const saldoPendienteActual = cuotaActual.saldoInicial;
  const interesCuota = saldoPendienteActual * (tasaAnual / 12);

  if (montoPagadoUsd < interesCuota) {
    return {
      error: `El monto no cubre el interes de la cuota (minimo u$d ${interesCuota.toFixed(2)}).`,
    };
  }

  const interesPagado = interesCuota;
  const capitalPagado = montoPagadoUsd - interesPagado;
  const montoPagadoArs = montoPagadoUsd * tcDia;
  const numeroCuota = cuotasPagadas + 1;
  const hoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  try {
    await db.insert(repagoMemasCuotas).values({
      repagoId: repago.id,
      numeroCuota,
      fechaPago: hoy,
      montoPagado: String(montoPagadoArs.toFixed(2)),
      capitalPagado: String(capitalPagado.toFixed(2)),
      interesPagado: String(interesPagado.toFixed(4)),
      tcDia: String(tcDia.toFixed(2)),
      notas,
    });

    const nuevoSaldo = Math.max(0, saldoPendienteActual - capitalPagado);
    const nuevasCuotas = cuotasPagadas + 1;
    const pagadoCompleto = nuevoSaldo <= 0.01;

    await db
      .update(repagoMemas)
      .set({
        cuotasPagadas: nuevasCuotas,
        saldoPendiente: String(nuevoSaldo.toFixed(2)),
        pagadoCompleto,
      })
      .where(eq(repagoMemas.id, repago.id));
  } catch (error) {
    console.error("Error registrando cuota Memas:", error);
    return { error: "No se pudo registrar el pago. Intenta de nuevo." };
  }

  revalidatePath("/repago");
  return { success: true };
}
