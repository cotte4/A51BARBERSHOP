import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  barberShopAssetPayments,
  barberShopAssets,
  capitalMovimientos,
} from "@/db/schema";
import { getAssetFinancials, getPaymentTypeLabel, type HangarAssetPaymentType } from "@/lib/hangar";

export async function createCapitalMovimientoFromHangarPayment(input: {
  assetName: string;
  amount: string;
  date: string;
  paymentType: HangarAssetPaymentType;
  description?: string | null;
}) {
  const baseLabel = getPaymentTypeLabel(input.paymentType);
  const detail = input.description?.trim();
  const description = detail
    ? `${baseLabel} Hangar · ${input.assetName} · ${detail}`
    : `${baseLabel} Hangar · ${input.assetName}`;

  const [created] = await db
    .insert(capitalMovimientos)
    .values({
      fecha: input.date,
      tipo: "inversion_activo",
      monto: input.amount,
      descripcion: description,
    })
    .returning({ id: capitalMovimientos.id });

  return created;
}

export async function isCapitalMovimientoLinkedToHangar(id: string) {
  const payment = await db.query.barberShopAssetPayments.findFirst({
    where: eq(barberShopAssetPayments.capitalMovimientoId, id),
  });

  return Boolean(payment);
}

export async function syncHangarAssetState(assetId: string) {
  const asset = await db.query.barberShopAssets.findFirst({
    where: eq(barberShopAssets.id, assetId),
  });

  if (!asset) {
    return null;
  }

  const payments = await db.query.barberShopAssetPayments.findMany({
    where: eq(barberShopAssetPayments.assetId, assetId),
    orderBy: [asc(barberShopAssetPayments.fecha), asc(barberShopAssetPayments.creadoEn)],
  });

  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.monto ?? 0), 0);
  const financials = getAssetFinancials({
    precioObjetivo: asset.precioObjetivo,
    precioCompra: asset.precioCompra,
    totalPaid,
    paymentCount: payments.length,
    estadoCompra: asset.estadoCompra,
    firstPaymentType: (payments[0]?.tipo as HangarAssetPaymentType | undefined) ?? null,
  });

  const firstPaymentDate = payments[0]?.fecha ?? null;
  const lastPaymentDate = payments.at(-1)?.fecha ?? null;

  await db
    .update(barberShopAssets)
    .set({
      estadoCompra: financials.estadoCompra,
      fechaPrimerPago: firstPaymentDate ?? asset.fechaPrimerPago,
      fechaPagoCompleto: financials.estadoCompra === "pagado" ? lastPaymentDate ?? asset.fechaPagoCompleto : null,
      fechaCompra: asset.fechaCompra ?? firstPaymentDate ?? asset.fechaCompra,
      precioCompra:
        financials.estadoCompra === "pagado" && financials.paid > 0
          ? financials.paid.toFixed(2)
          : asset.precioCompra,
    })
    .where(eq(barberShopAssets.id, assetId));

  return {
    asset,
    payments,
    financials,
  };
}
