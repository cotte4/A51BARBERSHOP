import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  atenciones,
  atencionesAdicionales,
  barberos,
  cierresCaja,
  mediosPago,
  servicios,
  serviciosAdicionales,
} from "@/db/schema";
import type { QuickActionDefaults } from "@/lib/types";

export type AtencionCreationInput = {
  barberoId: string;
  servicioId: string;
  medioPagoId: string;
  precioCobrado: number;
  adicionalesIds?: string[];
  notas?: string | null;
};

export function getFechaHoyArgentina(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function getHoraAhoraArgentina(): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export async function hasCajaCerradaHoy() {
  const [cierre] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, getFechaHoyArgentina()))
    .limit(1);

  return !!cierre;
}

export async function crearAtencionDesdeInput(input: AtencionCreationInput) {
  const [barbero] = await db.select().from(barberos).where(eq(barberos.id, input.barberoId)).limit(1);
  const [medioPago] = await db
    .select()
    .from(mediosPago)
    .where(eq(mediosPago.id, input.medioPagoId))
    .limit(1);
  const [servicio] = await db
    .select()
    .from(servicios)
    .where(eq(servicios.id, input.servicioId))
    .limit(1);

  if (!barbero) {
    throw new Error("Barbero no encontrado");
  }
  if (!medioPago) {
    throw new Error("Medio de pago no encontrado");
  }
  if (!servicio) {
    throw new Error("Servicio no encontrado");
  }

  const precioCobrado = input.precioCobrado;
  const comisionMpPct = Number(medioPago.comisionPorcentaje ?? 0);
  const comisionMpMonto = (precioCobrado * comisionMpPct) / 100;
  const montoNeto = precioCobrado - comisionMpMonto;
  const comisionBarberoPct = Number(barbero.porcentajeComision ?? 0);
  const comisionBarberoMonto = (precioCobrado * comisionBarberoPct) / 100;

  const [nuevaAtencion] = await db
    .insert(atenciones)
    .values({
      barberoId: input.barberoId,
      servicioId: input.servicioId,
      fecha: getFechaHoyArgentina(),
      hora: getHoraAhoraArgentina(),
      precioBase: servicio.precioBase,
      precioCobrado: String(precioCobrado),
      medioPagoId: input.medioPagoId,
      comisionMedioPagoPct: String(comisionMpPct),
      comisionMedioPagoMonto: String(comisionMpMonto.toFixed(2)),
      montoNeto: String(montoNeto.toFixed(2)),
      comisionBarberoPct: String(comisionBarberoPct),
      comisionBarberoMonto: String(comisionBarberoMonto.toFixed(2)),
      notas: input.notas?.trim() || null,
      anulado: false,
    })
    .returning();

  const adicionalesIds = input.adicionalesIds ?? [];
  if (adicionalesIds.length > 0) {
    const adicionalesData = await db
      .select()
      .from(serviciosAdicionales)
      .where(inArray(serviciosAdicionales.id, adicionalesIds));

    if (adicionalesData.length > 0) {
      await db.insert(atencionesAdicionales).values(
        adicionalesData.map((a) => ({
          atencionId: nuevaAtencion.id,
          adicionalId: a.id,
          precioCobrado: a.precioExtra ?? "0",
        }))
      );
    }
  }

  return nuevaAtencion;
}

export async function getQuickActionDefaultsForBarbero(barberoId: string): Promise<QuickActionDefaults | null> {
  const [barbero] = await db
    .select({
      servicioDefectoId: barberos.servicioDefectoId,
      medioPagoDefectoId: barberos.medioPagoDefectoId,
    })
    .from(barberos)
    .where(eq(barberos.id, barberoId))
    .limit(1);

  if (!barbero?.servicioDefectoId || !barbero.medioPagoDefectoId) {
    return null;
  }

  const [servicio] = await db
    .select({
      id: servicios.id,
      nombre: servicios.nombre,
      precioBase: servicios.precioBase,
    })
    .from(servicios)
    .where(eq(servicios.id, barbero.servicioDefectoId))
    .limit(1);

  const [medioPago] = await db
    .select({
      id: mediosPago.id,
      nombre: mediosPago.nombre,
      comisionPorcentaje: mediosPago.comisionPorcentaje,
    })
    .from(mediosPago)
    .where(eq(mediosPago.id, barbero.medioPagoDefectoId))
    .limit(1);

  if (!servicio || !medioPago || servicio.precioBase === null) {
    return null;
  }

  return {
    servicioId: servicio.id,
    servicioNombre: servicio.nombre,
    precioBase: Number(servicio.precioBase),
    medioPagoId: medioPago.id,
    medioPagoNombre: medioPago.nombre ?? "—",
    comisionMedioPagoPct: Number(medioPago.comisionPorcentaje ?? 0),
  };
}

export async function resolveCajaActorBarberoId(userId: string, isAdmin: boolean) {
  const [barbero] = await db
    .select({ id: barberos.id })
    .from(barberos)
    .where(
      isAdmin
        ? and(eq(barberos.rol, "admin"), eq(barberos.activo, true))
        : and(eq(barberos.userId, userId), eq(barberos.activo, true))
    )
    .limit(1);

  return barbero?.id ?? null;
}
