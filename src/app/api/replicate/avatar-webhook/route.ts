import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { verifyReplicateWebhook } from "@/lib/replicate-webhook-verify";
import { finalizePrediction } from "@/lib/marciano-avatar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyReplicateWebhook(rawBody, request.headers)) {
    return new Response("invalid signature", { status: 401 });
  }

  let payload: { id?: string; status?: string; output?: unknown; error?: string | null };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (!payload.id || !payload.status) {
    return new Response("missing fields", { status: 400 });
  }

  // Find the client associated with this prediction.
  // If none found, the user already reset — respond 200 so Replicate doesn't retry.
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.avatarPredictionId, payload.id))
    .limit(1);

  if (!client) {
    console.log("[webhook] prediction stale (sin cliente asociado):", payload.id);
    return new Response("ok", { status: 200 });
  }

  await finalizePrediction(
    {
      id: payload.id,
      status: payload.status,
      output: payload.output,
      error: payload.error ?? null,
    },
    client.id
  );

  return new Response("ok", { status: 200 });
}
