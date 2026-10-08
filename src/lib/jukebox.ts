import { createHash } from "node:crypto";
import { and, asc, desc, eq, gt, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { configuracionNegocio, jukeboxProposals, jukeboxQueue } from "@/db/schema";

const RATE_LIMIT_MINUTES = 5;
const IP_LIMIT_WINDOW_MINUTES = 10;
const IP_LIMIT_MAX_PROPOSALS = 25; // el Wi-Fi del local comparte una sola IP
const GLOBAL_CAP_PER_HOUR = 60;
export const MAX_DURATION_SECONDS = 6 * 60;
const QUEUE_LOCK_ID = 51_000_001;
/** Temas esperando (cola + propuestas sin resolver): evita que alguien llene el parlante. */
export const MAX_WAITING = 10;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type JukeboxProposalSummary = {
  id: string;
  youtubeVideoId: string;
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
  youtubeVideoId: string;
  videoTitle: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  proposedByName: string;
  durationSeconds: number | null;
  state: "queued" | "playing" | "played" | "skipped";
  positionHint: number;
  startedAt: string | null;
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
export async function waitingBlock(videoId: string): Promise<"repetido" | "llena" | null> {
  const enCola = await db
    .select({ videoId: jukeboxProposals.youtubeVideoId })
    .from(jukeboxQueue)
    .innerJoin(jukeboxProposals, eq(jukeboxQueue.proposalId, jukeboxProposals.id))
    .where(sql`${jukeboxQueue.state} in ('queued', 'playing')`);
  const pendientes = await db
    .select({ videoId: jukeboxProposals.youtubeVideoId })
    .from(jukeboxProposals)
    .where(eq(jukeboxProposals.status, "pending"));
  const todos = [...enCola, ...pendientes];
  if (todos.some((t) => t.videoId === videoId)) return "repetido";
  if (todos.length >= MAX_WAITING) return "llena";
  return null;
}

/** Saca un tema que todavía no empezó a sonar (Pinky modera la cola auto-aprobada). */
export async function removeQueued(queueItemId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${QUEUE_LOCK_ID})`);
    await tx
      .update(jukeboxQueue)
      .set({ state: "skipped", endedAt: new Date() })
      .where(and(eq(jukeboxQueue.id, queueItemId), eq(jukeboxQueue.state, "queued")));
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

export async function listQueue(): Promise<JukeboxQueueItem[]> {
  const rows = await db
    .select({
      id: jukeboxQueue.id,
      proposalId: jukeboxQueue.proposalId,
      state: jukeboxQueue.state,
      positionHint: jukeboxQueue.positionHint,
      startedAt: jukeboxQueue.startedAt,
      youtubeVideoId: jukeboxProposals.youtubeVideoId,
      videoTitle: jukeboxProposals.videoTitle,
      channelTitle: jukeboxProposals.channelTitle,
      thumbnailUrl: jukeboxProposals.thumbnailUrl,
      durationSeconds: jukeboxProposals.durationSeconds,
      proposedByName: jukeboxProposals.proposedByName,
    })
    .from(jukeboxQueue)
    .innerJoin(jukeboxProposals, eq(jukeboxQueue.proposalId, jukeboxProposals.id))
    .where(
      sql`${jukeboxQueue.state} in ('queued', 'playing')`
    )
    .orderBy(asc(jukeboxQueue.positionHint));

  return rows.map((r) => ({
    id: r.id,
    proposalId: r.proposalId,
    youtubeVideoId: r.youtubeVideoId,
    videoTitle: r.videoTitle,
    channelTitle: r.channelTitle,
    thumbnailUrl: r.thumbnailUrl,
    durationSeconds: r.durationSeconds,
    proposedByName: r.proposedByName,
    state: r.state as JukeboxQueueItem["state"],
    positionHint: r.positionHint,
    startedAt: r.startedAt?.toISOString() ?? null,
  }));
}

export async function getNowPlaying(): Promise<JukeboxQueueItem | null> {
  const [row] = await db
    .select({
      id: jukeboxQueue.id,
      proposalId: jukeboxQueue.proposalId,
      state: jukeboxQueue.state,
      positionHint: jukeboxQueue.positionHint,
      startedAt: jukeboxQueue.startedAt,
      youtubeVideoId: jukeboxProposals.youtubeVideoId,
      videoTitle: jukeboxProposals.videoTitle,
      channelTitle: jukeboxProposals.channelTitle,
      thumbnailUrl: jukeboxProposals.thumbnailUrl,
      durationSeconds: jukeboxProposals.durationSeconds,
      proposedByName: jukeboxProposals.proposedByName,
    })
    .from(jukeboxQueue)
    .innerJoin(jukeboxProposals, eq(jukeboxQueue.proposalId, jukeboxProposals.id))
    .where(eq(jukeboxQueue.state, "playing"))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    proposalId: row.proposalId,
    youtubeVideoId: row.youtubeVideoId,
    videoTitle: row.videoTitle,
    channelTitle: row.channelTitle,
    thumbnailUrl: row.thumbnailUrl,
    durationSeconds: row.durationSeconds,
    proposedByName: row.proposedByName,
    state: row.state as JukeboxQueueItem["state"],
    positionHint: row.positionHint,
    startedAt: row.startedAt?.toISOString() ?? null,
  };
}

export async function getNextInQueue(): Promise<JukeboxQueueItem | null> {
  const [row] = await db
    .select({
      id: jukeboxQueue.id,
      proposalId: jukeboxQueue.proposalId,
      state: jukeboxQueue.state,
      positionHint: jukeboxQueue.positionHint,
      startedAt: jukeboxQueue.startedAt,
      youtubeVideoId: jukeboxProposals.youtubeVideoId,
      videoTitle: jukeboxProposals.videoTitle,
      channelTitle: jukeboxProposals.channelTitle,
      thumbnailUrl: jukeboxProposals.thumbnailUrl,
      durationSeconds: jukeboxProposals.durationSeconds,
      proposedByName: jukeboxProposals.proposedByName,
    })
    .from(jukeboxQueue)
    .innerJoin(jukeboxProposals, eq(jukeboxQueue.proposalId, jukeboxProposals.id))
    .where(eq(jukeboxQueue.state, "queued"))
    .orderBy(asc(jukeboxQueue.positionHint))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    proposalId: row.proposalId,
    youtubeVideoId: row.youtubeVideoId,
    videoTitle: row.videoTitle,
    channelTitle: row.channelTitle,
    thumbnailUrl: row.thumbnailUrl,
    durationSeconds: row.durationSeconds,
    proposedByName: row.proposedByName,
    state: row.state as JukeboxQueueItem["state"],
    positionHint: row.positionHint,
    startedAt: row.startedAt?.toISOString() ?? null,
  };
}

// Promueve el siguiente "queued" a "playing" si no hay nada sonando. Corre dentro de una transacción con lock.
async function startNextIfIdle(tx: Tx): Promise<void> {
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

export async function enqueueApproved(proposalId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${QUEUE_LOCK_ID})`);

    const [last] = await tx
      .select({ pos: jukeboxQueue.positionHint })
      .from(jukeboxQueue)
      .where(sql`${jukeboxQueue.state} in ('queued', 'playing')`)
      .orderBy(desc(jukeboxQueue.positionHint))
      .limit(1);

    await tx.insert(jukeboxQueue).values({
      proposalId,
      positionHint: (last?.pos ?? 0) + 1,
      state: "queued",
    });

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

export async function skipCurrent(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${QUEUE_LOCK_ID})`);

    const [skipped] = await tx
      .update(jukeboxQueue)
      .set({ state: "skipped", endedAt: new Date() })
      .where(eq(jukeboxQueue.state, "playing"))
      .returning({ id: jukeboxQueue.id });
    if (!skipped) return;

    await startNextIfIdle(tx);
  });
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
