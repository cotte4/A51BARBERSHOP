import { createHash } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { configuracionNegocio, jukeboxProposals, jukeboxQueue, jukeboxRuntime } from "@/db/schema";
import { fotoVigente, type FotoSpotify, type FuenteJukebox } from "@/lib/jukebox-runtime";
import { resolverPedido, type PedidoCliente } from "@/lib/jukebox-pedido";

const RATE_LIMIT_MINUTES = 5;
const IP_LIMIT_WINDOW_MINUTES = 10;
const IP_LIMIT_MAX_PROPOSALS = 25; // el Wi-Fi del local comparte una sola IP
const GLOBAL_CAP_PER_HOUR = 60;
const QUEUE_LOCK_ID = 51_000_001;
/** Temas esperando (cola + propuestas sin resolver): evita que alguien llene el parlante. */
export const MAX_WAITING = 10;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type JukeboxProposalSummary = {
  id: string;
  youtubeVideoId: string | null;
  spotifyTrackUri: string | null;
  videoTitle: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  proposedByName: string;
  status: "pending" | "approved" | "rejected" | "played";
  autoApproved: boolean;
  createdAt: string;
};

export type JukeboxQueueItem = {
  id: string;
  proposalId: string;
  youtubeVideoId: string | null;
  spotifyTrackUri: string | null;
  videoTitle: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  proposedByName: string;
  durationSeconds: number | null;
  state: "queued" | "playing" | "played" | "skipped";
  positionHint: number;
  startedAt: string | null;
  /** Ya está en la cola de Spotify: suena sí o sí y no se puede quitar. */
  enSpotify: boolean;
};

export function hashDeviceKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

// deviceKeyHash guarda "<hash dispositivo>|<hash ip>" para limitar por IP sin tocar el schema.
export function buildProposerHash(deviceKey: string, ip: string): string {
  return `${hashDeviceKey(deviceKey)}|${hashDeviceKey(ip)}`;
}

export function parseIsoDuration(iso: string): number | null {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return null;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  return h * 3600 + m * 60 + s;
}

export async function canProposeAgain(deviceKeyHash: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jukeboxProposals)
    .where(
      and(
        like(jukeboxProposals.deviceKeyHash, `${deviceKeyHash}%`),
        gt(jukeboxProposals.createdAt, windowStart),
      )
    );
  return (row?.count ?? 0) === 0;
}

export async function isIpWithinLimit(ip: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - IP_LIMIT_WINDOW_MINUTES * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jukeboxProposals)
    .where(
      and(
        like(jukeboxProposals.deviceKeyHash, `%|${hashDeviceKey(ip)}`),
        gt(jukeboxProposals.createdAt, windowStart),
      )
    );
  return (row?.count ?? 0) < IP_LIMIT_MAX_PROPOSALS;
}

export async function isGlobalCapReached(): Promise<boolean> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jukeboxProposals)
    .where(gt(jukeboxProposals.createdAt, windowStart));
  return (row?.count ?? 0) >= GLOBAL_CAP_PER_HOUR;
}

/** Un tema que ya está esperando no se repite, y la espera tiene tope. null = se puede proponer. */
export async function waitingBlock(spotifyTrackUri: string): Promise<"repetido" | "llena" | null> {
  const enCola = await db
    .select({ uri: jukeboxProposals.spotifyTrackUri })
    .from(jukeboxQueue)
    .innerJoin(jukeboxProposals, eq(jukeboxQueue.proposalId, jukeboxProposals.id))
    .where(sql`${jukeboxQueue.state} in ('queued', 'playing')`);
  const pendientes = await db
    .select({ uri: jukeboxProposals.spotifyTrackUri })
    .from(jukeboxProposals)
    .where(eq(jukeboxProposals.status, "pending"));
  const todos = [...enCola, ...pendientes];
  if (todos.some((t) => t.uri === spotifyTrackUri)) return "repetido";
  if (todos.length >= MAX_WAITING) return "llena";
  return null;
}

/** El último tema que pidió este dispositivo, ya traducido para el cliente (nada interno sale de acá). */
export async function getLastProposalForDevice(deviceKey: string): Promise<PedidoCliente | null> {
  const [ultima] = await db
    .select({ id: jukeboxProposals.id, videoTitle: jukeboxProposals.videoTitle, status: jukeboxProposals.status })
    .from(jukeboxProposals)
    .where(like(jukeboxProposals.deviceKeyHash, `${hashDeviceKey(deviceKey)}%`))
    .orderBy(desc(jukeboxProposals.createdAt))
    .limit(1);
  if (!ultima) return null;

  const [[item], activos] = await Promise.all([
    db
      .select({ state: jukeboxQueue.state, positionHint: jukeboxQueue.positionHint })
      .from(jukeboxQueue)
      .where(eq(jukeboxQueue.proposalId, ultima.id))
      .orderBy(desc(jukeboxQueue.createdAt))
      .limit(1),
    db
      .select({ state: jukeboxQueue.state, positionHint: jukeboxQueue.positionHint })
      .from(jukeboxQueue)
      .where(sql`${jukeboxQueue.state} in ('queued', 'playing')`),
  ]);
  return resolverPedido(ultima, item ?? null, activos);
}

/**
 * Saca un tema que todavía no empezó a sonar (Pinky modera la cola auto-aprobada).
 * Lo que ya se mandó a Spotify no se puede sacar: Spotify no deja borrar de su cola. false = no se quitó.
 */
export async function removeQueued(queueItemId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${QUEUE_LOCK_ID})`);
    const quitados = await tx
      .update(jukeboxQueue)
      .set({ state: "skipped", endedAt: new Date() })
      .where(
        and(eq(jukeboxQueue.id, queueItemId), eq(jukeboxQueue.state, "queued"), isNull(jukeboxQueue.sentToSpotifyAt)),
      )
      .returning({ id: jukeboxQueue.id });
    return quitados.length > 0;
  });
}

export async function listPendingProposals(): Promise<JukeboxProposalSummary[]> {
  const rows = await db
    .select()
    .from(jukeboxProposals)
    .where(eq(jukeboxProposals.status, "pending"))
    .orderBy(asc(jukeboxProposals.createdAt));

  return rows.map((r) => ({
    id: r.id,
    youtubeVideoId: r.youtubeVideoId,
    spotifyTrackUri: r.spotifyTrackUri,
    videoTitle: r.videoTitle,
    channelTitle: r.channelTitle,
    thumbnailUrl: r.thumbnailUrl,
    durationSeconds: r.durationSeconds,
    proposedByName: r.proposedByName,
    status: r.status as JukeboxProposalSummary["status"],
    autoApproved: r.autoApproved,
    createdAt: r.createdAt.toISOString(),
  }));
}

const camposCola = {
  id: jukeboxQueue.id,
  proposalId: jukeboxQueue.proposalId,
  state: jukeboxQueue.state,
  positionHint: jukeboxQueue.positionHint,
  startedAt: jukeboxQueue.startedAt,
  sentToSpotifyAt: jukeboxQueue.sentToSpotifyAt,
  youtubeVideoId: jukeboxProposals.youtubeVideoId,
  spotifyTrackUri: jukeboxProposals.spotifyTrackUri,
  videoTitle: jukeboxProposals.videoTitle,
  channelTitle: jukeboxProposals.channelTitle,
  thumbnailUrl: jukeboxProposals.thumbnailUrl,
  durationSeconds: jukeboxProposals.durationSeconds,
  proposedByName: jukeboxProposals.proposedByName,
};

type FilaCola = {
  id: string;
  proposalId: string;
  state: string;
  positionHint: number;
  startedAt: Date | null;
  sentToSpotifyAt: Date | null;
  youtubeVideoId: string | null;
  spotifyTrackUri: string | null;
  videoTitle: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  proposedByName: string;
};

function aItem(r: FilaCola): JukeboxQueueItem {
  return {
    id: r.id,
    proposalId: r.proposalId,
    youtubeVideoId: r.youtubeVideoId,
    spotifyTrackUri: r.spotifyTrackUri,
    videoTitle: r.videoTitle,
    channelTitle: r.channelTitle,
    thumbnailUrl: r.thumbnailUrl,
    durationSeconds: r.durationSeconds,
    proposedByName: r.proposedByName,
    state: r.state as JukeboxQueueItem["state"],
    positionHint: r.positionHint,
    startedAt: r.startedAt?.toISOString() ?? null,
    enSpotify: r.sentToSpotifyAt !== null,
  };
}

/**
 * La cola en el orden en que va a sonar: el que suena, el que ya está en Spotify y después el resto por
 * posición (un tema "que siga" puede tener una posición menor que el ya mandado, pero suena después).
 */
export async function listQueue(): Promise<JukeboxQueueItem[]> {
  const rows: FilaCola[] = await db
    .select(camposCola)
    .from(jukeboxQueue)
    .innerJoin(jukeboxProposals, eq(jukeboxQueue.proposalId, jukeboxProposals.id))
    .where(sql`${jukeboxQueue.state} in ('queued', 'playing')`)
    .orderBy(asc(jukeboxQueue.positionHint));

  const rango = (r: FilaCola) => (r.state === "playing" ? 0 : r.sentToSpotifyAt ? 1 : 2);
  return rows
    .sort(
      (a, b) =>
        rango(a) - rango(b) ||
        (a.sentToSpotifyAt?.getTime() ?? 0) - (b.sentToSpotifyAt?.getTime() ?? 0) ||
        a.positionHint - b.positionHint,
    )
    .map(aItem);
}

export async function getNowPlaying(): Promise<JukeboxQueueItem | null> {
  const [row] = await db
    .select(camposCola)
    .from(jukeboxQueue)
    .innerJoin(jukeboxProposals, eq(jukeboxQueue.proposalId, jukeboxProposals.id))
    .where(eq(jukeboxQueue.state, "playing"))
    .limit(1);
  return row ? aItem(row) : null;
}

async function fuenteEn(tx: Tx): Promise<FuenteJukebox> {
  const [fila] = await tx.select({ source: jukeboxRuntime.source }).from(jukeboxRuntime).limit(1);
  return fila?.source ?? "spotify";
}

// Solo en modo YouTube: el navegador del staff toca lo que figura "playing", así que se promueve acá.
// En modo Spotify "playing" lo marca el latido cuando Spotify de verdad lo empieza.
async function startNextIfIdle(tx: Tx): Promise<void> {
  if ((await fuenteEn(tx)) !== "youtube") return;

  const [playing] = await tx
    .select({ id: jukeboxQueue.id })
    .from(jukeboxQueue)
    .where(eq(jukeboxQueue.state, "playing"))
    .limit(1);
  if (playing) return;

  const [next] = await tx
    .select({ id: jukeboxQueue.id, proposalId: jukeboxQueue.proposalId })
    .from(jukeboxQueue)
    .where(eq(jukeboxQueue.state, "queued"))
    .orderBy(asc(jukeboxQueue.positionHint))
    .limit(1);
  if (!next) return;

  await tx
    .update(jukeboxQueue)
    .set({ state: "playing", startedAt: new Date() })
    .where(eq(jukeboxQueue.id, next.id));

  await tx
    .update(jukeboxProposals)
    .set({ status: "played", resolvedAt: new Date() })
    .where(eq(jukeboxProposals.id, next.proposalId));
}

/** La promoción de modo YouTube afuera de un alta (al cambiar de fuente, por ejemplo). */
export async function arrancarSiHaceFalta(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${QUEUE_LOCK_ID})`);
    await startNextIfIdle(tx);
  });
}

/** Encola un tema aprobado. `alFrente`: Pinky lo quiere a continuación (antes de lo que todavía espera). */
export async function enqueueApproved(
  proposalId: string,
  { alFrente = false }: { alFrente?: boolean } = {},
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${QUEUE_LOCK_ID})`);

    const vivos = await tx
      .select({ pos: jukeboxQueue.positionHint, state: jukeboxQueue.state, sent: jukeboxQueue.sentToSpotifyAt })
      .from(jukeboxQueue)
      .where(sql`${jukeboxQueue.state} in ('queued', 'playing')`);

    const ultima = Math.max(0, ...vivos.map((v) => v.pos));
    const esperando = vivos.filter((v) => v.state === "queued" && !v.sent).map((v) => v.pos);
    const posicion = alFrente && esperando.length > 0 ? Math.min(...esperando) - 1 : ultima + 1;

    await tx.insert(jukeboxQueue).values({ proposalId, positionHint: posicion, state: "queued" });

    await startNextIfIdle(tx);
  });
}

export async function markPlayed(queueItemId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${QUEUE_LOCK_ID})`);

    // Si otra pestaña ya avanzó, este item ya no está "playing" y no hacemos nada.
    const [ended] = await tx
      .update(jukeboxQueue)
      .set({ state: "played", endedAt: new Date() })
      .where(and(eq(jukeboxQueue.id, queueItemId), eq(jukeboxQueue.state, "playing")))
      .returning({ id: jukeboxQueue.id });
    if (!ended) return;

    await startNextIfIdle(tx);
  });
}

/** Corta el que suena. `comoTerminado`: al cambiar de fuente no lo saltó nadie, ya sonó. */
export async function skipCurrent({ comoTerminado = false }: { comoTerminado?: boolean } = {}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${QUEUE_LOCK_ID})`);

    const [skipped] = await tx
      .update(jukeboxQueue)
      .set({ state: comoTerminado ? "played" : "skipped", endedAt: new Date() })
      .where(eq(jukeboxQueue.state, "playing"))
      .returning({ id: jukeboxQueue.id });
    if (!skipped) return;

    await startNextIfIdle(tx);
  });
}

/** Al pasar a YouTube, lo que se había mandado a Spotify vuelve a esperar: lo toca el celu del staff. */
export async function olvidarEnviosASpotify(): Promise<void> {
  await db
    .update(jukeboxQueue)
    .set({ sentToSpotifyAt: null })
    .where(and(eq(jukeboxQueue.state, "queued"), isNotNull(jukeboxQueue.sentToSpotifyAt)));
}

/**
 * Reserva un tema para mandarlo a Spotify ANTES de mandarlo: si dos latidos (o un latido y "Saltar")
 * quieren el mismo, solo uno lo consigue, y si Pinky lo quitó recién, no se manda. false = no mandarlo.
 * Solo en modo Spotify: si en el medio se pasó a YouTube, el tema queda para el celu del staff.
 */
export async function reservarEnvio(queueItemId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${QUEUE_LOCK_ID})`);
    if ((await fuenteEn(tx)) !== "spotify") return false;
    const reservados = await tx
      .update(jukeboxQueue)
      .set({ sentToSpotifyAt: new Date() })
      .where(
        and(eq(jukeboxQueue.id, queueItemId), eq(jukeboxQueue.state, "queued"), isNull(jukeboxQueue.sentToSpotifyAt)),
      )
      .returning({ id: jukeboxQueue.id });
    return reservados.length > 0;
  });
}

/** Spotify no lo aceptó: vuelve a esperar como si nada (se reintenta en el próximo latido). */
export async function liberarEnvio(queueItemId: string): Promise<void> {
  await db
    .update(jukeboxQueue)
    .set({ sentToSpotifyAt: null })
    .where(and(eq(jukeboxQueue.id, queueItemId), eq(jukeboxQueue.state, "queued")));
}

/**
 * Lo que el latido decidió (ver jukebox-decidir.ts), aplicado de una vez con el candado de la cola.
 * Las condiciones de estado en cada UPDATE hacen que un latido tardío no pise lo que ya hizo otro, y si
 * mientras tanto se pasó a YouTube no se aplica nada (ahí manda el celu del staff).
 */
export async function aplicarDecision(d: { empieza: string | null; terminan: string[]; descartan: string[] }): Promise<void> {
  if (!d.empieza && d.terminan.length === 0 && d.descartan.length === 0) return;
  const ahora = new Date();
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${QUEUE_LOCK_ID})`);
    if ((await fuenteEn(tx)) !== "spotify") return;
    if (d.terminan.length > 0) {
      await tx
        .update(jukeboxQueue)
        .set({ state: "played", endedAt: ahora })
        .where(and(inArray(jukeboxQueue.id, d.terminan), inArray(jukeboxQueue.state, ["queued", "playing"])));
    }
    if (d.descartan.length > 0) {
      await tx
        .update(jukeboxQueue)
        .set({ state: "skipped", endedAt: ahora })
        .where(and(inArray(jukeboxQueue.id, d.descartan), eq(jukeboxQueue.state, "queued")));
    }
    if (d.empieza) {
      const [fila] = await tx
        .update(jukeboxQueue)
        .set({ state: "playing", startedAt: ahora })
        .where(and(eq(jukeboxQueue.id, d.empieza), eq(jukeboxQueue.state, "queued")))
        .returning({ proposalId: jukeboxQueue.proposalId });
      if (fila) {
        await tx
          .update(jukeboxProposals)
          .set({ status: "played", resolvedAt: ahora })
          .where(eq(jukeboxProposals.id, fila.proposalId));
      }
    }
  });
}

/** Temas que esperaron de más (una cola de otro día): se descartan en cualquier modo. */
export async function descartarViejos(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db
    .update(jukeboxQueue)
    .set({ state: "skipped", endedAt: new Date() })
    .where(and(inArray(jukeboxQueue.id, ids), eq(jukeboxQueue.state, "queued")));
}

/** Lo que el latido necesita de cada tema vivo. */
export async function itemsVivos() {
  return db
    .select({
      id: jukeboxQueue.id,
      estado: jukeboxQueue.state,
      uri: jukeboxProposals.spotifyTrackUri,
      posicion: jukeboxQueue.positionHint,
      enviadoEn: jukeboxQueue.sentToSpotifyAt,
      empezoEn: jukeboxQueue.startedAt,
      duracionSegundos: jukeboxProposals.durationSeconds,
      creadoEn: jukeboxQueue.createdAt,
      proposalId: jukeboxQueue.proposalId,
      titulo: jukeboxProposals.videoTitle,
      artistas: jukeboxProposals.channelTitle,
    })
    .from(jukeboxQueue)
    .innerJoin(jukeboxProposals, eq(jukeboxQueue.proposalId, jukeboxProposals.id))
    .where(sql`${jukeboxQueue.state} in ('queued', 'playing')`);
}

/** Le pone a un tema que entró en modo YouTube el tema de Spotify que se le encontró. */
export async function guardarUriDeSpotify(proposalId: string, uri: string): Promise<void> {
  await db.update(jukeboxProposals).set({ spotifyTrackUri: uri }).where(eq(jukeboxProposals.id, proposalId));
}

export async function guardarVideoDeYoutube(proposalId: string, videoId: string): Promise<void> {
  await db.update(jukeboxProposals).set({ youtubeVideoId: videoId }).where(eq(jukeboxProposals.id, proposalId));
}

/**
 * La jukebox está manejando Spotify: el modo Auto no tiene que pisarle la música con su lista. Solo
 * cuenta si hay temas vivos Y la última foto muestra Spotify conectado y abierto en algún lado (si no,
 * la jukebox no puede pasar nada y no tiene sentido frenar a Auto).
 */
export async function jukeboxOcupaSpotify(): Promise<boolean> {
  const [runtime] = await db
    .select({ source: jukeboxRuntime.source, foto: jukeboxRuntime.spotifySnapshot })
    .from(jukeboxRuntime)
    .limit(1);
  if ((runtime?.source ?? "spotify") !== "spotify") return false;
  const foto = fotoVigente((runtime?.foto as FotoSpotify | null) ?? null, 5 * 60 * 1000);
  if (!foto || foto.conexion !== "conectado" || foto.estado === "sin_dispositivo") return false;

  const [fila] = await db
    .select({ id: jukeboxQueue.id })
    .from(jukeboxQueue)
    .where(
      and(
        sql`${jukeboxQueue.state} in ('queued', 'playing')`,
        gt(jukeboxQueue.createdAt, new Date(Date.now() - 12 * 60 * 60 * 1000)),
      ),
    )
    .limit(1);
  return !!fila;
}

async function getConfig() {
  const [config] = await db
    .select({
      jukeboxEnabled: configuracionNegocio.jukeboxEnabled,
      jukeboxAutoApprove: configuracionNegocio.jukeboxAutoApprove,
    })
    .from(configuracionNegocio)
    .limit(1);
  return config ?? { jukeboxEnabled: true, jukeboxAutoApprove: false };
}

export async function isJukeboxEnabled(): Promise<boolean> {
  const { jukeboxEnabled } = await getConfig();
  return jukeboxEnabled;
}

export async function isAutoApproveEnabled(): Promise<boolean> {
  const { jukeboxAutoApprove } = await getConfig();
  return jukeboxAutoApprove;
}

export async function setAutoApprove(enabled: boolean): Promise<void> {
  await db
    .update(configuracionNegocio)
    .set({ jukeboxAutoApprove: enabled });
}
