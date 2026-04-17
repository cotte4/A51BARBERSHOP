import { z } from "zod";
import { db } from "@/db";
import { jukeboxProposals } from "@/db/schema";
import {
  hashDeviceKey,
  canProposeAgain,
  isAutoApproveEnabled,
  enqueueApproved,
} from "@/lib/jukebox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const proposeSchema = z.object({
  videoId: z.string().trim().min(1).max(20),
  title: z.string().trim().min(1).max(200),
  channelTitle: z.string().trim().max(100).default(""),
  thumbnailUrl: z.string().url().optional().nullable(),
  durationSeconds: z.number().int().positive().optional().nullable(),
  proposerName: z.string().trim().min(2).max(40),
  deviceKey: z.string().trim().min(8).max(256),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = proposeSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const {
    videoId,
    title,
    channelTitle,
    thumbnailUrl,
    durationSeconds,
    proposerName,
    deviceKey,
  } = parsed.data;

  const deviceKeyHash = hashDeviceKey(deviceKey);
  const allowed = await canProposeAgain(deviceKeyHash);

  if (!allowed) {
    return Response.json(
      { error: "Esperá unos minutos antes de proponer otro tema." },
      { status: 429 }
    );
  }

  const autoApprove = await isAutoApproveEnabled();
  const status = autoApprove ? "approved" : "pending";

  const [inserted] = await db
    .insert(jukeboxProposals)
    .values({
      youtubeVideoId: videoId,
      videoTitle: title,
      channelTitle,
      thumbnailUrl: thumbnailUrl ?? null,
      durationSeconds: durationSeconds ?? null,
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
