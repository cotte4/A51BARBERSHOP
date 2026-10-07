import { getDatosPantalla } from "@/lib/torneo-juego";

// Pública: la pantalla del local la consulta cada pocos segundos (sin SSE ni WebSockets,
// incompatibles con Vercel). No incluye email ni WhatsApp.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getDatosPantalla(), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
