export const runtime = "nodejs";

import { headers } from "next/headers";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

const IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const RECEIPT_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user || (userRole !== "admin" && userRole !== "asesor")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Formato de solicitud invalido." }, { status: 400 });
  }

  const file = formData.get("file");
  const assetId = String(formData.get("assetId") ?? "").trim();
  const kind = String(formData.get("kind") ?? "photo").trim();

  if (!(file instanceof File)) {
    return Response.json({ error: "No se recibio ningun archivo." }, { status: 400 });
  }

  if (!assetId) {
    return Response.json({ error: "Falta el identificador del activo." }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "El archivo supera el limite de 8 MB." },
      { status: 400 }
    );
  }

  const allowedMime = kind === "receipt" ? RECEIPT_MIME : IMAGE_MIME;
  if (!allowedMime.has(file.type)) {
    return Response.json(
      { error: "Tipo de archivo no permitido para este campo." },
      { status: 400 }
    );
  }

  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "application/pdf"
          ? "pdf"
          : "jpg";
  const folder = kind === "receipt" ? "receipts" : "photos";
  const filename = `hangar/${assetId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  try {
    const blob = await put(filename, file, { access: "public" });
    return Response.json({ url: blob.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[hangar-upload] Blob error:", message);
    return Response.json(
      { error: "No se pudo subir el archivo. Intenta de nuevo.", detail: message },
      { status: 500 }
    );
  }
}
