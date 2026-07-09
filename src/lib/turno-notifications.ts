import { eq } from "drizzle-orm";
import { db } from "@/db";
import { barberos, clients, turnoNotificationEvents, turnos } from "@/db/schema";
import { sendTurnoStatusEmail } from "@/lib/email";

type NotificationEventType = "turno_confirmado" | "turno_cancelado";

export async function notifyTurnoStatusChange(input: {
  turnoId: string;
  eventType: NotificationEventType;
  createdByUserId: string;
  motivoCancelacion?: string | null;
}) {
  const [turno] = await db.select().from(turnos).where(eq(turnos.id, input.turnoId)).limit(1);
  if (!turno) return;

  if (!turno.clientId) {
    await db.insert(turnoNotificationEvents).values({
      turnoId: turno.id,
      eventType: input.eventType,
      targetEmail: null,
      providerStatus: "skipped",
      providerMessage: "Turno sin clientId vinculado.",
      createdByUserId: input.createdByUserId,
    });
    return;
  }

  const [client] = await db
    .select({ email: clients.email, name: clients.name })
    .from(clients)
    .where(eq(clients.id, turno.clientId))
    .limit(1);
  const [barbero] = await db.select({ nombre: barberos.nombre }).from(barberos).where(eq(barberos.id, turno.barberoId)).limit(1);

  if (!client?.email) {
    await db.insert(turnoNotificationEvents).values({
      turnoId: turno.id,
      eventType: input.eventType,
      targetEmail: null,
      providerStatus: "skipped",
      providerMessage: "Cliente sin email para notificar.",
      createdByUserId: input.createdByUserId,
    });
    return;
  }

  try {
    await sendTurnoStatusEmail({
      email: client.email,
      clienteNombre: turno.clienteNombre || client.name || "Cliente",
      barberoNombre: barbero?.nombre ?? "Barbero",
      fecha: turno.fecha,
      horaInicio: turno.horaInicio,
      estado: input.eventType === "turno_confirmado" ? "confirmado" : "cancelado",
      motivoCancelacion: input.motivoCancelacion ?? null,
    });

    await db.insert(turnoNotificationEvents).values({
      turnoId: turno.id,
      eventType: input.eventType,
      targetEmail: client.email,
      providerStatus: "sent",
      providerMessage: null,
      createdByUserId: input.createdByUserId,
    });
  } catch (error) {
    await db.insert(turnoNotificationEvents).values({
      turnoId: turno.id,
      eventType: input.eventType,
      targetEmail: client.email,
      providerStatus: "failed",
      providerMessage: error instanceof Error ? error.message : "Error desconocido",
      createdByUserId: input.createdByUserId,
    });
  }
}
