"use client";

import type { JukeboxProposalSummary } from "@/lib/jukebox";
import { ActionButton } from "@/components/musica/MusicOperationConsoleSections";

type Props = {
  proposals: JukeboxProposalSummary[];
  pendingAction: string | null;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
};

function formatRelative(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

export default function JukeboxProposalsSection({
  proposals,
  pendingAction,
  onApprove,
  onDismiss,
}: Props) {
  return (
    <section className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Jukebox</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Propuestas del público</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          {proposals.length} pendientes
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {proposals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
            Nadie propuso canciones aún.
          </div>
        ) : null}

        {proposals.map((p) => (
          <div
            key={p.id}
            className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-4"
          >
            <div className="flex flex-wrap items-start gap-3">
              {p.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.thumbnailUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold text-white">{p.videoTitle}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {p.channelTitle} · Propuesto por{" "}
                  <span className="font-medium text-zinc-300">{p.proposedByName}</span>
                  {" · "}{formatRelative(p.createdAt)}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <ActionButton
                actionId={`jukebox-approve-${p.id}`}
                pendingAction={pendingAction}
                onClick={() => onApprove(p.id)}
                className="rounded-2xl border border-[#8cff59]/30 bg-[#8cff59]/10 px-4 py-2.5 text-sm font-semibold text-[#d8ffc7] hover:bg-[#8cff59]/20 disabled:opacity-50"
              >
                A la cola
              </ActionButton>
              <ActionButton
                actionId={`jukebox-dismiss-${p.id}`}
                pendingAction={pendingAction}
                onClick={() => onDismiss(p.id)}
                className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                Rechazar
              </ActionButton>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
