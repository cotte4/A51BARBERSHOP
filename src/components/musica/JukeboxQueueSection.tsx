"use client";

import type { JukeboxQueueItem } from "@/lib/jukebox";
import { ActionButton } from "@/components/musica/MusicOperationConsoleSections";

type Props = {
  queue: JukeboxQueueItem[];
  autoApproveEnabled: boolean;
  pendingAction: string | null;
  onSkip: () => void;
  onToggleAutoApprove: (enabled: boolean) => void;
};

export default function JukeboxQueueSection({
  queue,
  autoApproveEnabled,
  pendingAction,
  onSkip,
  onToggleAutoApprove,
}: Props) {
  const nowPlaying = queue.find((i) => i.state === "playing") ?? null;
  const upcoming = queue.filter((i) => i.state === "queued");

  return (
    <section className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Jukebox</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Cola del local</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          {queue.length} items
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-zinc-300">Auto-aprobar propuestas</p>
          <p className="text-xs text-zinc-500">Las propuestas del público entran directo a la cola</p>
        </div>
        <button
          type="button"
          onClick={() => onToggleAutoApprove(!autoApproveEnabled)}
          disabled={pendingAction === "jukebox-auto-toggle"}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            autoApproveEnabled ? "bg-[#8cff59]" : "bg-zinc-700"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              autoApproveEnabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {queue.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
            Todavía no hay temas en la cola Jukebox.
          </div>
        ) : null}

        {nowPlaying ? (
          <div className="rounded-3xl border border-[#8cff59]/25 bg-[#8cff59]/8 p-4">
            <div className="flex items-start gap-3">
              {nowPlaying.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={nowPlaying.thumbnailUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-xl object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-[#8cff59]/30 bg-[#8cff59]/15 px-2 py-0.5 text-xs font-semibold text-[#d8ffc7]">
                    En aire
                  </span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-white">
                  {nowPlaying.videoTitle}
                </p>
                <p className="text-xs text-zinc-400">
                  {nowPlaying.channelTitle} · {nowPlaying.proposedByName}
                </p>
              </div>
              <ActionButton
                actionId="jukebox-skip"
                pendingAction={pendingAction}
                onClick={onSkip}
                className="shrink-0 rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                Saltar
              </ActionButton>
            </div>
          </div>
        ) : null}

        {upcoming.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-3xl border border-zinc-800 bg-zinc-950/60 p-3"
          >
            <span className="w-6 shrink-0 text-center text-xs font-bold tabular-nums text-zinc-500">
              {idx + 1}
            </span>
            {item.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnailUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-xl object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{item.videoTitle}</p>
              <p className="truncate text-xs text-zinc-400">
                {item.channelTitle} · {item.proposedByName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
