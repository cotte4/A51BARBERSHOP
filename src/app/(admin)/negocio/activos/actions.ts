"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { barberShopAssetPayments, barberShopAssets } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin-action";
import {
  createCapitalMovimientoFromHangarPayment,
  syncHangarAssetState,
} from "@/lib/hangar-server";
import {
  getPaymentTypeLabel,
  HANGAR_ASSET_ESTADOS_COMPRA,
  HANGAR_ASSET_PAYMENT_TYPES,
  toMoneyNumber,
} from "@/lib/hangar";
import { ASSET_CATEGORIAS, type AssetCategoria } from "./types";

export type AssetFormState = {
  error?: string;
  fieldErrors?: {
    nombre?: string;
    categoria?: string;
    precioObjetivo?: string;
    estadoCompra?: string;
    fechaCompra?: string;
  };
};

export type AssetPaymentFormState = {
  error?: string;
  success?: string;
  fieldErrors?: {
    tipo?: string;
    monto?: string;
    fecha?: string;
  };
};

function getTodayArgentina() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function revalidateHangar(assetId?: string) {
  revalidatePath("/negocio");
  revalidatePath("/negocio/activos");
  revalidatePath("/finanzas");
  if (assetId) {
    revalidatePath(`/negocio/activos/${assetId}`);
  }
}

export async function crearAssetAction(
  prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const isAdmin = await requireAdminSession();
  if (!isAdmin) {
    return { error: "No autorizado" };
  }

  const nombre = (formData.get("nombre") as string | null)?.trim();
  const categoria = (formData.get("categoria") as string | null)?.trim();
  const precioObjetivo = (formData.get("precioObjetivo") as string | null)?.trim();
  const estadoCompra = (formData.get("estadoCompra") as string | null)?.trim() ?? "planificado";
  const fechaCompraInput = (formData.get("fechaCompra") as string | null)?.trim();
  const proveedor = (formData.get("proveedor") as string | null)?.trim() || null;
  const marca = (formData.get("marca") as string | null)?.trim() || null;
  const modelo = (formData.get("modelo") as string | null)?.trim() || null;
  const fotoUrl = (formData.get("fotoUrl") as string | null)?.trim() || null;
  const comprobanteUrl = (formData.get("comprobanteUrl") as string | null)?.trim() || null;
  const notas = (formData.get("notas") as string | null)?.trim() || null;

  const fieldErrors: AssetFormState["fieldErrors"] = {};

  if (!nombre) fieldErrors.nombre = "Carga un nombre.";
  if (!categoria) fieldErrors.categoria = "Elegi una categoria.";
  if (!precioObjetivo || toMoneyNumber(precioObjetivo) <= 0) {
    fieldErrors.precioObjetivo = "Ingresa un monto mayor a 0.";
  }
  if (!ASSET_CATEGORIAS.includes(categoria as AssetCategoria)) {
    fieldErrors.categoria = "Categoria invalida.";
  }
  if (!["planificado", "pagado"].includes(estadoCompra)) {
    fieldErrors.estadoCompra = "El alta nueva arranca como planificado o pagado.";
  }
  if (estadoCompra === "pagado" && !fechaCompraInput) {
    fieldErrors.fechaCompra = "Necesitamos la fecha para registrar la compra directa.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const fechaCompra = fechaCompraInput || null;
  const targetAmount = toMoneyNumber(precioObjetivo).toFixed(2);
  let redirectTo: string | null = null;

  try {
    const [created] = await db
      .insert(barberShopAssets)
      .values({
        nombre: nombre!,
        categoria: categoria as AssetCategoria,
        precioCompra: estadoCompra === "pagado" ? targetAmount : null,
        precioObjetivo: targetAmount,
        fechaCompra,
        proveedor,
        marca,
        modelo,
        fotoUrl,
        comprobanteUrl,
        notas,
        estado: "activo",
        estadoCompra: estadoCompra as (typeof HANGAR_ASSET_ESTADOS_COMPRA)[number],
        fechaPagoCompleto: estadoCompra === "pagado" ? fechaCompra : null,
      })
      .returning({ id: barberShopAssets.id, nombre: barberShopAssets.nombre });

    if (!created) {
      return { error: "No pudimos crear el activo." };
    }

    if (estadoCompra === "pagado") {
      const paymentDate = fechaCompra ?? getTodayArgentina();
      const capitalMovement = await createCapitalMovimientoFromHangarPayment({
        assetName: created.nombre,
        amount: targetAmount,
        date: paymentDate,
        paymentType: "saldo_final",
        description: "Alta directa desde Hangar",
      });

      await db.insert(barberShopAssetPayments).values({
        assetId: created.id,
        capitalMovimientoId: capitalMovement.id,
        tipo: "saldo_final",
        monto: targetAmount,
        fecha: paymentDate,
        descripcion: "Alta directa desde Hangar",
        comprobanteUrl,
      });

      await syncHangarAssetState(created.id);
    }

    revalidateHangar(created.id);
    redirectTo = `/negocio/activos/${created.id}`;
  } catch (error) {
    console.error("[hangar] crearAssetAction", error);
    return { error: "No pudimos guardar el activo. Intenta de nuevo." };
  }

  if (redirectTo) {
    redirect(redirectTo);
  }

  return { error: "No pudimos redirigir al activo nuevo. Intenta de nuevo." };
}

export async function registrarAssetPaymentAction(
  assetId: string,
  prevState: AssetPaymentFormState,
  formData: FormData
): Promise<AssetPaymentFormState> {
  const isAdmin = await requireAdminSession();
  if (!isAdmin) {
    return { error: "No autorizado" };
  }

  const tipo = (formData.get("tipo") as string | null)?.trim();
  const monto = (formData.get("monto") as string | null)?.trim();
  const fecha = (formData.get("fecha") as string | null)?.trim();
  const descripcion = (formData.get("descripcion") as string | null)?.trim() || null;
  const comprobanteUrl = (formData.get("comprobanteUrl") as string | null)?.trim() || null;

  const fieldErrors: AssetPaymentFormState["fieldErrors"] = {};
  if (!tipo || !HANGAR_ASSET_PAYMENT_TYPES.includes(tipo as (typeof HANGAR_ASSET_PAYMENT_TYPES)[number])) {
    fieldErrors.tipo = "Selecciona un tipo de pago.";
  }
  if (!monto || toMoneyNumber(monto) <= 0) {
    fieldErrors.monto = "Ingresa un monto mayor a 0.";
  }
  if (!fecha) {
    fieldErrors.fecha = "Falta la fecha del pago.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    const asset = await db.query.barberShopAssets.findFirst({
      where: eq(barberShopAssets.id, assetId),
    });

    if (!asset) {
      return { error: "No encontramos ese activo." };
    }
    if (asset.estado === "dado_de_baja") {
      return { error: "No se pueden cargar pagos en un activo dado de baja." };
    }

    const amount = toMoneyNumber(monto).toFixed(2);
    const capitalMovement = await createCapitalMovimientoFromHangarPayment({
      assetName: asset.nombre,
      amount,
      date: fecha!,
      paymentType: tipo as (typeof HANGAR_ASSET_PAYMENT_TYPES)[number],
      description: descripcion,
    });

    await db.insert(barberShopAssetPayments).values({
      assetId,
      capitalMovimientoId: capitalMovement.id,
      tipo: tipo as (typeof HANGAR_ASSET_PAYMENT_TYPES)[number],
      monto: amount,
      fecha: fecha!,
      descripcion,
      comprobanteUrl,
    });

    await syncHangarAssetState(assetId);
    revalidateHangar(assetId);

    return {
      success: `${getPaymentTypeLabel(tipo)} registrada en Hangar.`,
    };
  } catch (error) {
    console.error("[hangar] registrarAssetPaymentAction", error);
    return { error: "No pudimos registrar el pago. Intenta de nuevo." };
  }
}

export async function darDeBajaAssetAction(assetId: string) {
  const isAdmin = await requireAdminSession();
  if (!isAdmin) throw new Error("No autorizado");

  await db
    .update(barberShopAssets)
    .set({ estado: "dado_de_baja" })
    .where(eq(barberShopAssets.id, assetId));

  revalidateHangar(assetId);
}
