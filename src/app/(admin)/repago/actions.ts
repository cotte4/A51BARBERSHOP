"use server";

import { db } from "@/db";
import { repagoMemas, repagoMemasCuotas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { generarCronograma } from "@/lib/amortizacion";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegistrarCuotaState = {
  error?: string;
  success?: boolean;
};

export type ActualizarConfigState = {
  error?: string;
  success?: boolean;
};

// ─── registrarCuota ───────────────────────────────────────────────────────────

export async function registrarCuota(
  prevState: RegistrarCuotaState,
  formData: FormData
): Promise<RegistrarCuotaState> {
  // Verificar admin
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") {
    return { error: "Solo el administrador puede registrar pagos." };
  }

  // Leer campos
  const montoPagadoUsdStr = formData.get("montoPagadoUsd") as string;
  const tcDiaStr = formData.get("tcDia") as string;
  const notas = (formData.get("notas") as string)?.trim() || null;

  // Validaciones básicas
  const montoPagadoUsd = Number(montoPagadoUsdStr);
  const tcDia = Number(tcDiaStr);

  if (!montoPagadoUsdStr || isNaN(montoPagadoUsd) || montoPagadoUsd <= 0) {
    return { error: "El monto pagado debe ser mayor a 0." };
  }
  if (!tcDiaStr || isNaN(tcDia) || tcDia <= 0) {
    return { error: "El tipo de cambio del día debe ser mayor a 0." };
  }

  // Obtener repago singleton
  const [repago] = await db.select().from(repagoMemas).limit(1);
  if (!repago) {
    return { error: "No hay deuda configurada." };
  }
  if (repago.pagadoCompleto) {
    return { error: "La deuda ya está cancelada." };
  }

  // Parámetros del acuerdo
  const deudaUsd = Number(repago.deudaUsd ?? 1500);
  const tasaAnual = Number(repago.tasaAnualUsd ?? 0.1);
  const cantidadCuotas = repago.cantidadCuotasPactadas ?? 12;
  const cuotasPagadas = repago.cuotasPagadas ?? 0;

  // Calcular cronograma y obtener cuota siguiente
  const cronograma = generarCronograma(deudaUsd, tasaAnual, cantidadCuotas);

  if (cuotasPagadas >= cantidadCuotas) {
    return { error: "La deuda ya está cancelada." };
  }

  const cuotaActual = cronograma[cuotasPagadas];

  // El saldo pendiente real es el saldoInicial de la cuota actual
  // (más confiable calcularlo desde el cronograma que desde la DB para pagos variables)
  const saldoPendienteActual = cuotaActual.saldoInicial;
  const interesCuota = saldoPendienteActual * (tasaAnual / 12);

  // Validar que el monto cubre el interés
  if (montoPagadoUsd < interesCuota) {
    const interesFormateado = interesCuota.toFixed(2);
    return {
      error: `El monto no cubre el interés de la cuota (mínimo u$d ${interesFormateado}).`,
    };
  }

  // Descomponer: interés se paga primero, el resto es capital
  const interesPagado = interesCuota;
  const capitalPagado = montoPagadoUsd - interesPagado;
  const montoPagadoArs = montoPagadoUsd * tcDia;
  const numeroCuota = cuotasPagadas + 1;

  const hoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  try {
    // INSERT en repagoMemasCuotas
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

    // Calcular nuevo saldo como saldoInicial - capitalPagado
    const nuevoSaldo = Math.max(0, saldoPendienteActual - capitalPagado);
    const nuevasCuotas = cuotasPagadas + 1;
    const pagadoCompleto = nuevoSaldo <= 0.01; // tolerancia de 1 centavo

    // UPDATE repagoMemas
    await db
      .update(repagoMemas)
      .set({
        cuotasPagadas: nuevasCuotas,
        saldoPendiente: String(nuevoSaldo.toFixed(2)),
        pagadoCompleto,
      })
      .where(eq(repagoMemas.id, repago.id));
  } catch (e) {
    console.error("Error registrando cuota Memas:", e);
    return { error: "No se pudo registrar el pago. Intentá de nuevo." };
  }

  revalidatePath("/repago");
  return { success: true };
}

// ─── actualizarConfigMemas ────────────────────────────────────────────────────

export async function actualizarConfigMemas(
  prevState: ActualizarConfigState,
  formData: FormData
): Promise<ActualizarConfigState> {
  // Verificar admin
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") {
    return { error: "Solo el administrador puede modificar la configuración." };
  }

  const [repago] = await db.select().from(repagoMemas).limit(1);
  if (!repago) {
    return { error: "No hay deuda configurada." };
  }

  if ((repago.cuotasPagadas ?? 0) > 0) {
    return { error: "No se puede modificar la configuración si ya hay pagos registrados." };
  }

  const tasaAnualUsdStr = formData.get("tasaAnualUsd") as string;
  const cantidadCuotasPactadasStr = formData.get("cantidadCuotasPactadas") as string;
  const fechaInicio = formData.get("fechaInicio") as string;

  const tasaAnualUsd = Number(tasaAnualUsdStr);
  const cantidadCuotasPactadas = Number(cantidadCuotasPactadasStr);

  if (isNaN(tasaAnualUsd) || tasaAnualUsd <= 0) {
    return { error: "La tasa anual debe ser mayor a 0." };
  }
  if (isNaN(cantidadCuotasPactadas) || cantidadCuotasPactadas < 1) {
    return { error: "La cantidad de cuotas debe ser al menos 1." };
  }
  if (!fechaInicio || !/^\d{4}-\d{2}-\d{2}$/.test(fechaInicio)) {
    return { error: "La fecha de inicio tiene un formato inválido." };
  }

  try {
    await db
      .update(repagoMemas)
      .set({
        tasaAnualUsd: String(tasaAnualUsd.toFixed(4)),
        cantidadCuotasPactadas,
        fechaInicio,
      })
      .where(eq(repagoMemas.id, repago.id));
  } catch (e) {
    console.error("Error actualizando config Memas:", e);
    return { error: "No se pudo guardar la configuración. Intentá de nuevo." };
  }

  revalidatePath("/repago");
  return { success: true };
}
