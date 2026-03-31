"use server";

import { db } from "@/db";
import { liquidaciones, barberos, atenciones } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type LiquidacionFormState = {
  error?: string;
  fieldErrors?: {
    barberoId?: string;
    periodoInicio?: string;
    periodoFin?: string;
  };
};

export async function generarLiquidacion(
  prevState: LiquidacionFormState,
  formData: FormData
): Promise<LiquidacionFormState> {
  // 1. Verificar admin
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") return { error: "Solo el administrador puede generar liquidaciones." };

  const barberoId = formData.get("barberoId") as string;
  const periodoInicio = formData.get("periodoInicio") as string; // YYYY-MM-DD
  const periodoFin = formData.get("periodoFin") as string;       // YYYY-MM-DD
  const notas = formData.get("notas") as string | null;

  // 2. Validaciones
  const fieldErrors: LiquidacionFormState["fieldErrors"] = {};
  if (!barberoId) fieldErrors.barberoId = "Seleccioná un barbero";
  if (!periodoInicio) fieldErrors.periodoInicio = "La fecha de inicio es requerida";
  if (!periodoFin) fieldErrors.periodoFin = "La fecha de fin es requerida";
  if (periodoInicio && periodoFin && periodoInicio > periodoFin) {
    fieldErrors.periodoFin = "La fecha de fin debe ser posterior al inicio";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    // 3. Verificar que no existe liquidación solapada para este barbero
    const existentes = await db
      .select({ id: liquidaciones.id })
      .from(liquidaciones)
      .where(
        and(
          eq(liquidaciones.barberoId, barberoId),
          lte(liquidaciones.periodoInicio, periodoFin),
          gte(liquidaciones.periodoFin, periodoInicio)
        )
      )
      .limit(1);

    if (existentes.length > 0) {
      return { error: "Ya existe una liquidación para este barbero en ese período." };
    }

    // 4. Obtener datos del barbero
    const [barbero] = await db.select().from(barberos).where(eq(barberos.id, barberoId)).limit(1);
    if (!barbero) return { error: "Barbero no encontrado." };
    if (barbero.rol === "admin") {
      return { error: "Pinky no se liquida como empleado. Elegi un barbero liquidable." };
    }

    // 5. Calcular desde atenciones del período
    const atencionesDelPeriodo = await db
      .select()
      .from(atenciones)
      .where(
        and(
          eq(atenciones.barberoId, barberoId),
          eq(atenciones.anulado, false),
          gte(atenciones.fecha, periodoInicio),
          lte(atenciones.fecha, periodoFin)
        )
      );

    const totalCortes = atencionesDelPeriodo.length;
    const totalBrutoCortes = atencionesDelPeriodo.reduce((s, a) => s + Number(a.precioCobrado ?? 0), 0);
    const totalComisionCalculada = atencionesDelPeriodo.reduce((s, a) => s + Number(a.comisionBarberoMonto ?? 0), 0);

    const montoAPagar = totalComisionCalculada;

    // 6. Insertar liquidación
    const [nuevaLiquidacion] = await db.insert(liquidaciones).values({
      barberoId,
      periodoInicio,
      periodoFin,
      totalCortes,
      totalBrutoCortes: String(totalBrutoCortes.toFixed(2)),
      totalComisionCalculada: String(totalComisionCalculada.toFixed(2)),
      sueldoMinimo: null,
      alquilerBancoCobrado: null,
      montoAPagar: String(montoAPagar.toFixed(2)),
      pagado: false,
      notas: notas?.trim() || null,
    }).returning({ id: liquidaciones.id });

    revalidatePath("/liquidaciones");
    redirect(`/liquidaciones/${nuevaLiquidacion.id}`);
  } catch (e) {
    console.error("Error generando liquidación:", e);
    return { error: "No se pudo generar la liquidación. Intentá de nuevo." };
  }

  // Re-fetch para obtener el id recién insertado
}

export type MarcarPagadaState = { error?: string };

export async function marcarPagada(
  id: string,
  prevState: MarcarPagadaState,
  formData: FormData
): Promise<MarcarPagadaState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") return { error: "Solo el administrador puede marcar liquidaciones como pagadas." };

  try {
    const [liq] = await db.select().from(liquidaciones).where(eq(liquidaciones.id, id)).limit(1);
    if (!liq) return { error: "Liquidación no encontrada." };
    if (liq.pagado) return { error: "Esta liquidación ya está marcada como pagada." };

    const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
    await db.update(liquidaciones).set({ pagado: true, fechaPago: hoy }).where(eq(liquidaciones.id, id));
  } catch (e) {
    console.error("Error marcando liquidación:", e);
    return { error: "No se pudo actualizar. Intentá de nuevo." };
  }

  revalidatePath(`/liquidaciones/${id}`);
  revalidatePath("/liquidaciones");
  return {};
}
