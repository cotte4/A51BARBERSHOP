export const runtime = "nodejs";

import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { atenciones, barberos, liquidaciones, servicios } from "@/db/schema";
import { eq, and, gte, lte, ne } from "drizzle-orm";
import { LiquidacionPDF } from "@/components/pdf/LiquidacionPDF";
import type { AtencionLiquidacionData, LiquidacionPDFData } from "@/components/pdf/LiquidacionPDF";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verificar sesion
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userRole = (session.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";
  const userId = session.user.id;

  // Obtener la liquidacion
  const [liq] = await db
    .select()
    .from(liquidaciones)
    .where(eq(liquidaciones.id, id))
    .limit(1);

  if (!liq) {
    return new Response("Not found", { status: 404 });
  }

  // Si es barbero, verificar que la liquidacion le pertenece
  if (!isAdmin) {
    const [barberoDelUsuario] = await db
      .select({ id: barberos.id })
      .from(barberos)
      .where(eq(barberos.userId, userId))
      .limit(1);

    if (!barberoDelUsuario || barberoDelUsuario.id !== liq.barberoId) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // Obtener datos del barbero
  const [barbero] = await db
    .select()
    .from(barberos)
    .where(eq(barberos.id, liq.barberoId ?? ""))
    .limit(1);

  // Obtener atenciones del periodo (excluir anuladas)
  const atencionesRows = liq.periodoInicio && liq.periodoFin
    ? await db
        .select({
          fecha: atenciones.fecha,
          notas: atenciones.notas,
          precioCobrado: atenciones.precioCobrado,
          comisionBarberoMonto: atenciones.comisionBarberoMonto,
          servicioId: atenciones.servicioId,
        })
        .from(atenciones)
        .where(
          and(
            eq(atenciones.barberoId, liq.barberoId ?? ""),
            gte(atenciones.fecha, liq.periodoInicio),
            lte(atenciones.fecha, liq.periodoFin),
            ne(atenciones.anulado, true)
          )
        )
    : [];

  // Obtener nombres de servicios (cargar todos y filtrar en memoria — tabla pequeña)
  const serviciosMap = new Map<string, string>();
  const allServicios = await db
    .select({ id: servicios.id, nombre: servicios.nombre })
    .from(servicios);
  for (const s of allServicios) {
    serviciosMap.set(s.id, s.nombre);
  }

  const atencionesValidas = atencionesRows;

  const atencionesData: AtencionLiquidacionData[] = atencionesValidas.map((a) => ({
    fecha: a.fecha,
    servicio: a.servicioId
      ? (serviciosMap.get(a.servicioId) ?? a.notas ?? "Servicio")
      : (a.notas ?? "Servicio"),
    precioCobrado: Number(a.precioCobrado ?? 0),
    comisionBarbero: Number(a.comisionBarberoMonto ?? 0),
  }));

  const comision = Number(liq.totalComisionCalculada ?? 0);
  const sueldoMinimo = Number(liq.sueldoMinimo ?? 0);
  const alquilerBancoCobrado = Number(liq.alquilerBancoCobrado ?? 0);
  const resultadoPeriodo = Number(liq.montoAPagar ?? 0);
  const montoAPagar = Number(liq.montoAPagar ?? 0);

  const hoy = new Date().toISOString().split("T")[0]!;

  const pdfData: LiquidacionPDFData = {
    barberoNombre: barbero?.nombre ?? "Barbero",
    periodoInicio: liq.periodoInicio ?? hoy,
    periodoFin: liq.periodoFin ?? hoy,
    fechaEmision: hoy,
    atenciones: atencionesData,
    totalComisionCalculada: comision,
    sueldoMinimo,
    alquilerBancoCobrado,
    resultadoPeriodo,
    montoAPagar,
  };

  // Cast needed: renderToBuffer types require ReactElement<DocumentProps> but our
  // wrapper component renders a <Document> internally — runtime works correctly.
  const element = React.createElement(LiquidacionPDF, { data: pdfData }) as unknown as React.ReactElement<import("@react-pdf/renderer").DocumentProps>;
  const buffer = await renderToBuffer(element);

  const filename = `liquidacion-${barbero?.nombre?.toLowerCase().replace(/\s+/g, "-") ?? "barbero"}-${liq.periodoInicio ?? id}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
