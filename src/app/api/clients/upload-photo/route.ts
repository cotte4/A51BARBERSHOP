export const runtime = "nodejs";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Formato de solicitud invalido." }, { status: 400 });
  }

  const file = formData.get("file");
  const clientId = String(formData.get("clientId") ?? "").trim();
  const kind = String(formData.get("kind") ?? "visit").trim();

  if (!(file instanceof File)) {
    return Response.json({ error: "No se recibio ningun archivo." }, { status: 400 });
  }

  if (!clientId) {
    return Response.json({ error: "Falta el ID del cliente." }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return Response.json(
      { error: "Tipo de archivo no permitido. Usa JPG, PNG o WebP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "El archivo supera el limite de 5 MB." },
      { status: 400 }
    );
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const folder = kind === "avatar" ? "avatar" : "visits";
  const filename = `clients/${clientId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const blob = await put(filename, file, { access: "public" });
    return Response.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[upload-photo] Blob error:", message);
    return Response.json(
      { error: "No se pudo subir la foto. Intenta de nuevo.", detail: message },
      { status: 500 }
    );
  }
}
