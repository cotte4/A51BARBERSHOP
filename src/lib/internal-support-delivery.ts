import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { internalBugDeliveryEvents } from "@/db/schema";

type BugDeliveryPayload = {
  id: string;
  severity: string;
  status: string;
  pathname: string;
  summary: string;
  expectedBehavior: string;
  actualBehavior: string;
  reporterRole: string;
};

export async function dispatchBugReportWebhook(payload: BugDeliveryPayload) {
  const webhookUrl = process.env.INTERNAL_BUG_WEBHOOK_URL;
  if (!webhookUrl) {
    await db.insert(internalBugDeliveryEvents).values({
      bugReportId: payload.id,
      destination: "INTERNAL_BUG_WEBHOOK_URL",
      status: "skipped",
      responseBody: "Webhook no configurado.",
    });
    return;
  }

  const existingSent = await db
    .select({ id: internalBugDeliveryEvents.id })
    .from(internalBugDeliveryEvents)
    .where(
      and(
        eq(internalBugDeliveryEvents.bugReportId, payload.id),
        eq(internalBugDeliveryEvents.destination, webhookUrl),
        eq(internalBugDeliveryEvents.status, "sent")
      )
    )
    .limit(1);

  if (existingSent.length > 0) {
    await db.insert(internalBugDeliveryEvents).values({
      bugReportId: payload.id,
      destination: webhookUrl,
      status: "skipped",
      responseBody: "Entrega omitida por deduplicacion.",
    });
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.text().catch(() => "");
    await db.insert(internalBugDeliveryEvents).values({
      bugReportId: payload.id,
      destination: webhookUrl,
      status: response.ok ? "sent" : "failed",
      responseCode: response.status,
      responseBody: body.slice(0, 1000),
    });
  } catch (error) {
    await db.insert(internalBugDeliveryEvents).values({
      bugReportId: payload.id,
      destination: webhookUrl,
      status: "failed",
      responseBody: error instanceof Error ? error.message : "Error desconocido",
    });
  }
}
