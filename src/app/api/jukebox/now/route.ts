import { after } from "next/server";
import { getNowPlaying, listQueue } from "@/lib/jukebox";
import { fotoVigente, leerRuntime } from "@/lib/jukebox-runtime";
import { latidoJukebox } from "@/lib/jukebox-spotify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Lo consultan los celulares del público y las pantallas del local. Cada consulta es también un latido
// de la jukebox (después de responder, para no demorar a nadie): así la cola avanza aunque el celu de
// Pinky esté bloqueado.
export async function GET() {
  const [nowPlaying, queue, runtime] = await Promise.all([getNowPlaying(), listQueue(), leerRuntime()]);
  const upcoming = queue.filter((i) => i.state === "queued").slice(0, 3);

  // Si no suena un tema pedido pero Spotify está pasando la lista del local, se muestra ese.
  const foto = runtime.fuente === "spotify" ? fotoVigente(runtime.foto) : null;
  const lista =
    !nowPlaying && foto?.estado === "sonando" && foto.tema
      ? { titulo: foto.tema.nombre, artistas: foto.tema.artistas, tapa: foto.tema.tapa }
      : null;

  after(() => latidoJukebox());

  return Response.json({ nowPlaying, upcoming, lista }, { headers: { "Cache-Control": "no-store" } });
}
