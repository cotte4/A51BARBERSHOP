import { db } from "@/db";
import {
  barberos,
  clientProfileEvents,
  clients,
  marcianoBeneficiosUso,
  user,
  visitLogs,
} from "@/db/schema";
import type { ClientProfile, ClientSummary } from "@/lib/types";
import { normalizePhone } from "@/lib/phone";
import { and, asc, desc, eq, exists, ilike, isNotNull, isNull, like, lt, or, sql } from "drizzle-orm";

type SearchActor = {
  isAdmin: boolean;
  barberoId?: string;
};

function getClientVisibilityFilter(actor: SearchActor) {
  if (actor.isAdmin) {
    return undefined;
  }

  if (!actor.barberoId) {
    return sql`false`;
  }

  return or(
    eq(clients.esMarciano, true),
    eq(clients.createdByBarberoId, actor.barberoId),
    exists(
      db
        .select({ id: visitLogs.id })
        .from(visitLogs)
        .where(
          and(
            eq(visitLogs.clientId, clients.id),
            eq(visitLogs.createdByBarberoId, actor.barberoId)
          )
        )
    )
  );
}

export async function searchVisibleClients(
  actor: SearchActor,
  query: string,
  options?: { limit?: number }
): Promise<ClientSummary[]> {
  const trimmedQuery = query.trim();
  const normalizedPhone = normalizePhone(trimmedQuery);
  const filters = [
    getClientVisibilityFilter(actor),
    actor.isAdmin ? undefined : isNull(clients.archivedAt),
    trimmedQuery
      ? or(
          ilike(clients.name, `%${trimmedQuery}%`),
          normalizedPhone ? like(clients.phoneNormalized, `${normalizedPhone}%`) : undefined,
          like(clients.phoneRaw, `%${trimmedQuery}%`)
        )
      : undefined,
  ].filter(Boolean);

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      phoneRaw: clients.phoneRaw,
      avatarUrl: clients.avatarUrl,
      esMarciano: clients.esMarciano,
      archivedAt: clients.archivedAt,
      totalVisits: clients.totalVisits,
      lastVisitAt: clients.lastVisitAt,
      lastVisitBarberoNombre: barberos.nombre,
      lastVisitNote: sql<string | null>`(
        select ${visitLogs.barberNotes}
        from ${visitLogs}
        where ${visitLogs.clientId} = ${clients.id}
        and ${visitLogs.barberNotes} is not null
        order by ${visitLogs.visitedAt} desc
        limit 1
      )`,
    })
    .from(clients)
    .leftJoin(barberos, eq(barberos.id, clients.lastVisitBarberoId))
    .where(and(...filters))
    .orderBy(desc(clients.esMarciano), desc(clients.lastVisitAt), clients.name)
    .limit(options?.limit ?? 20);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phoneRaw: row.phoneRaw,
    avatarUrl: row.avatarUrl,
    esMarciano: row.esMarciano,
    archivedAt: row.archivedAt,
    totalVisits: row.totalVisits ?? 0,
    lastVisitAt: row.lastVisitAt,
    lastVisitBarberoNombre: row.lastVisitBarberoNombre,
    lastVisitNote: row.lastVisitNote,
  }));
}

export async function getClientProfileForActor(
  actor: SearchActor & { userId: string },
  clientId: string
): Promise<ClientProfile | null> {
  const visibility = getClientVisibilityFilter(actor);
  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name,
      phoneRaw: clients.phoneRaw,
      avatarUrl: clients.avatarUrl,
      esMarciano: clients.esMarciano,
      marcianoDesde: clients.marcianoDesde,
      tags: clients.tags,
      preferences: clients.preferences,
      notes: clients.notes,
      createdByUserId: clients.createdByUserId,
      createdByBarberoId: clients.createdByBarberoId,
      totalVisits: clients.totalVisits,
      lastVisitAt: clients.lastVisitAt,
      lastVisitBarberoNombre: barberos.nombre,
      lastVisitNote: sql<string | null>`(
        select ${visitLogs.barberNotes}
        from ${visitLogs}
        where ${visitLogs.clientId} = ${clients.id}
        and ${visitLogs.barberNotes} is not null
        order by ${visitLogs.visitedAt} desc
        limit 1
      )`,
      archivedAt: clients.archivedAt,
    })
    .from(clients)
    .leftJoin(barberos, eq(barberos.id, clients.lastVisitBarberoId))
    .where(
      and(
        eq(clients.id, clientId),
        actor.isAdmin ? undefined : isNull(clients.archivedAt),
        visibility
      )
    )
    .limit(1);

  if (!client) {
    return null;
  }

  const visitFilter = actor.isAdmin
    ? eq(visitLogs.clientId, clientId)
    : and(
        eq(visitLogs.clientId, clientId),
        eq(visitLogs.createdByBarberoId, actor.barberoId ?? "")
      );

  const visits = await db
    .select({
      id: visitLogs.id,
      visitedAt: visitLogs.visitedAt,
      barberNotes: visitLogs.barberNotes,
      tags: visitLogs.tags,
      photoUrls: visitLogs.photoUrls,
      propinaEstrellas: visitLogs.propinaEstrellas,
      authorBarberoName: barberos.nombre,
    })
    .from(visitLogs)
    .leftJoin(barberos, eq(barberos.id, visitLogs.createdByBarberoId))
    .where(visitFilter)
    .orderBy(desc(visitLogs.visitedAt))
    .limit(5);

  const canSeeAudit = actor.isAdmin || client.createdByUserId === actor.userId;
  const auditEvents = canSeeAudit
    ? await db
        .select({
          id: clientProfileEvents.id,
          fieldName: clientProfileEvents.fieldName,
          oldValue: clientProfileEvents.oldValue,
          newValue: clientProfileEvents.newValue,
          createdAt: clientProfileEvents.createdAt,
          changedByName: user.name,
        })
        .from(clientProfileEvents)
        .leftJoin(user, eq(user.id, clientProfileEvents.changedByUserId))
        .where(eq(clientProfileEvents.clientId, clientId))
        .orderBy(desc(clientProfileEvents.createdAt))
        .limit(10)
    : [];

  const mesActual = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const monthKey = mesActual.slice(0, 7);

  const [usage] = client.esMarciano
    ? await db
        .select({
          mes: marcianoBeneficiosUso.mes,
          cortesUsados: marcianoBeneficiosUso.cortesUsados,
          consumicionesUsadas: marcianoBeneficiosUso.consumicionesUsadas,
          sorteosParticipados: marcianoBeneficiosUso.sorteosParticipados,
        })
        .from(marcianoBeneficiosUso)
        .where(
          and(
            eq(marcianoBeneficiosUso.clientId, clientId),
            eq(marcianoBeneficiosUso.mes, monthKey)
          )
        )
        .limit(1)
    : [undefined];

  return {
    id: client.id,
    name: client.name,
    phoneRaw: client.phoneRaw,
    avatarUrl: client.avatarUrl,
    esMarciano: client.esMarciano,
    marcianoDesde: client.marcianoDesde,
    tags: client.tags ?? [],
    preferences: (client.preferences ?? null) as ClientProfile["preferences"],
    notes: client.notes,
    createdByUserId: client.createdByUserId,
    createdByBarberoId: client.createdByBarberoId,
    totalVisits: client.totalVisits ?? 0,
    lastVisitAt: client.lastVisitAt,
    lastVisitBarberoNombre: client.lastVisitBarberoNombre,
    archivedAt: client.archivedAt,
    visits: visits.map((visit) => ({
      id: visit.id,
      visitedAt: visit.visitedAt,
      barberNotes: visit.barberNotes,
      tags: visit.tags ?? [],
      photoUrls: visit.photoUrls ?? [],
      propinaEstrellas: visit.propinaEstrellas ?? 0,
      authorBarberoName: visit.authorBarberoName,
    })),
    auditEvents,
    marcianoUsage: usage ?? null,
  };
}

export async function recalculateClientMetrics(clientId: string): Promise<void> {
  const allVisits = await db
    .select({ visitedAt: visitLogs.visitedAt, createdByBarberoId: visitLogs.createdByBarberoId })
    .from(visitLogs)
    .where(eq(visitLogs.clientId, clientId))
    .orderBy(asc(visitLogs.visitedAt));

  const totalVisits = allVisits.length;

  if (totalVisits === 0) {
    await db
      .update(clients)
      .set({ totalVisits: 0, lastVisitAt: null, lastVisitBarberoId: null, avgDaysBetweenVisits: null, updatedAt: new Date() })
      .where(eq(clients.id, clientId));
    return;
  }

  const lastVisit = allVisits[totalVisits - 1];

  let avgDays: string | null = null;
  if (totalVisits >= 2) {
    let totalGapMs = 0;
    for (let i = 1; i < allVisits.length; i++) {
      totalGapMs += allVisits[i].visitedAt.getTime() - allVisits[i - 1].visitedAt.getTime();
    }
    const avgGapDays = totalGapMs / (totalVisits - 1) / (1000 * 60 * 60 * 24);
    avgDays = avgGapDays.toFixed(2);
  }

  await db
    .update(clients)
    .set({
      totalVisits,
      lastVisitAt: lastVisit.visitedAt,
      lastVisitBarberoId: lastVisit.createdByBarberoId,
      avgDaysBetweenVisits: avgDays,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId));
}

export async function getRetentionCandidates(): Promise<ClientSummary[]> {
  const cutoff = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      phoneRaw: clients.phoneRaw,
      esMarciano: clients.esMarciano,
      archivedAt: clients.archivedAt,
      totalVisits: clients.totalVisits,
      lastVisitAt: clients.lastVisitAt,
      lastVisitBarberoNombre: barberos.nombre,
      lastVisitNote: sql<string | null>`(
        select ${visitLogs.barberNotes}
        from ${visitLogs}
        where ${visitLogs.clientId} = ${clients.id}
        and ${visitLogs.barberNotes} is not null
        order by ${visitLogs.visitedAt} desc
        limit 1
      )`,
    })
    .from(clients)
    .leftJoin(barberos, eq(barberos.id, clients.lastVisitBarberoId))
    .where(
      and(
        eq(clients.esMarciano, true),
        isNull(clients.archivedAt),
        isNotNull(clients.lastVisitAt),
        lt(clients.lastVisitAt, cutoff)
      )
    )
    .orderBy(asc(clients.lastVisitAt))
    .limit(10);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    phoneRaw: row.phoneRaw,
    esMarciano: row.esMarciano,
    archivedAt: row.archivedAt,
    totalVisits: row.totalVisits ?? 0,
    lastVisitAt: row.lastVisitAt,
    lastVisitBarberoNombre: row.lastVisitBarberoNombre,
    lastVisitNote: row.lastVisitNote,
  }));
}
