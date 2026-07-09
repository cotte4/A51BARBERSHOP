import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { internalSupportIntakes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { isInternalSupportPath, isInternalSupportRole } from "@/lib/internal-support";

type IntakeRequestBody = {
  intakeType?: "feature_request" | "implementation_idea";
  title?: string;
  problem?: string;
  proposal?: string;
  impact?: string;
  urgency?: "baja" | "media" | "alta" | "critica";
  pathname?: string;
};

function redactText(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b\d{6,}\b/g, "[redacted-number]")
    .trim();
}

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id || !isInternalSupportRole(user.role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let body: IntakeRequestBody;
  try {
    body = (await request.json()) as IntakeRequestBody;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const intakeType = body.intakeType;
  const title = redactText(body.title ?? "");
  const problem = redactText(body.problem ?? "");
  const proposal = redactText(body.proposal ?? "");
  const impact = redactText(body.impact ?? "");
  const urgency = body.urgency ?? "media";
  const pathname = (body.pathname ?? "").trim();

  if (!intakeType || !["feature_request", "implementation_idea"].includes(intakeType)) {
    return NextResponse.json({ error: "Tipo de propuesta invalido." }, { status: 400 });
  }
  if (!title || !problem) {
    return NextResponse.json({ error: "Completa titulo y problema." }, { status: 400 });
  }
  if (!isInternalSupportPath(pathname)) {
    return NextResponse.json({ error: "Ruta fuera del alcance interno." }, { status: 403 });
  }
  if (!["baja", "media", "alta", "critica"].includes(urgency)) {
    return NextResponse.json({ error: "Urgencia invalida." }, { status: 400 });
  }

  const [created] = await db
    .insert(internalSupportIntakes)
    .values({
      intakeType,
      title,
      problem,
      proposal: proposal || null,
      impact: impact || null,
      urgency,
      pathname,
      reporterRole: user.role ?? "unknown",
      reporterUserId: user.id,
      updatedAt: new Date(),
    })
    .returning({ id: internalSupportIntakes.id });

  return NextResponse.json({ ok: true, id: created?.id ?? null });
}
