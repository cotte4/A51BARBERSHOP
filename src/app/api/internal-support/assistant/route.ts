import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  buildInternalSupportReplyWithModel,
  isInternalSupportPath,
  isInternalSupportRole,
} from "@/lib/internal-support";

export const runtime = "nodejs";

type AssistantRequestBody = {
  message?: string;
  pathname?: string;
};

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string } | undefined)?.role;

  if (!isInternalSupportRole(userRole)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  let body: AssistantRequestBody;
  try {
    body = (await request.json()) as AssistantRequestBody;
  } catch {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const pathname = (body.pathname ?? "").trim();
  const message = (body.message ?? "").trim();

  if (!pathname || !isInternalSupportPath(pathname)) {
    return NextResponse.json({ error: "Ruta fuera del alcance interno." }, { status: 403 });
  }

  if (!message) {
    return NextResponse.json({ error: "Mensaje vacio." }, { status: 400 });
  }

  const result = await buildInternalSupportReplyWithModel({
    pathname,
    role: userRole ?? "unknown",
    message,
  });

  return NextResponse.json(result);
}
