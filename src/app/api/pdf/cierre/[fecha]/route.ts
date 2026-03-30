export const runtime = "nodejs";

import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { cierresCaja } from "@/db/schema";
import { eq } from "drizzle-orm";
import { normalizeCierreResumen } from "@/lib/caja-finance";
import { CierrePDF } from "@/components/pdf/CierrePDF";
import type { CierrePDFData } from "@/components/pdf/CierrePDF";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fecha: string }> }
) {
  const { fecha } = await params;

  // Verificar sesion
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userRole = (session.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";

  // Solo admin puede descargar cierres
  if (!isAdmin) {
    return new Response("Forbidden", { status: 403 });
  }

  // Obtener el cierre
  const [cierre] = await db
    .select()
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fecha))
    .limit(1);

  if (!cierre) {
    return new Response("Not found", { status: 404 });
  }

  const resumen = normalizeCierreResumen({
    resumenBarberos: cierre.resumenBarberos,
    totalNeto: cierre.totalNeto,
    totalProductos: cierre.totalProductos,
  });

  const pdfData: CierrePDFData = {
    fecha,
    totalEfectivo: Number(cierre.totalEfectivo ?? 0),
    totalMp: Number(cierre.totalMp ?? 0),
    totalTransferencia: Number(cierre.totalTransferencia ?? 0),
    totalPosnet: Number(cierre.totalPosnet ?? 0),
    totalBruto: Number(cierre.totalBruto ?? 0),
    totalComisionesMedios: Number(cierre.totalComisionesMedios ?? 0),
    totalNeto: Number(cierre.totalNeto ?? 0),
    totalProductos: Number(cierre.totalProductos ?? 0),
    cajaNetaDia: resumen.totales.cajaNetaDia,
    cajaNetaServicios: resumen.totales.cajaNetaServicios,
    cajaNetaProductos: resumen.totales.cajaNetaProductos,
    aporteEconomicoCasaDia: resumen.totales.aporteEconomicoCasaDia,
    aporteCasaServicios: resumen.totales.aporteCasaServicios,
    margenProductos: resumen.totales.margenProductos,
    alquilerBancoDevengadoDia: resumen.totales.alquilerBancoDevengadoDia,
    barberos: resumen.barberos,
    cantidadAtenciones: cierre.cantidadAtenciones ?? 0,
  };

  // Cast needed: renderToBuffer types require ReactElement<DocumentProps> but our
  // wrapper component renders a <Document> internally — runtime works correctly.
  const element = React.createElement(CierrePDF, { data: pdfData }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;
  const buffer = await renderToBuffer(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cierre-${fecha}.pdf"`,
    },
  });
}
