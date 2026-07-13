"use server";

import { revalidatePath } from "next/cache";
import { getAdminActorContext } from "@/lib/dal/authz";
import { registrarCuotaRepagoMemas } from "@/lib/repago-service";

export type RegistrarCuotaState = {
  error?: string;
  success?: boolean;
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

  try {
    const result = await registrarCuotaRepagoMemas({
      montoIngresado: monto,
      moneda,
      tcDia,
      notas,
    });

    if (!result.ok) return { error: result.error };
  } catch (error) {
    console.error("Error registrando cuota Memas:", error);
    return { error: "No se pudo registrar el pago. Intenta de nuevo." };
  }

  revalidatePath("/repago");
  return { success: true };
}
