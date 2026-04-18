import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { barberos, clients, marcianoBeneficiosUso, productos, servicios, visitLogs } from "@/db/schema";
import { MARCIANO_BENEFICIOS } from "@/lib/marciano-config";

export function normalizeMarcianoEmail(value: FormDataEntryValue | null): string | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
}

export async function getMarcianoPortalSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;

  return {
    session,
    role,
    isMarciano: role === "marciano",
  };
}

export async function requireMarcianoClient() {
  const { session, isMarciano, role } = await getMarcianoPortalSession();

  if (!session?.user?.id) {
    redirect("/marciano/login");
  }

  if (!isMarciano) {
    redirect(role === "admin" || role === "barbero" ? "/hoy" : "/marciano/login");
  }

  const monthKey = new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    .slice(0, 7);

  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phoneRaw: clients.phoneRaw,
      avatarUrl: clients.avatarUrl,
      esMarciano: clients.esMarciano,
      marcianoDesde: clients.marcianoDesde,
      tags: clients.tags,
      preferences: clients.preferences,
      totalVisits: clients.totalVisits,
      lastVisitAt: clients.lastVisitAt,
      archivedAt: clients.archivedAt,
      styleCompletedAt: clients.styleCompletedAt,
      styleProfile: clients.styleProfile,
      faceShape: clients.faceShape,
      favoriteColor: clients.favoriteColor,
      avatarStatus: clients.avatarStatus,
      avatarPredictionId: clients.avatarPredictionId,
      avatarRequestedAt: clients.avatarRequestedAt,
      avatarErrorMessage: clients.avatarErrorMessage,
      usageMes: marcianoBeneficiosUso.mes,
      cortesUsados: marcianoBeneficiosUso.cortesUsados,
      consumicionesUsadas: marcianoBeneficiosUso.consumicionesUsadas,
      sorteosParticipados: marcianoBeneficiosUso.sorteosParticipados,
    })
    .from(clients)
    .leftJoin(
      marcianoBeneficiosUso,
      and(eq(marcianoBeneficiosUso.clientId, clients.id), eq(marcianoBeneficiosUso.mes, monthKey))
    )
    .where(and(eq(clients.userId, session.user.id), eq(clients.esMarciano, true), isNull(clients.archivedAt)))
    .limit(1);

  if (!client) {
    redirect("/marciano/login");
  }

  return {
    session,
    client: {
      ...client,
      usage: client.usageMes
        ? {
            mes: client.usageMes,
            cortesUsados: client.cortesUsados ?? 0,
            consumicionesUsadas: client.consumicionesUsadas ?? 0,
            sorteosParticipados: client.sorteosParticipados ?? 0,
          }
        : {
            mes: monthKey,
            cortesUsados: 0,
            consumicionesUsadas: 0,
            sorteosParticipados: 0,
          },
    },
  };
}

export async function getMarcianoDashboardData(userId: string) {
  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phoneRaw: clients.phoneRaw,
      avatarUrl: clients.avatarUrl,
      marcianoDesde: clients.marcianoDesde,
      tags: clients.tags,
      preferences: clients.preferences,
      totalVisits: clients.totalVisits,
      lastVisitAt: clients.lastVisitAt,
      styleCompletedAt: clients.styleCompletedAt,
      favoriteColor: clients.favoriteColor,
      avatarStatus: clients.avatarStatus,
      avatarErrorMessage: clients.avatarErrorMessage,
    })
    .from(clients)
    .where(and(eq(clients.userId, userId), eq(clients.esMarciano, true), isNull(clients.archivedAt)))
    .limit(1);

  if (!client) {
    return null;
  }

  const monthKey = new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    .slice(0, 7);

  const [usage, visits, serviceRows, productRows] = await Promise.all([
    db
      .select({
        mes: marcianoBeneficiosUso.mes,
        cortesUsados: marcianoBeneficiosUso.cortesUsados,
        consumicionesUsadas: marcianoBeneficiosUso.consumicionesUsadas,
        sorteosParticipados: marcianoBeneficiosUso.sorteosParticipados,
      })
      .from(marcianoBeneficiosUso)
      .where(
        and(eq(marcianoBeneficiosUso.clientId, client.id), eq(marcianoBeneficiosUso.mes, monthKey))
      )
      .limit(1),
    db
      .select({
        id: visitLogs.id,
        visitedAt: visitLogs.visitedAt,
        barberoNombre: barberos.nombre,
        photoUrls: visitLogs.photoUrls,
        corteNombre: visitLogs.corteNombre,
        tags: visitLogs.tags,
      })
      .from(visitLogs)
      .leftJoin(barberos, eq(barberos.id, visitLogs.createdByBarberoId))
      .where(eq(visitLogs.clientId, client.id))
      .orderBy(desc(visitLogs.visitedAt))
      .limit(6),
    db
      .select({
        id: servicios.id,
        nombre: servicios.nombre,
        precioBase: servicios.precioBase,
        duracionMinutos: servicios.duracionMinutos,
      })
      .from(servicios)
      .where(eq(servicios.activo, true))
      .orderBy(asc(servicios.nombre)),
    db
      .select({
        id: productos.id,
        nombre: productos.nombre,
        precioVenta: productos.precioVenta,
        esConsumicion: productos.esConsumicion,
      })
      .from(productos)
      .where(eq(productos.activo, true))
      .orderBy(asc(productos.nombre)),
  ]);

  const usageSummary = usage[0] ?? {
    mes: monthKey,
    cortesUsados: 0,
    consumicionesUsadas: 0,
    sorteosParticipados: 0,
  };

  const consumicionesIncluidas = productRows.filter((item) => item.esConsumicion);
  const productosCatalogo = productRows.filter((item) => !item.esConsumicion);

  return {
    client,
    usage: {
      ...usageSummary,
      cortesRestantes:
        MARCIANO_BENEFICIOS.cortesPorMes === null
          ? null
          : Math.max(MARCIANO_BENEFICIOS.cortesPorMes - usageSummary.cortesUsados, 0),
      consumicionesRestantes:
        MARCIANO_BENEFICIOS.consumicionesPorMes === null
          ? null
          : Math.max(
              MARCIANO_BENEFICIOS.consumicionesPorMes - usageSummary.consumicionesUsadas,
              0
            ),
    },
    visits,
    services: serviceRows,
    consumicionesIncluidas,
    productosCatalogo,
  };
}
