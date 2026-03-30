export const runtime = "nodejs";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { barberos, clientBriefingCache, clients, marcianoBeneficiosUso, visitLogs } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { MARCIANO_BENEFICIOS } from "@/lib/marciano-config";
import Anthropic from "@anthropic-ai/sdk";

const PROMPT_VERSION = "v1";
const MODEL = "claude-haiku-4-5-20251001";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

function buildFallbackBriefing(clientName: string): string {
  return `${clientName} es un cliente registrado en el sistema. Todavía no hay historial de visitas disponible para generar un briefing detallado. Es la primera impresión — buen momento para empezar a construir su ficha.`;
}

function buildPrompt(params: {
  name: string;
  esMarciano: boolean;
  marcianoDesde: Date | null;
  cortesUsados: number;
  cortesPorMes: number;
  tags: string[];
  preferences: Record<string, unknown> | null;
  notes: string | null;
  daysSinceLastVisit: number | null;
  visits: Array<{
    visitedAt: Date;
    barberNotes: string | null;
    tags: string[];
    propinaEstrellas: number;
    authorBarberoName: string | null;
  }>;
}): string {
  const lines: string[] = [
    `Sos un asistente para el equipo de A51 Barber. Escribí un briefing rápido y útil para que el barbero esté al tanto antes de atender a ${params.name}. Tono práctico y humano, como si Pinky le avisara a un compañero. Máximo 2 párrafos. No inventés información que no esté en los datos.`,
    "",
    `Cliente: ${params.name}`,
  ];

  if (params.esMarciano) {
    lines.push(
      `Marciano: sí${params.marcianoDesde ? ` (desde ${formatDate(params.marcianoDesde)})` : ""}`
    );
    lines.push(
      `Beneficios este mes: ${params.cortesUsados}/${params.cortesPorMes} cortes usados`
    );
  }

  if (params.tags.length > 0) {
    lines.push(`Tags del perfil: ${params.tags.join(", ")}`);
  }

  const prefs = params.preferences as Record<string, string> | null;
  if (prefs?.allergies) lines.push(`ALERGIAS (importante): ${prefs.allergies}`);
  if (prefs?.productPreferences) lines.push(`Preferencias de producto: ${prefs.productPreferences}`);
  if (prefs?.extraNotes) lines.push(`Otras preferencias: ${prefs.extraNotes}`);
  if (params.notes) lines.push(`Nota general del equipo: ${params.notes}`);

  if (params.daysSinceLastVisit !== null) {
    lines.push(`Días desde última visita: ${params.daysSinceLastVisit}`);
  } else {
    lines.push("Sin visitas registradas aún.");
  }

  if (params.visits.length > 0) {
    lines.push("", "Últimas visitas visibles:");
    for (const v of params.visits) {
      const parts = [`- ${formatDate(v.visitedAt)}`];
      if (v.authorBarberoName) parts.push(`(por ${v.authorBarberoName})`);
      if (v.tags.length > 0) parts.push(`[${v.tags.join(", ")}]`);
      if (v.propinaEstrellas > 0) parts.push(`${v.propinaEstrellas}★ propina`);
      if (v.barberNotes) parts.push(`"${v.barberNotes}"`);
      lines.push(parts.join(" "));
    }
  }

  lines.push("", "Briefing:");
  return lines.join("\n");
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: clientId } = await context.params;
  const userRole = (session.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";
  const viewerScope: "admin" | "barbero" = isAdmin ? "admin" : "barbero";

  // Load client
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client) {
    return Response.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  if (!client.esMarciano) {
    return Response.json({ error: "El briefing solo está disponible para clientes Marcianos." }, { status: 403 });
  }

  // Resolve viewer barbero id
  let viewerBarberoId: string | null = null;
  if (!isAdmin) {
    const [barbero] = await db
      .select({ id: barberos.id })
      .from(barberos)
      .where(eq(barberos.userId, session.user.id))
      .limit(1);
    viewerBarberoId = barbero?.id ?? null;
  }

  // Load visits visible to this viewer
  const visitFilter = isAdmin
    ? eq(visitLogs.clientId, clientId)
    : and(
        eq(visitLogs.clientId, clientId),
        eq(visitLogs.createdByBarberoId, viewerBarberoId ?? "")
      );

  const visits = await db
    .select({
      id: visitLogs.id,
      visitedAt: visitLogs.visitedAt,
      barberNotes: visitLogs.barberNotes,
      tags: visitLogs.tags,
      propinaEstrellas: visitLogs.propinaEstrellas,
      authorBarberoName: barberos.nombre,
    })
    .from(visitLogs)
    .leftJoin(barberos, eq(barberos.id, visitLogs.createdByBarberoId))
    .where(visitFilter)
    .orderBy(desc(visitLogs.visitedAt))
    .limit(5);

  const lastVisit = visits[0] ?? null;

  // Compute cache key
  const cacheKey = [
    PROMPT_VERSION,
    MODEL,
    client.updatedAt.getTime(),
    lastVisit?.visitedAt?.getTime() ?? 0,
    viewerScope,
    viewerBarberoId ?? "admin",
  ].join(":");

  // Check cache
  const [cached] = await db
    .select()
    .from(clientBriefingCache)
    .where(
      and(
        eq(clientBriefingCache.clientId, clientId),
        eq(clientBriefingCache.viewerScope, viewerScope),
        viewerBarberoId
          ? eq(clientBriefingCache.viewerBarberoId, viewerBarberoId)
          : eq(clientBriefingCache.viewerScope, viewerScope)
      )
    )
    .limit(1);

  const isCacheValid =
    cached &&
    cached.cacheKey === cacheKey &&
    Date.now() - cached.generatedAt.getTime() < CACHE_TTL_MS;

  if (isCacheValid) {
    return Response.json({ briefing: cached.briefingText, cached: true });
  }

  // Load marciano usage for current month
  const mes = new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    .slice(0, 7);

  const [usage] = await db
    .select()
    .from(marcianoBeneficiosUso)
    .where(
      and(
        eq(marcianoBeneficiosUso.clientId, clientId),
        eq(marcianoBeneficiosUso.mes, mes)
      )
    )
    .limit(1);

  // No visits → return fixed summary without calling the model
  if (visits.length === 0) {
    const briefingText = buildFallbackBriefing(client.name);
    await saveBriefingCache({ clientId, viewerScope, viewerBarberoId, cacheKey, briefingText });
    return Response.json({ briefing: briefingText, cached: false });
  }

  const prompt = buildPrompt({
    name: client.name,
    esMarciano: client.esMarciano,
    marcianoDesde: client.marcianoDesde,
    cortesUsados: usage?.cortesUsados ?? 0,
    cortesPorMes: MARCIANO_BENEFICIOS.cortesPorMes,
    tags: client.tags ?? [],
    preferences: client.preferences as Record<string, unknown> | null,
    notes: client.notes,
    daysSinceLastVisit: daysSince(lastVisit?.visitedAt ?? null),
    visits: visits.map((v) => ({
      visitedAt: v.visitedAt,
      barberNotes: v.barberNotes,
      tags: v.tags ?? [],
      propinaEstrellas: v.propinaEstrellas ?? 0,
      authorBarberoName: v.authorBarberoName,
    })),
  });

  let briefingText: string;

  try {
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    briefingText = content.type === "text" ? content.text.trim() : buildFallbackBriefing(client.name);
  } catch {
    // Fallback: build a simple summary from available data without the model
    const parts: string[] = [`${client.name}`];
    if (client.esMarciano) parts.push("es Marciano");
    if (client.tags && client.tags.length > 0) parts.push(`tags: ${client.tags.join(", ")}`);
    if (lastVisit) parts.push(`última visita hace ${daysSince(lastVisit.visitedAt)} días`);
    briefingText = parts.join(", ") + ". (Briefing generado sin IA por error de conexión.)";
  }

  await saveBriefingCache({ clientId, viewerScope, viewerBarberoId, cacheKey, briefingText });

  return Response.json({ briefing: briefingText, cached: false });
}

async function saveBriefingCache(params: {
  clientId: string;
  viewerScope: "admin" | "barbero";
  viewerBarberoId: string | null;
  cacheKey: string;
  briefingText: string;
}) {
  // Upsert: delete existing and insert new
  await db
    .delete(clientBriefingCache)
    .where(
      and(
        eq(clientBriefingCache.clientId, params.clientId),
        eq(clientBriefingCache.viewerScope, params.viewerScope),
        params.viewerBarberoId
          ? eq(clientBriefingCache.viewerBarberoId, params.viewerBarberoId)
          : eq(clientBriefingCache.viewerScope, params.viewerScope)
      )
    );

  await db.insert(clientBriefingCache).values({
    clientId: params.clientId,
    viewerScope: params.viewerScope,
    viewerBarberoId: params.viewerBarberoId,
    cacheKey: params.cacheKey,
    briefingText: params.briefingText,
    generatedAt: new Date(),
  });
}
