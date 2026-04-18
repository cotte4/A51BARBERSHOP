import crypto from "node:crypto";

// svix signature scheme used by Replicate:
// HMAC-SHA256 over `${webhookId}.${timestamp}.${rawBody}`, base64-encoded.
// The header may contain multiple signatures separated by spaces (key rotation).
export function verifyReplicateWebhook(
  rawBody: string,
  headers: Headers
): boolean {
  const secret = process.env.REPLICATE_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    console.error("[webhook] REPLICATE_WEBHOOK_SIGNING_SECRET no configurado");
    return false;
  }

  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !sigHeader) return false;

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) {
    console.warn("[webhook] timestamp fuera de rango:", timestamp);
    return false;
  }

  // Secret format: `whsec_<base64>` — strip the prefix and decode
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");

  // Header format: "v1,sig1 v1,sig2"
  const sigs = sigHeader
    .split(" ")
    .map((s) => s.split(",")[1])
    .filter(Boolean);

  return sigs.some((s) => safeEquals(s, expected));
}

function safeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
