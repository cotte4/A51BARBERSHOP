import { z } from "zod";
import { db } from "@/db";
import { jukeboxProposals } from "@/db/schema";
import {
  MAX_DURATION_SECONDS,
  buildProposerHash,
  canProposeAgain,
  enqueueApproved,
  getClientIp,
  hashDeviceKey,
  isAutoApproveEnabled,
  isGlobalCapReached,
  isIpWithinLimit,
  isJukeboxEnabled,
  parseIsoDuration,
  waitingBlock,
} from "@/lib/jukebox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const proposeSchema = z.object({
  videoId: z.string().trim().regex(/^[\w-]{11}$/),
  proposerName: z.string().trim().min(2).max(40),
  deviceKey: z.string().trim().min(8).max(256),
});

type YouTubeVideoDetails = {
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: { medium?: { url: string }; default?: { url: string } };
  };
  contentDetails?: { duration?: string };
  status?: { embeddable?: boolean };
};

function safeThumbnail(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" && parsedUrl.hostname === "i.ytimg.com" ? url : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!(await isJukeboxEnabled())) {
    return Response.json({ error: "El jukebox está desactivado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = proposeSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { videoId, proposerName, deviceKey } = parsed.data;

  const ip = getClientIp(request);
  const [deviceAllowed, ipAllowed, capReached] = await Promise.all([
    canProposeAgain(hashDeviceKey(deviceKey)),
    isIpWithinLimit(ip),
    isGlobalCapReached(),
  ]);

  if (!deviceAllowed || !ipAllowed) {
    return Response.json(
      { error: "Esperá unos minutos antes de proponer otro tema." },
      { status: 429 }
    );
  }
  if (capReached) {
    return Response.json(
      { error: "Hay muchas propuestas ahora. Probá más tarde." },
      { status: 429 }
    );
  }

  const bloqueo = await waitingBlock(videoId);
  if (bloqueo === "repetido") {
    return Response.json({ error: "Ese tema ya está en la cola." }, { status: 409 });
  }
  if (bloqueo === "llena") {
    return Response.json({ error: "La cola está llena. Probá en unos minutos." }, { status: 429 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY ?? process.env.YOUTUBE_API_KEY_BEATS;
  if (!apiKey) {
    return Response.json({ error: "YouTube API no configurada." }, { status: 500 });
  }

  // No confiamos en título/duración/miniatura del cliente: se re-consultan en YouTube.
  let details: YouTubeVideoDetails | undefined;
  try {
    const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailsUrl.searchParams.set("part", "snippet,contentDetails,status");
    detailsUrl.searchParams.set("id", videoId);
    detailsUrl.searchParams.set("key", apiKey);
    const res = await fetch(detailsUrl.toString(), { cache: "no-store" });
    if (!res.ok) {
      return Response.json({ error: "No pude verificar el video." }, { status: 502 });
    }
    const data = (await res.json()) as { items?: YouTubeVideoDetails[] };
    details = data.items?.[0];
  } catch {
    return Response.json({ error: "No pude verificar el video." }, { status: 502 });
  }

  if (!details?.snippet?.title) {
    return Response.json({ error: "Ese video no existe." }, { status: 400 });
  }
  if (details.status?.embeddable === false) {
    return Response.json({ error: "Ese video no se puede reproducir acá." }, { status: 400 });
  }

  const durationSeconds = parseIsoDuration(details.contentDetails?.duration ?? "");
  if (!durationSeconds) {
    return Response.json({ error: "No se puede pasar un video en vivo." }, { status: 400 });
  }
  if (durationSeconds > MAX_DURATION_SECONDS) {
    return Response.json({ error: "El tema dura más de 6 minutos." }, { status: 400 });
  }

  const title = details.snippet.title.slice(0, 200);
  const channelTitle = (details.snippet.channelTitle ?? "").slice(0, 100);
  const thumbnailUrl = safeThumbnail(
    details.snippet.thumbnails?.medium?.url ?? details.snippet.thumbnails?.default?.url
  );
  const deviceKeyHash = buildProposerHash(deviceKey, ip);

  const autoApprove = await isAutoApproveEnabled();
  const status = autoApprove ? "approved" : "pending";

  const [inserted] = await db
    .insert(jukeboxProposals)
    .values({
      youtubeVideoId: videoId,
      videoTitle: title,
      channelTitle,
      thumbnailUrl,
      durationSeconds,
      proposedByName: proposerName,
      deviceKeyHash,
      status,
      autoApproved: autoApprove,
      resolvedAt: autoApprove ? new Date() : null,
    })
    .returning({ id: jukeboxProposals.id });

  if (autoApprove && inserted) {
    await enqueueApproved(inserted.id);
  }

  return Response.json({ ok: true, autoApproved: autoApprove });
}
