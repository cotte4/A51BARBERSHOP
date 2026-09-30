"use server";

import { revalidatePath } from "next/cache";
import { getAdminActorContext } from "@/lib/dal/authz";
import { formatUSD } from "@/lib/amortizacion";
import { registrarCuotaRepagoMemas } from "@/lib/repago-service";

export type RegistrarCuotaState = {
  error?: string;
  success?: boolean;
  /** Qué quedó registrado y cuánto falta, para mostrar tras guardar */
  resumen?: string;
};

export async function registrarCuota(
  prevState: RegistrarCuotaState,
  formData: FormData
): Promise<RegistrarCuotaState> {
  void prevState;

  const actor = await getAdminActorContext();
  if (!actor) {
    return { error: "Solo el administrador puede registrar pagos." };
  }

  const montoStr = formData.get("monto") as string;
  const monedaStr = (formData.get("moneda") as string) || "";
  const tcDiaStr = formData.get("tcDia") as string;
  const fechaPago = ((formData.get("fechaPago") as string) || "").trim();
  const notas = (formData.get("notas") as string)?.trim() || null;

  const monto = Number(montoStr);
  const tcDia = Number(tcDiaStr);

  if (!montoStr || Number.isNaN(monto) || monto <= 0) {
    return { error: "El monto pagado debe ser mayor a 0." };
  }
  if (!tcDiaStr || Number.isNaN(tcDia) || tcDia <= 0) {
    return { error: "El tipo de cambio del dia debe ser mayor a 0." };
  }
  if (monedaStr !== "USD" && monedaStr !== "ARS") {
    return { error: "La moneda ingresada no es valida." };
  }
  const moneda: "USD" | "ARS" = monedaStr;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)) {
    return { error: "Elegí la fecha en que se recibió el pago." };
  }

  let resumen: string;
  try {
    const result = await registrarCuotaRepagoMemas({
      montoIngresado: monto,
      moneda,
      tcDia,
      fechaPago,
      notas,
    });

    if (!result.ok) return { error: result.error };
    const [y, m, d] = fechaPago.split("-");
    resumen =
      `Pago de ${formatUSD(result.montoUsd)} del ${d}/${m}/${y} registrado. ` +
      (result.pagadoCompleto
        ? "¡Devolvieron todo el préstamo!"
        : `Faltan devolver ${formatUSD(result.nuevoSaldoUsd)}.`);
  } catch (error) {
    console.error("Error registrando cuota Memas:", error);
    return { error: "No se pudo registrar el pago. Intenta de nuevo." };
  }

  revalidatePath("/repago");
  revalidatePath("/negocio");
  revalidatePath("/dashboard");
  return { success: true, resumen };
}
