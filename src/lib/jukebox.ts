import { createHash } from "node:crypto";
import { and, asc, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { configuracionNegocio, jukeboxProposals, jukeboxQueue } from "@/db/schema";

const RATE_LIMIT_MINUTES = 5;

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
  state: "queued" | "playing" | "played" | "skipped";
  positionHint: number;
  startedAt: string | null;
};

export function hashDeviceKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function canProposeAgain(deviceKeyHash: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(jukeboxProposals)
    .where(
      and(
        eq(jukeboxProposals.deviceKeyHash, deviceKeyHash),
        gt(jukeboxProposals.createdAt, windowStart),
      )
    );
  return (row?.count ?? 0) === 0;
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
    proposedByName: row.proposedByName,
    state: row.state as JukeboxQueueItem["state"],
    positionHint: row.positionHint,
    startedAt: row.startedAt?.toISOString() ?? null,
  };
}

export async function enqueueApproved(proposalId: string): Promise<void> {
  const [last] = await db
    .select({ pos: jukeboxQueue.positionHint })
    .from(jukeboxQueue)
    .where(sql`${jukeboxQueue.state} in ('queued', 'playing')`)
    .orderBy(desc(jukeboxQueue.positionHint))
    .limit(1);

  const nextPos = (last?.pos ?? 0) + 1;

  await db.insert(jukeboxQueue).values({
    proposalId,
    positionHint: nextPos,
    state: "queued",
  });
}

export async function markPlayed(queueItemId: string): Promise<void> {
  await db
    .update(jukeboxQueue)
    .set({ state: "played", endedAt: new Date() })
    .where(eq(jukeboxQueue.id, queueItemId));

  const next = await getNextInQueue();
  if (next) {
    await db
      .update(jukeboxQueue)
      .set({ state: "playing", startedAt: new Date() })
      .where(eq(jukeboxQueue.id, next.id));

    await db
      .update(jukeboxProposals)
      .set({ status: "played", resolvedAt: new Date() })
      .where(eq(jukeboxProposals.id, next.proposalId));
  }
}

export async function skipCurrent(): Promise<void> {
  const current = await getNowPlaying();
  if (!current) return;

  await db
    .update(jukeboxQueue)
    .set({ state: "skipped", endedAt: new Date() })
    .where(eq(jukeboxQueue.id, current.id));

  const next = await getNextInQueue();
  if (next) {
    await db
      .update(jukeboxQueue)
      .set({ state: "playing", startedAt: new Date() })
      .where(eq(jukeboxQueue.id, next.id));

    await db
      .update(jukeboxProposals)
      .set({ status: "played", resolvedAt: new Date() })
      .where(eq(jukeboxProposals.id, next.proposalId));
  }
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
