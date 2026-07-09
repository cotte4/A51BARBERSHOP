import "server-only";

import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  barberos,
  cierresCaja,
  goLiveReadiness,
  liquidaciones,
  mediosPago,
  productos,
  servicios,
  turnosDisponibilidad,
} from "@/db/schema";

export type GoLiveCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

export async function computeGoLiveChecks(): Promise<GoLiveCheck[]> {
  const [
    serviciosActivos,
    barberosActivos,
    mediosPagoActivos,
    productosActivos,
    disponibilidadFutura,
    cierreExistente,
    liquidacionesExistentes,
  ] = await Promise.all([
    db.$count(servicios, eq(servicios.activo, true)),
    db.$count(barberos, and(eq(barberos.activo, true), eq(barberos.rol, "barbero"))),
    db.$count(mediosPago, eq(mediosPago.activo, true)),
    db.$count(productos, eq(productos.activo, true)),
    db.$count(
      turnosDisponibilidad,
      isNotNull(turnosDisponibilidad.fecha)
    ),
    db.$count(cierresCaja),
    db.$count(liquidaciones),
  ]);

  return [
    {
      id: "servicios",
      label: "Servicios activos",
      passed: serviciosActivos > 0,
      detail: `${serviciosActivos} servicios activos`,
    },
    {
      id: "barberos",
      label: "Barberos operativos",
      passed: barberosActivos > 0,
      detail: `${barberosActivos} barberos activos`,
    },
    {
      id: "medios-pago",
      label: "Medios de pago activos",
      passed: mediosPagoActivos > 0,
      detail: `${mediosPagoActivos} medios de pago activos`,
    },
    {
      id: "inventario",
      label: "Productos activos cargados",
      passed: productosActivos > 0,
      detail: `${productosActivos} productos activos`,
    },
    {
      id: "turnos-base",
      label: "Disponibilidad de turnos cargada",
      passed: disponibilidadFutura > 0,
      detail: `${disponibilidadFutura} slots de disponibilidad`,
    },
    {
      id: "flujo-cierre",
      label: "Al menos un cierre de caja registrado",
      passed: cierreExistente > 0,
      detail: `${cierreExistente} cierres`,
    },
    {
      id: "flujo-liquidacion",
      label: "Al menos una liquidacion registrada",
      passed: liquidacionesExistentes > 0,
      detail: `${liquidacionesExistentes} liquidaciones`,
    },
  ];
}

export async function getGoLiveReadinessState() {
  const [row] = await db
    .select()
    .from(goLiveReadiness)
    .where(eq(goLiveReadiness.scope, "default"))
    .limit(1);

  return row ?? null;
}

export async function saveGoLiveSignoff(input: {
  userId: string;
  notes?: string | null;
  checks: GoLiveCheck[];
}) {
  const allPassed = input.checks.every((check) => check.passed);
  if (!allPassed) {
    throw new Error("No se puede firmar go-live con bloqueantes pendientes.");
  }

  await db
    .insert(goLiveReadiness)
    .values({
      scope: "default",
      checklistSnapshot: input.checks as unknown as Record<string, unknown>,
      signedOffAt: new Date(),
      signedOffByUserId: input.userId,
      notes: input.notes?.trim() || null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: goLiveReadiness.scope,
      set: {
        checklistSnapshot: input.checks as unknown as Record<string, unknown>,
        signedOffAt: new Date(),
        signedOffByUserId: input.userId,
        notes: input.notes?.trim() || null,
        updatedAt: new Date(),
      },
    });
}
