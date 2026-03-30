"use server";

import { db } from "@/db";
import { barberos, mediosPago, servicios } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin-action";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const rolesValidos = ["admin", "barbero"] as const;
const tiposModeloValidos = ["variable", "hibrido", "fijo"] as const;

type RolBarbero = (typeof rolesValidos)[number];
type TipoModeloBarbero = (typeof tiposModeloValidos)[number];

function esRolBarbero(value: string): value is RolBarbero {
  return rolesValidos.includes(value as RolBarbero);
}

function esTipoModeloBarbero(value: string): value is TipoModeloBarbero {
  return tiposModeloValidos.includes(value as TipoModeloBarbero);
}

export type BarberoFormState = {
  error?: string;
  fieldErrors?: {
    nombre?: string;
    rol?: string;
    tipoModelo?: string;
    porcentajeComision?: string;
    alquilerBancoMensual?: string;
    sueldoMinimoGarantizado?: string;
    servicioDefectoId?: string;
    medioPagoDefectoId?: string;
  };
};

function validarBarbero(formData: FormData): {
  fieldErrors?: BarberoFormState["fieldErrors"];
  values?: {
    nombre: string;
    rol: RolBarbero;
    tipoModelo: TipoModeloBarbero;
    porcentajeComisionStr: string;
    alquilerBancoStr: string;
    sueldoMinimoStr: string;
    servicioDefectoId: string;
    medioPagoDefectoId: string;
  };
} {
  const nombre = (formData.get("nombre") as string) ?? "";
  const rol = (formData.get("rol") as string) ?? "";
  const tipoModelo = (formData.get("tipoModelo") as string) ?? "";
  const porcentajeComisionStr = (formData.get("porcentajeComision") as string) ?? "";
  const alquilerBancoStr = (formData.get("alquilerBancoMensual") as string) ?? "";
  const sueldoMinimoStr = (formData.get("sueldoMinimoGarantizado") as string) ?? "";
  const servicioDefectoId = (formData.get("servicioDefectoId") as string) ?? "";
  const medioPagoDefectoId = (formData.get("medioPagoDefectoId") as string) ?? "";

  const fieldErrors: BarberoFormState["fieldErrors"] = {};

  if (!nombre.trim()) {
    fieldErrors.nombre = "El nombre es requerido";
  }

  if (!esRolBarbero(rol)) {
    fieldErrors.rol = "El rol es requerido";
  }

  if (!esTipoModeloBarbero(tipoModelo)) {
    fieldErrors.tipoModelo = "El tipo de modelo es requerido";
  }

  if (!porcentajeComisionStr || isNaN(Number(porcentajeComisionStr))) {
    fieldErrors.porcentajeComision = "El porcentaje de comision es requerido";
  } else if (Number(porcentajeComisionStr) < 0 || Number(porcentajeComisionStr) > 100) {
    fieldErrors.porcentajeComision = "Debe ser entre 0 y 100";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const rolTipado = rol as RolBarbero;
  const tipoModeloTipado = tipoModelo as TipoModeloBarbero;

  return {
    values: {
      nombre: nombre.trim(),
      rol: rolTipado,
      tipoModelo: tipoModeloTipado,
      porcentajeComisionStr,
      alquilerBancoStr,
      sueldoMinimoStr,
      servicioDefectoId,
      medioPagoDefectoId,
    },
  };
}

export async function crearBarbero(
  prevState: BarberoFormState,
  formData: FormData
): Promise<BarberoFormState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el administrador puede gestionar barberos." };
  }

  const resultado = validarBarbero(formData);

  if (resultado.fieldErrors) {
    return { fieldErrors: resultado.fieldErrors };
  }

  const {
    nombre,
    rol,
    tipoModelo,
    porcentajeComisionStr,
    alquilerBancoStr,
    sueldoMinimoStr,
    servicioDefectoId,
    medioPagoDefectoId,
  } =
    resultado.values!;

  if (servicioDefectoId) {
    const [servicio] = await db.select({ id: servicios.id }).from(servicios).where(eq(servicios.id, servicioDefectoId)).limit(1);
    if (!servicio) {
      return { fieldErrors: { servicioDefectoId: "Servicio por defecto invÃ¡lido" } };
    }
  }

  if (medioPagoDefectoId) {
    const [medioPago] = await db.select({ id: mediosPago.id }).from(mediosPago).where(eq(mediosPago.id, medioPagoDefectoId)).limit(1);
    if (!medioPago) {
      return { fieldErrors: { medioPagoDefectoId: "Medio de pago por defecto invÃ¡lido" } };
    }
  }

  try {
    await db.insert(barberos).values({
      nombre,
      rol,
      tipoModelo,
      porcentajeComision: porcentajeComisionStr,
      alquilerBancoMensual: alquilerBancoStr !== "" ? alquilerBancoStr : null,
      sueldoMinimoGarantizado: sueldoMinimoStr !== "" ? sueldoMinimoStr : null,
      servicioDefectoId: servicioDefectoId || null,
      medioPagoDefectoId: medioPagoDefectoId || null,
      activo: true,
    });
  } catch {
    return { error: "No se pudo guardar el barbero. Revisa los datos e intenta de nuevo." };
  }

  revalidatePath("/configuracion/barberos");
  redirect("/configuracion/barberos");
}

export async function editarBarbero(
  id: string,
  prevState: BarberoFormState,
  formData: FormData
): Promise<BarberoFormState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el administrador puede gestionar barberos." };
  }

  const resultado = validarBarbero(formData);

  if (resultado.fieldErrors) {
    return { fieldErrors: resultado.fieldErrors };
  }

  const {
    nombre,
    rol,
    tipoModelo,
    porcentajeComisionStr,
    alquilerBancoStr,
    sueldoMinimoStr,
    servicioDefectoId,
    medioPagoDefectoId,
  } =
    resultado.values!;

  if (servicioDefectoId) {
    const [servicio] = await db.select({ id: servicios.id }).from(servicios).where(eq(servicios.id, servicioDefectoId)).limit(1);
    if (!servicio) {
      return { fieldErrors: { servicioDefectoId: "Servicio por defecto invÃ¡lido" } };
    }
  }

  if (medioPagoDefectoId) {
    const [medioPago] = await db.select({ id: mediosPago.id }).from(mediosPago).where(eq(mediosPago.id, medioPagoDefectoId)).limit(1);
    if (!medioPago) {
      return { fieldErrors: { medioPagoDefectoId: "Medio de pago por defecto invÃ¡lido" } };
    }
  }

  try {
    await db
      .update(barberos)
      .set({
        nombre,
        rol,
        tipoModelo,
        porcentajeComision: porcentajeComisionStr,
        alquilerBancoMensual: alquilerBancoStr !== "" ? alquilerBancoStr : null,
        sueldoMinimoGarantizado: sueldoMinimoStr !== "" ? sueldoMinimoStr : null,
        servicioDefectoId: servicioDefectoId || null,
        medioPagoDefectoId: medioPagoDefectoId || null,
      })
      .where(eq(barberos.id, id));
  } catch {
    return { error: "No se pudo actualizar el barbero. Intenta de nuevo." };
  }

  revalidatePath("/configuracion/barberos");
  redirect("/configuracion/barberos");
}

export async function toggleActivoBarbero(id: string, activo: boolean) {
  if (!(await requireAdminSession())) {
    return;
  }

  await db.update(barberos).set({ activo: !activo }).where(eq(barberos.id, id));

  revalidatePath("/configuracion/barberos");
  revalidatePath("/caja/nueva");
  revalidatePath("/liquidaciones/nueva");
}
