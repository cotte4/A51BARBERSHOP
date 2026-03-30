export const runtime = "nodejs";

import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPL } from "@/lib/dashboard-queries";
import { PLPDF } from "@/components/pdf/PLPDF";
import type { PLPDFData } from "@/components/pdf/PLPDF";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mes: string }> }
) {
  const { mes: mesParam } = await params;

  // Solo admin
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  // Parsear mes: espera formato YYYY-MM
  const parts = mesParam.split("-");
  if (parts.length !== 2) {
    return new Response("Formato de mes inválido. Usar YYYY-MM", { status: 400 });
  }
  const anio = parseInt(parts[0]!, 10);
  const mes = parseInt(parts[1]!, 10);

  if (
    isNaN(anio) ||
    isNaN(mes) ||
    mes < 1 ||
    mes > 12 ||
    anio < 2020 ||
    anio > 2100
  ) {
    return new Response("Mes o año fuera de rango", { status: 400 });
  }

  // Obtener datos del P&L
  const pl = await getPL(mes, anio);

  const pdfData: PLPDFData = {
    mes,
    anio,
    ingresosGaboteBruto: pl.ingresosGaboteBruto,
    comisionesGabote: pl.comisionesGabote,
    feesMedioPagoGabote: pl.feesMedioPagoGabote,
    alquilerBancoMes: pl.alquilerBancoMes,
    margenProductosMes: pl.margenProductosMes,
    ingresosCasaGabote: pl.ingresosCasaGabote,
    gastosFijosMes: pl.gastosFijosMes,
    resultadoCasa: pl.resultadoCasa,
    ingresosNetosPinky: pl.ingresosNetosPinky,
    cuotaMemasMes: pl.cuotaMemasMes,
    resultadoPersonalPinky: pl.resultadoPersonalPinky,
  };

  // Cast needed: renderToBuffer types require ReactElement<DocumentProps> but our
  // wrapper component renders a <Document> internally — runtime works correctly.
  const element = React.createElement(PLPDF, { data: pdfData }) as unknown as React.ReactElement<
    import("@react-pdf/renderer").DocumentProps
  >;
  const buffer = await renderToBuffer(element);

  const filename = `pl-${mesParam}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
