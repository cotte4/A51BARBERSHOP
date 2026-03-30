"use server";

import { db } from "@/db";
import {
  barberos,
  clientBriefingCache,
  clientProfileEvents,
  clients,
  marcianoBeneficiosUso,
  visitLogs,
} from "@/db/schema";
import { canAccessClient, getClientActorContext } from "@/lib/client-access";
import { normalizeClientPreferences } from "@/lib/client-preferences";
import { recalculateClientMetrics } from "@/lib/client-queries";
import { MARCIANO_BENEFICIOS } from "@/lib/marciano-config";
import { normalizePhone } from "@/lib/phone";
import { and, eq, ilike, isNull, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ClientFormState = {
  error?: string;
  fieldErrors?: {
    name?: string;
    phoneRaw?: string;
  };
  possibleDuplicates?: Array<{
    id: string;
    name: string;
    phoneRaw: string | null;
  }>;
};

function parseTags(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function stringifyAuditValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.length ? value.join(", ") : null;
  if (typeof value === "object") return JSON.stringify(value);
  const normalized = String(value).trim();
  return normalized || null;
}

async function createAuditEvents(input: {
  clientId: string;
  changedByUserId: string;
  changedByBarberoId?: string;
  changes: Array<{ fieldName: string; oldValue: unknown; newValue: unknown }>;
}) {
  const rows = input.changes
    .map((change) => ({
      clientId: input.clientId,
      fieldName: change.fieldName,
      oldValue: stringifyAuditValue(change.oldValue),
      newValue: stringifyAuditValue(change.newValue),
      changedByUserId: input.changedByUserId,
      changedByBarberoId: input.changedByBarberoId ?? null,
    }))
    .filter((change) => change.oldValue !== change.newValue);

  if (rows.length > 0) {
    await db.insert(clientProfileEvents).values(rows);
  }
}

export async function createClientAction(
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const actor = await getClientActorContext();
  if (!actor) {
    return { error: "Debés iniciar sesión para crear clientes." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phoneRaw") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const confirmDuplicate = String(formData.get("confirmDuplicate") ?? "") === "true";
  const tags = parseTags(formData.get("tags"));
  const preferences = normalizeClientPreferences({
    allergies: formData.get("allergies"),
    productPreferences: formData.get("productPreferences"),
    extraNotes: formData.get("extraNotes"),
  });

  const fieldErrors: ClientFormState["fieldErrors"] = {};
  if (!name) {
    fieldErrors.name = "El nombre es obligatorio.";
  }

  if (!actor.isAdmin && !actor.barberoId) {
    return { error: "Tu usuario no tiene un barbero activo vinculado." };
  }

  const phoneNormalized = normalizePhone(phoneRaw);
  if (phoneRaw && !phoneNormalized) {
    fieldErrors.phoneRaw = "El teléfono no tiene un formato válido.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  if (phoneNormalized) {
    const [existingByPhone] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.phoneNormalized, phoneNormalized))
      .limit(1);

    if (existingByPhone) {
      return {
        fieldErrors: {
          phoneRaw: "Ese teléfono ya pertenece a otro cliente.",
        },
      };
    }
  }

  if (!confirmDuplicate) {
    const possibleDuplicates = await db
      .select({
        id: clients.id,
        name: clients.name,
        phoneRaw: clients.phoneRaw,
      })
      .from(clients)
      .where(and(or(ilike(clients.name, `%${name}%`), ilike(clients.name, `${name}%`)), isNull(clients.archivedAt)))
      .limit(3);

    if (possibleDuplicates.length > 0) {
      return {
        error: "Encontré posibles clientes parecidos. Confirmá si querés crear igual.",
        possibleDuplicates,
      };
    }
  }

  const isMarciano = actor.isAdmin && String(formData.get("esMarciano") ?? "") === "on";

  const [created] = await db
    .insert(clients)
    .values({
      name,
      phoneRaw,
      phoneNormalized,
      esMarciano: isMarciano,
      marcianoDesde: isMarciano ? new Date() : null,
      tags,
      preferences,
      notes,
      createdByUserId: actor.userId,
      createdByBarberoId: actor.barberoId ?? null,
    })
    .returning({ id: clients.id });

  revalidatePath("/clientes");
  redirect(`/clientes/${created.id}`);
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const actor = await getClientActorContext();
  if (!actor) {
    throw new Error("Unauthorized");
  }

  const hasAccess = await canAccessClient(actor, clientId);
  if (!hasAccess) {
    throw new Error("Forbidden");
  }

  const [existing] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!existing) {
    throw new Error("Client not found");
  }

  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phoneRaw") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const tags = parseTags(formData.get("tags"));
  const preferences = normalizeClientPreferences({
    allergies: formData.get("allergies"),
    productPreferences: formData.get("productPreferences"),
    extraNotes: formData.get("extraNotes"),
  });
  const phoneNormalized = normalizePhone(phoneRaw);

  if (!name) {
    throw new Error("El nombre es obligatorio.");
  }

  if (phoneNormalized) {
    const [existingByPhone] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.phoneNormalized, phoneNormalized), ne(clients.id, clientId)))
      .limit(1);

    if (existingByPhone) {
      throw new Error("Ese teléfono ya pertenece a otro cliente.");
    }
  }

  const nextEsMarciano =
    actor.isAdmin ? String(formData.get("esMarciano") ?? "") === "on" : existing.esMarciano;

  await db
    .update(clients)
    .set({
      name,
      phoneRaw,
      phoneNormalized,
      notes,
      tags,
      preferences,
      esMarciano: nextEsMarciano,
      marcianoDesde:
        nextEsMarciano && !existing.esMarciano
          ? new Date()
          : nextEsMarciano
            ? existing.marcianoDesde
            : null,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId));

  await createAuditEvents({
    clientId,
    changedByUserId: actor.userId,
    changedByBarberoId: actor.barberoId,
    changes: [
      { fieldName: "name", oldValue: existing.name, newValue: name },
      { fieldName: "phone_raw", oldValue: existing.phoneRaw, newValue: phoneRaw },
      { fieldName: "notes", oldValue: existing.notes, newValue: notes },
      { fieldName: "tags", oldValue: existing.tags, newValue: tags },
      { fieldName: "preferences", oldValue: existing.preferences, newValue: preferences },
      {
        fieldName: "es_marciano",
        oldValue: existing.esMarciano,
        newValue: nextEsMarciano,
      },
    ],
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
  redirect(`/clientes/${clientId}`);
}

export async function archiveClientAction(clientId: string) {
  const actor = await getClientActorContext();
  if (!actor?.isAdmin) {
    throw new Error("Forbidden");
  }

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) {
    throw new Error("Client not found");
  }

  await db
    .update(clients)
    .set({
      archivedAt: client.archivedAt ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId));

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
}

export async function toggleMarcianoAction(clientId: string) {
  const actor = await getClientActorContext();
  if (!actor?.isAdmin) {
    throw new Error("Forbidden");
  }

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) {
    throw new Error("Client not found");
  }

  await db
    .update(clients)
    .set({
      esMarciano: !client.esMarciano,
      marcianoDesde: client.esMarciano ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId));

  await createAuditEvents({
    clientId,
    changedByUserId: actor.userId,
    changes: [
      {
        fieldName: "es_marciano",
        oldValue: client.esMarciano,
        newValue: !client.esMarciano,
      },
    ],
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clientId}`);
}

// ————————————————————————————
// Visitas
// ————————————————————————————

async function getBarberoIdForUser(userId: string): Promise<string | null> {
  const [barbero] = await db
    .select({ id: barberos.id })
    .from(barberos)
    .where(and(eq(barberos.userId, userId), eq(barberos.activo, true)))
    .limit(1);
  return barbero?.id ?? null;
}

async function invalidateBriefingCache(clientId: string) {
  await db.delete(clientBriefingCache).where(eq(clientBriefingCache.clientId, clientId));
}

export async function createVisitLogAction(
  clientId: string,
  data: {
    barberNotes: string | null;
    tags: string[];
    photoUrls: string[];
    propinaEstrellas: number;
  }
): Promise<{ error: string } | undefined> {
  const actor = await getClientActorContext();
  if (!actor) {
    return { error: "Debés iniciar sesión para registrar visitas." };
  }

  const barberoId = actor.barberoId ?? (await getBarberoIdForUser(actor.userId));
  if (!barberoId) {
    return { error: "No se encontró un barbero activo vinculado a tu usuario." };
  }

  const hasAccess = await canAccessClient(actor, clientId);
  if (!hasAccess) {
    return { error: "No tenés acceso a este cliente." };
  }

  await db.insert(visitLogs).values({
    clientId,
    createdByBarberoId: barberoId,
    createdByUserId: actor.userId,
    barberNotes: data.barberNotes,
    tags: data.tags,
    photoUrls: data.photoUrls,
    propinaEstrellas: data.propinaEstrellas,
  });

  await recalculateClientMetrics(clientId);
  await invalidateBriefingCache(clientId);

  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/clientes");
}

export async function updateVisitLogAction(
  visitId: string,
  data: {
    barberNotes: string | null;
    tags: string[];
    propinaEstrellas: number;
  }
): Promise<{ error: string } | undefined> {
  const actor = await getClientActorContext();
  if (!actor) {
    return { error: "Debés iniciar sesión." };
  }

  const [visit] = await db
    .select({ clientId: visitLogs.clientId, createdByBarberoId: visitLogs.createdByBarberoId })
    .from(visitLogs)
    .where(eq(visitLogs.id, visitId))
    .limit(1);

  if (!visit) {
    return { error: "Visita no encontrada." };
  }

  const canEdit = actor.isAdmin || actor.barberoId === visit.createdByBarberoId;
  if (!canEdit) {
    return { error: "Solo podés editar tus propias visitas." };
  }

  await db
    .update(visitLogs)
    .set({
      barberNotes: data.barberNotes,
      tags: data.tags,
      propinaEstrellas: data.propinaEstrellas,
      updatedAt: new Date(),
    })
    .where(eq(visitLogs.id, visitId));

  await invalidateBriefingCache(visit.clientId);
  revalidatePath(`/clientes/${visit.clientId}`);
}

// ————————————————————————————
// Membresía Marciano
// ————————————————————————————

export async function registrarUsoMarcianoAction(
  clientId: string,
  tipo: "corte" | "consumicion" | "sorteo"
): Promise<{ error: string } | undefined> {
  const actor = await getClientActorContext();
  if (!actor) {
    return { error: "Debés iniciar sesión." };
  }

  const [client] = await db
    .select({ esMarciano: clients.esMarciano })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client?.esMarciano) {
    return { error: "El cliente no es Marciano." };
  }

  const mes = new Date()
    .toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
    .slice(0, 7);

  const [existing] = await db
    .select()
    .from(marcianoBeneficiosUso)
    .where(
      and(eq(marcianoBeneficiosUso.clientId, clientId), eq(marcianoBeneficiosUso.mes, mes))
    )
    .limit(1);

  if (tipo === "corte") {
    const usados = existing?.cortesUsados ?? 0;
    if (usados >= MARCIANO_BENEFICIOS.cortesPorMes) {
      return {
        error: `Ya usó los ${MARCIANO_BENEFICIOS.cortesPorMes} cortes incluidos de este mes.`,
      };
    }
  }

  if (existing) {
    const update =
      tipo === "corte"
        ? { cortesUsados: (existing.cortesUsados ?? 0) + 1, updatedAt: new Date() }
        : tipo === "consumicion"
          ? { consumicionesUsadas: (existing.consumicionesUsadas ?? 0) + 1, updatedAt: new Date() }
          : { sorteosParticipados: (existing.sorteosParticipados ?? 0) + 1, updatedAt: new Date() };

    await db
      .update(marcianoBeneficiosUso)
      .set(update)
      .where(eq(marcianoBeneficiosUso.id, existing.id));
  } else {
    await db.insert(marcianoBeneficiosUso).values({
      clientId,
      mes,
      cortesUsados: tipo === "corte" ? 1 : 0,
      consumicionesUsadas: tipo === "consumicion" ? 1 : 0,
      sorteosParticipados: tipo === "sorteo" ? 1 : 0,
    });
  }

  revalidatePath(`/clientes/${clientId}`);
}
