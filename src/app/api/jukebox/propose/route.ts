import { after } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jukeboxProposals } from "@/db/schema";
import {
  buildProposerHash,
  canProposeAgain,
  enqueueApproved,
  getClientIp,
  hashDeviceKey,
  isAutoApproveEnabled,
  isGlobalCapReached,
  isIpWithinLimit,
  isJukeboxEnabled,
  waitingBlock,
} from "@/lib/jukebox";
import { fotoVigente, leerRuntime } from "@/lib/jukebox-runtime";
import { latidoJukebox } from "@/lib/jukebox-spotify";
import { DURACION_MAXIMA_SEGUNDOS, esIdDeSpotify, temaDelCatalogo } from "@/lib/spotify-catalogo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Distinto del candado de la cola: este solo ordena las altas del público entre sí.
const PROPOSE_LOCK_ID = 51_000_002;

const proposeSchema = z.object({
  trackId: z.string().trim().refine(esIdDeSpotify),
  // El nombre es opcional: la gente busca, toca y listo. Si lo pone, Pinky ve quién lo pidió.
  proposerName: z.string().trim().max(40).optional().default(""),
  deviceKey: z.string().trim().min(8).max(256),
});

export async function POST(request: Request) {
  if (!(await isJukeboxEnabled())) {
    return Response.json({ error: "El jukebox está desactivado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = proposeSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { trackId, proposerName, deviceKey } = parsed.data;

  // Primero lo que no necesita candado: verificar el tema contra Spotify (no confiamos en título,
  // duración ni tapa del cliente).
  let tema: Awaited<ReturnType<typeof temaDelCatalogo>>;
  try {
    tema = await temaDelCatalogo(trackId);
  } catch {
    return Response.json({ error: "No pude verificar el tema. Probá de nuevo." }, { status: 502 });
  }
  if (!tema) {
    return Response.json({ error: "Ese tema no se puede pasar acá." }, { status: 400 });
  }
  if (tema.duracionSegundos > DURACION_MAXIMA_SEGUNDOS) {
    return Response.json({ error: "El tema dura más de 7 minutos." }, { status: 400 });
  }
  const verificado = tema;

  const ip = getClientIp(request);
  const autoApprove = await isAutoApproveEnabled();

  // Revisar y anotar bajo un mismo candado: diez toques a la vez del mismo celu (o del mismo tema) no
  // pasan todos los controles antes de que se anote el primero.
  const resultado = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${PROPOSE_LOCK_ID})`);

    const [deviceAllowed, ipAllowed, capReached] = await Promise.all([
      canProposeAgain(hashDeviceKey(deviceKey)),
      isIpWithinLimit(ip),
      isGlobalCapReached(),
    ]);
    if (!deviceAllowed || !ipAllowed) {
      return { error: "Esperá unos minutos antes de proponer otro tema.", status: 429 } as const;
    }
    if (capReached) return { error: "Hay muchas propuestas ahora. Probá más tarde.", status: 429 } as const;

    // Si justo lo está pasando la lista del local, pedirlo lo haría sonar dos veces seguidas.
    const { foto } = await leerRuntime();
    if (fotoVigente(foto)?.tema?.uri === verificado.uri) {
      return { error: "Ese tema está sonando ahora.", status: 409 } as const;
    }
    const bloqueo = await waitingBlock(verificado.uri);
    if (bloqueo === "repetido") return { error: "Ese tema ya está en la cola.", status: 409 } as const;
    if (bloqueo === "llena") return { error: "La cola está llena. Probá en unos minutos.", status: 429 } as const;

    const [fila] = await db
      .insert(jukeboxProposals)
      .values({
        spotifyTrackUri: verificado.uri,
        videoTitle: verificado.nombre.slice(0, 200),
        channelTitle: verificado.artistas.slice(0, 100),
        thumbnailUrl: verificado.tapa,
        durationSeconds: verificado.duracionSegundos,
        proposedByName: proposerName,
        deviceKeyHash: buildProposerHash(deviceKey, ip),
        status: autoApprove ? "approved" : "pending",
        autoApproved: autoApprove,
        resolvedAt: autoApprove ? new Date() : null,
      })
      .returning({ id: jukeboxProposals.id });
    // Adentro del candado: hasta que entra a la cola, el mismo tema podría pasar el control de repetidos.
    if (autoApprove && fila) await enqueueApproved(fila.id);
    return { ok: true } as const;
  });

  if ("error" in resultado) {
    return Response.json({ error: resultado.error }, { status: resultado.status });
  }
  // Si no suena nada de la cola, que arranque ya y no al próximo sondeo.
  if (autoApprove) after(() => latidoJukebox({ apurado: true }));

  return Response.json({ ok: true, autoApproved: autoApprove });
}
