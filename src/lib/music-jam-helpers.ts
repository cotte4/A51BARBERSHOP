import { musicEvents } from "@/db/schema";
import { parseJamJoinPayload } from "@/lib/music-engine-helpers";
import type { MusicDashboardState } from "@/lib/music-types";

type QueueOwnerLike = {
  ownerBarberoId: string | null;
  id: string;
};

type QueueDispatchLike = {
  id: string;
  ownerBarberoId: string | null;
  positionHint: number;
  createdAt: Date;
};

type JamSessionLike = {
  id: string;
  hostBarberoId: string | null;
  hostBarberoNombre: string | null;
  startedAt: Date;
} | null;

type JamQueueRowLike = {
  ownerBarberoId: string | null;
  ownerBarberoNombre: string | null;
  createdAt: Date;
};

function getQueueOwnerKey(item: QueueOwnerLike) {
  return item.ownerBarberoId ?? `anon:${item.id}`;
}

export function buildJamDispatchOrder<T extends QueueDispatchLike>(
  items: T[],
  lastOwnerBarberoId: string | null,
): T[] {
  if (items.length <= 1) {
    return items;
  }

  const buckets = new Map<string, T[]>();
  const ownerOrder: string[] = [];

  for (const item of items) {
    const ownerKey = getQueueOwnerKey(item);
    const bucket = buckets.get(ownerKey);
    if (bucket) {
      bucket.push(item);
      continue;
    }

    buckets.set(ownerKey, [item]);
    ownerOrder.push(ownerKey);
  }

  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => {
      if (a.positionHint !== b.positionHint) {
        return a.positionHint - b.positionHint;
      }
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  const normalizedLastOwner = lastOwnerBarberoId
    ? ownerOrder.find((ownerKey) => ownerKey === lastOwnerBarberoId) ?? null
    : null;

  let ownerIndex =
    normalizedLastOwner == null ? 0 : (ownerOrder.indexOf(normalizedLastOwner) + 1) % ownerOrder.length;
  const ordered: T[] = [];

  while (ordered.length < items.length) {
    let appended = false;

    for (let offset = 0; offset < ownerOrder.length; offset += 1) {
      const currentIndex = (ownerIndex + offset) % ownerOrder.length;
      const ownerKey = ownerOrder[currentIndex];
      const bucket = buckets.get(ownerKey);
      const nextItem = bucket?.shift();

      if (!nextItem) {
        continue;
      }

      ordered.push(nextItem);
      ownerIndex = (currentIndex + 1) % ownerOrder.length;
      appended = true;
      break;
    }

    if (!appended) {
      break;
    }
  }

  return ordered;
}

export function buildJamSummary(input: {
  session: JamSessionLike;
  queueRows: JamQueueRowLike[];
  joinEvents: Array<typeof musicEvents.$inferSelect>;
}): MusicDashboardState["jam"] {
  if (!input.session) {
    return {
      active: false,
      sessionId: null,
      hostBarberoId: null,
      hostBarberoNombre: null,
      startedAt: null,
      participants: [],
    };
  }

  const participants = new Map<
    string,
    {
      barberoId: string;
      nombre: string;
      joinedAt: string | null;
      isHost: boolean;
      trackCount: number;
    }
  >();

  if (input.session.hostBarberoId && input.session.hostBarberoNombre) {
    participants.set(input.session.hostBarberoId, {
      barberoId: input.session.hostBarberoId,
      nombre: input.session.hostBarberoNombre,
      joinedAt: input.session.startedAt.toISOString(),
      isHost: true,
      trackCount: 0,
    });
  }

  for (const event of input.joinEvents) {
    const payload = parseJamJoinPayload(event.payload);
    if (!payload || payload.sessionId !== input.session.id) {
      continue;
    }

    const existing = participants.get(payload.barberoId);
    if (existing) {
      existing.joinedAt ??= event.createdAt.toISOString();
      continue;
    }

    participants.set(payload.barberoId, {
      barberoId: payload.barberoId,
      nombre: payload.barberoNombre,
      joinedAt: event.createdAt.toISOString(),
      isHost: payload.barberoId === input.session.hostBarberoId,
      trackCount: 0,
    });
  }

  for (const item of input.queueRows) {
    if (!item.ownerBarberoId || !item.ownerBarberoNombre) {
      continue;
    }

    const existing = participants.get(item.ownerBarberoId);
    if (existing) {
      existing.trackCount += 1;
      existing.joinedAt ??= item.createdAt.toISOString();
      continue;
    }

    participants.set(item.ownerBarberoId, {
      barberoId: item.ownerBarberoId,
      nombre: item.ownerBarberoNombre,
      joinedAt: item.createdAt.toISOString(),
      isHost: item.ownerBarberoId === input.session.hostBarberoId,
      trackCount: 1,
    });
  }

  return {
    active: true,
    sessionId: input.session.id,
    hostBarberoId: input.session.hostBarberoId ?? null,
    hostBarberoNombre: input.session.hostBarberoNombre ?? null,
    startedAt: input.session.startedAt.toISOString(),
    participants: Array.from(participants.values()).sort((a, b) => {
      if (a.isHost !== b.isHost) {
        return a.isHost ? -1 : 1;
      }
      if (a.trackCount !== b.trackCount) {
        return b.trackCount - a.trackCount;
      }
      return a.nombre.localeCompare(b.nombre, "es-AR");
    }),
  };
}
