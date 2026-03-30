"use server";

import { db } from "@/db";
import { gastos } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin-action";
import {
  GASTO_RAPIDO_EMOJIS,
  getCategoriaGastoRapidoByEmoji,
  hasGastosRapidosSchema,
} from "@/lib/gastos-rapidos";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type GastoRapidoActionState = {
  error?: string;
  fieldErrors?: {
    categoriaVisual?: string;
    monto?: string;
    nota?: string;
  };
};

const gastoRapidoSchema = z.object({
  categoriaVisual: z
    .string()
    .min(1, "Elegi una categoria")
    .refine((value) => GASTO_RAPIDO_EMOJIS.has(value), "Categoria invalida"),
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  nota: z.string().trim().max(160, "La nota no puede superar 160 caracteres").optional(),
  returnTo: z.string().default("/gastos-rapidos"),
});

function getFechaHoyArgentina(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function sanitizeReturnTo(value: string) {
  return value.startsWith("/") ? value : "/gastos-rapidos";
}

function revalidateGastosRapidos() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/flujo");
  revalidatePath("/dashboard/pl");
  revalidatePath("/mi-resultado");
  revalidatePath("/gastos-rapidos");
  revalidatePath("/caja");
}

export async function registrarGastoRapidoAction(
  prevState: GastoRapidoActionState,
  formData: FormData
): Promise<GastoRapidoActionState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el admin puede registrar gastos rapidos." };
  }

  if (!(await hasGastosRapidosSchema())) {
    return {
      error: "Falta aplicar la migracion de Phase 6. Corre db:push antes de registrar gastos rapidos.",
    };
  }

  const parsed = gastoRapidoSchema.safeParse({
    categoriaVisual: formData.get("categoriaVisual"),
    monto: formData.get("monto"),
    nota: formData.get("nota"),
    returnTo: formData.get("returnTo"),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        categoriaVisual: fieldErrors.categoriaVisual?.[0],
        monto: fieldErrors.monto?.[0],
        nota: fieldErrors.nota?.[0],
      },
    };
  }

  const { categoriaVisual, monto, nota, returnTo } = parsed.data;
  const categoria = getCategoriaGastoRapidoByEmoji(categoriaVisual);

  if (!categoria) {
    return { fieldErrors: { categoriaVisual: "Categoria invalida" } };
  }

  await db.insert(gastos).values({
    descripcion: categoria.label,
    monto: String(monto),
    fecha: getFechaHoyArgentina(),
    tipo: "rapido",
    categoriaVisual,
    esRecurrente: false,
    frecuencia: null,
    notas: nota?.trim() ? nota.trim() : null,
  });

  revalidateGastosRapidos();
  redirect(sanitizeReturnTo(returnTo));
}

export async function eliminarGastoRapidoAction(
  gastoId: string,
  returnTo = "/gastos-rapidos"
): Promise<void> {
  if (!(await requireAdminSession())) {
    redirect("/dashboard");
  }

  if (!(await hasGastosRapidosSchema())) {
    redirect(sanitizeReturnTo(returnTo));
  }

  await db
    .delete(gastos)
    .where(and(eq(gastos.id, gastoId), eq(gastos.tipo, "rapido")));

  revalidateGastosRapidos();
  redirect(sanitizeReturnTo(returnTo));
}
