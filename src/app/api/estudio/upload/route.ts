export const runtime = "nodejs";

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { estudioBlobToken, getEstudioActor } from "@/lib/estudio";
import {
  AUDIO_MAX_BYTES,
  AUDIO_PATHNAME,
  AUDIO_TIPOS,
  PORTADA_MAX_BYTES,
  PORTADA_PATHNAME,
  PORTADA_TIPOS,
} from "@/lib/estudio-reglas";

// Da el permiso para que el navegador suba el archivo directo al Blob privado
// (sin pasar por la función, que corta a 4,5 MB). La fila se crea después con crearTemaAction.
export async function POST(request: Request) {
  if (!(await getEstudioActor())) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return Response.json({ error: "Pedido inválido" }, { status: 400 });
  }

  try {
    const respuesta = await handleUpload({
      body,
      request,
      token: estudioBlobToken(),
      onBeforeGenerateToken: async (pathname) => {
        if (AUDIO_PATHNAME.test(pathname)) {
          return { allowedContentTypes: [...AUDIO_TIPOS], maximumSizeInBytes: AUDIO_MAX_BYTES, addRandomSuffix: false };
        }
        if (PORTADA_PATHNAME.test(pathname)) {
          return { allowedContentTypes: [...PORTADA_TIPOS], maximumSizeInBytes: PORTADA_MAX_BYTES, addRandomSuffix: false };
        }
        throw new Error("Ruta de archivo no permitida");
      },
    });
    return Response.json(respuesta);
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "No se pudo preparar la subida";
    return Response.json({ error: mensaje }, { status: 400 });
  }
}
