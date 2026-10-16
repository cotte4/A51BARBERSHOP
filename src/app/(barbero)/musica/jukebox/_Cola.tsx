"use client";

import type { JukeboxProposalSummary, JukeboxQueueItem } from "@/lib/jukebox";
import type { FuenteJukebox } from "@/lib/jukebox-runtime";

type Props = {
  queue: JukeboxQueueItem[];
  proposals: JukeboxProposalSummary[];
  ocupado: string | null;
  fuente: FuenteJukebox;
  onQuitar: (id: string) => void;
  onAprobar: (id: string) => void;
  onRechazar: (id: string) => void;
};

/** Lo que viene, en el orden en que va a sonar. Arriba, lo que la gente pidió y espera el ok de Pinky. */
export default function Cola({ queue, proposals, ocupado, fuente, onQuitar, onAprobar, onRechazar }: Props) {
  const siguen = queue.filter((i) => i.state === "queued");

  return (
    <>
      {proposals.length > 0 ? (
        <section className="rounded-[28px] border border-[#8cff59]/30 bg-[#8cff59]/[0.05] p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-white">Pedidos para aprobar</h2>
            <span className="text-sm font-semibold tabular-nums text-[#8cff59]">{proposals.length}</span>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {proposals.map((p) => (
              <li key={p.id} className="pop-in rounded-2xl border border-zinc-800 bg-zinc-950/70 p-2.5">
                <Fila tapa={p.thumbnailUrl} titulo={p.videoTitle} detalle={detalle(p.channelTitle, p.proposedByName)} />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={ocupado !== null}
                    onClick={() => onAprobar(p.id)}
                    className="min-h-11 rounded-xl border border-[#8cff59]/35 bg-[#8cff59]/10 text-sm font-semibold text-[#d8ffc7] transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-50"
                  >
                    A la cola
                  </button>
                  <button
                    type="button"
                    disabled={ocupado !== null}
                    onClick={() => onRechazar(p.id)}
                    className="min-h-11 rounded-xl border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-300 transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-50"
                  >
                    No
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel-card rounded-[28px] p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-white">Lo que viene</h2>
          {siguen.length > 0 ? <span className="text-sm tabular-nums text-zinc-500">{siguen.length}</span> : null}
        </div>

        {siguen.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {fuente === "spotify" ? "La cola está vacía. Mientras, suena tu lista de Spotify." : "La cola está vacía."}
          </p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2">
            {siguen.map((item, i) => (
              <li key={item.id} className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/70 py-2 pl-2.5 pr-1">
                <span className="w-5 shrink-0 text-center font-mono text-xs font-bold tabular-nums text-zinc-500">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Fila tapa={item.thumbnailUrl} titulo={item.videoTitle} detalle={detalle(item.channelTitle, item.proposedByName)} />
                </div>
                {item.enSpotify ? (
                  // Ya está en la cola de Spotify: no se puede sacar, pero sí saltar cuando arranque.
                  <span
                    className="flex h-11 shrink-0 items-center gap-1 px-2 text-xs font-semibold text-[#1ed760]"
                    title="Ya está en Spotify: suena a continuación"
                  >
                    <IconoCandado />
                    Sigue
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={ocupado !== null}
                    onClick={() => onQuitar(item.id)}
                    aria-label={`Quitar ${item.videoTitle}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-transform duration-150 ease-out hover:bg-white/5 hover:text-red-300 active:scale-[0.92] disabled:opacity-50"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

function detalle(artistas: string, quien: string): string {
  return quien ? `${artistas} · ${quien}` : artistas;
}

function Fila({ tapa, titulo, detalle }: { tapa: string | null; titulo: string; detalle: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {tapa ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tapa} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="h-11 w-11 shrink-0 rounded-lg bg-zinc-800" />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{titulo}</p>
        <p className="truncate text-xs text-zinc-500">{detalle}</p>
      </div>
    </div>
  );
}

function IconoCandado() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" strokeLinecap="round" />
    </svg>
  );
}
