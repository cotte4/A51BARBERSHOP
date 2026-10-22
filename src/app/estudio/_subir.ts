import { upload } from "@vercel/blob/client";
import { AUDIO_MAX_BYTES, pathnameAudio, pathnamePortada } from "@/lib/estudio-reglas";

// Subida directa del navegador al Blob privado. La comparten el formulario y la fila de arrastre.

const HANDLE_UPLOAD_URL = "/api/estudio/upload";
// La portada se achica en el celu: entra siempre en el límite y carga rápido en la pantalla bloqueada.
const PORTADA_LADO = 1024;

export function esMp3(archivo: File) {
  return archivo.type === "audio/mpeg" || /\.mp3$/i.test(archivo.name);
}

/** null si el archivo sirve; si no, el motivo en castellano llano. */
export function problemaConMp3(archivo: File): string | null {
  if (!esMp3(archivo)) return "Tiene que ser un MP3. Exportalo desde FL en MP3 320.";
  if (archivo.size > AUDIO_MAX_BYTES) return "El archivo pesa más de 30 MB. Exportalo en MP3 320.";
  return null;
}

export function leerDuracion(archivo: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(archivo);
    const audio = new Audio();
    const terminar = (valor: number | null) => {
      URL.revokeObjectURL(url);
      resolve(valor);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => terminar(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
    audio.onerror = () => terminar(null);
    audio.src = url;
  });
}

/** Recorta al centro en cuadrado y la pasa a JPEG de 1024 px (también convierte las HEIC del iPhone). */
async function prepararPortada(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const lado = Math.min(imagen.width, imagen.height);
  const destino = Math.min(PORTADA_LADO, lado);
  const canvas = document.createElement("canvas");
  canvas.width = destino;
  canvas.height = destino;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sin canvas");
  ctx.drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, destino, destino);
  imagen.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("sin imagen"))), "image/jpeg", 0.88)
  );
}

export async function subirPortada(archivo: File): Promise<string> {
  const jpeg = await prepararPortada(archivo);
  const pathname = pathnamePortada(crypto.randomUUID(), "image/jpeg");
  await upload(pathname, jpeg, { access: "private", handleUploadUrl: HANDLE_UPLOAD_URL, contentType: "image/jpeg" });
  return pathname;
}

export async function subirAudio(archivo: File, onProgreso: (porcentaje: number) => void): Promise<string> {
  const pathname = pathnameAudio(crypto.randomUUID());
  await upload(pathname, archivo, {
    access: "private",
    handleUploadUrl: HANDLE_UPLOAD_URL,
    contentType: "audio/mpeg",
    onUploadProgress: ({ percentage }) => onProgreso(percentage),
  });
  return pathname;
}
