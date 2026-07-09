import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { internalBugReports } from "@/db/schema";
import { auth } from "@/lib/auth";
import { dispatchBugReportWebhook } from "@/lib/internal-support-delivery";
import {
  isInternalSupportPath,
  isInternalSupportRole,
  INTERNAL_SUPPORT_ALLOWED_ROLES,
} from "@/lib/internal-support";

type BugReportRequestBody = {
  summary?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  severity?: "low" | "medium" | "high" | "critical";
  pathname?: string;
  actionName?: string;
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

  let body: BugReportRequestBody;
  try {
    body = (await request.json()) as BugReportRequestBody;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const summary = redactText(body.summary ?? "");
  const expectedBehavior = redactText(body.expectedBehavior ?? "");
  const actualBehavior = redactText(body.actualBehavior ?? "");
  const pathname = (body.pathname ?? "").trim();
  const actionName = body.actionName?.trim() || null;
  const severity = body.severity ?? "medium";

  if (!summary || !expectedBehavior || !actualBehavior) {
    return NextResponse.json({ error: "Completa resumen, esperado y actual." }, { status: 400 });
  }

  if (!isInternalSupportPath(pathname)) {
    return NextResponse.json({ error: "Ruta fuera del alcance interno." }, { status: 403 });
  }

  if (!["low", "medium", "high", "critical"].includes(severity)) {
    return NextResponse.json({ error: "Severidad invalida." }, { status: 400 });
  }

  const userAgent = requestHeaders.get("user-agent") ?? "";
  const sessionHash = createHash("sha256")
    .update(`${user.id}:${userAgent}`)
    .digest("hex")
    .slice(0, 16);

  const [created] = await db
    .insert(internalBugReports)
    .values({
      summary,
      expectedBehavior,
      actualBehavior,
      severity,
      pathname,
      actionName,
      reporterRole: user.role ?? "unknown",
      reporterUserId: user.id,
      clientVersion: requestHeaders.get("x-app-version"),
      sessionHash,
      metadata: {
        roleAllowlist: INTERNAL_SUPPORT_ALLOWED_ROLES,
        source: "internal-support-widget",
      },
    })
    .returning({
      id: internalBugReports.id,
      severity: internalBugReports.severity,
      status: internalBugReports.status,
      pathname: internalBugReports.pathname,
      summary: internalBugReports.summary,
      expectedBehavior: internalBugReports.expectedBehavior,
      actualBehavior: internalBugReports.actualBehavior,
      reporterRole: internalBugReports.reporterRole,
    });

  if (created?.id) {
    void dispatchBugReportWebhook({
      id: created.id,
      severity: created.severity,
      status: created.status,
      pathname: created.pathname,
      summary: created.summary,
      expectedBehavior: created.expectedBehavior,
      actualBehavior: created.actualBehavior,
      reporterRole: created.reporterRole,
    });
  }

  return NextResponse.json({ ok: true, id: created?.id ?? null });
}
