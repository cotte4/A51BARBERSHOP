"use client";

import { useCallback, useEffect, useState } from "react";
import JukeboxPlayer from "@/components/musica/JukeboxPlayer";
import JukeboxProposalsSection from "@/components/musica/JukeboxProposalsSection";
import JukeboxQueueSection from "@/components/musica/JukeboxQueueSection";
import { pauseMusicAction } from "@/app/(barbero)/musica/actions";
import type { JukeboxStaffState } from "@/lib/jukebox";
import {
  approveJukeboxProposalAction,
  dismissJukeboxProposalAction,
  removeJukeboxQueuedAction,
  skipJukeboxAction,
  toggleJukeboxAutoApproveAction,
} from "./actions";

const POLL_INTERVAL_MS = 3000;

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <div className="fixed bottom-24 right-4 z-50 max-w-xs rounded-2xl border border-[#8cff59]/30 bg-zinc-900 px-4 py-3 text-sm text-white shadow-xl">
      {message}
    </div>
  );
}

/**
 * Pantalla del staff para el jukebox social.
 *
 * - La verdad vive en el servidor: el estado se sondea cada 3 s desde /api/jukebox/staff.
 *   `initial` solo evita una pantalla vacía en el primer render; al volver atrás el navegador puede
 *   reusar un payload viejo, y el primer sondeo (al montar) lo pisa enseguida.
 * - "Activo" es estado local y arranca apagado a propósito: el audio solo puede empezar con un toque
 *   de la persona, así que no tiene sentido recordarlo entre visitas.
 */
export default function JukeboxStaff({ initial }: { initial: JukeboxStaffState }) {
  const [state, setState] = useState<JukeboxStaffState>(initial);
  const [active, setActive] = useState(false);
  const [offline, setOffline] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/jukebox/staff", { cache: "no-store" });
      if (!res.ok) throw new Error(`staff ${res.status}`);
      setState((await res.json()) as JukeboxStaffState);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;

    async function loop() {
      await refresh();
      if (!stopped) timer = window.setTimeout(loop, POLL_INTERVAL_MS);
    }
    void loop();

    function onVisibilityChange() {
      if (!document.hidden) void refresh();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  const dismissFeedback = useCallback(() => setFeedback(null), []);

  function runMutation(
    task: () => Promise<{ error?: string }>,
    successMessage: string,
    actionId: string,
  ) {
    setPendingAction(actionId);
    task()
      .then((result) => {
        setFeedback(result.error ?? successMessage);
        return refresh();
      })
      .catch(() => {
        setFeedback("Algo salió mal. Intentá de nuevo.");
      })
      .finally(() => {
        setPendingAction(null);
      });
  }

  function toggleJukebox() {
    if (active) {
      setActive(false);
      setFeedback("Jukebox apagado. Spotify no se reanuda solo.");
      return;
    }
    // Este toque es el gesto que deja sonar el video. Un solo parlante: se pausa Spotify para no pisarse.
    setActive(true);
    void pauseMusicAction().catch(() => undefined);
    setFeedback("Jukebox activado. Dejá esta pantalla abierta y prendida: si salís de acá, la música se corta.");
  }

  return (
    <div className="space-y-6">
      {feedback ? <Toast message={feedback} onDismiss={dismissFeedback} /> : null}

      {active ? <JukeboxPlayer nowPlaying={state.nowPlaying} /> : null}

      <section className="rounded-[30px] border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Modo</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Jukebox social</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {active
                ? "Suena en este celular. Apagalo cuando termines el turno."
                : "Activalo para que el local reproduzca los temas del público desde este celular."}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleJukebox}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold transition-colors ${
              active
                ? "border border-red-400/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                : "bg-[#8cff59] text-[#07130a] hover:bg-[#b6ff84]"
            }`}
          >
            {active ? "Apagar Jukebox" : "Activar Jukebox"}
          </button>
        </div>
        {active && !state.nowPlaying ? (
          <p className="mt-3 rounded-2xl border border-[#8cff59]/20 bg-[#8cff59]/8 px-4 py-2.5 text-sm text-[#d8ffc7]">
            Activo. Esperando el primer tema de la cola.
          </p>
        ) : null}
        {offline ? (
          <p className="mt-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200">
            Sin conexión con el servidor. Reintentando.
          </p>
        ) : null}
      </section>

      <JukeboxProposalsSection
        proposals={state.proposals}
        pendingAction={pendingAction}
        onApprove={(id) =>
          runMutation(
            () => approveJukeboxProposalAction(id),
            "Propuesta aprobada — a la cola.",
            `jukebox-approve-${id}`,
          )
        }
        onDismiss={(id) =>
          runMutation(
            () => dismissJukeboxProposalAction(id),
            "Propuesta rechazada.",
            `jukebox-dismiss-${id}`,
          )
        }
      />
      <JukeboxQueueSection
        queue={state.queue}
        autoApproveEnabled={state.autoApprove}
        pendingAction={pendingAction}
        onSkip={() => runMutation(() => skipJukeboxAction(), "Tema saltado.", "jukebox-skip")}
        onRemove={(queueItemId) =>
          runMutation(
            () => removeJukeboxQueuedAction(queueItemId),
            "Tema quitado de la cola.",
            `jukebox-remove-${queueItemId}`,
          )
        }
        onToggleAutoApprove={(enabled) =>
          runMutation(
            () => toggleJukeboxAutoApproveAction(enabled),
            enabled ? "Auto-aprobar activado." : "Auto-aprobar desactivado.",
            "jukebox-auto-toggle",
          )
        }
      />
    </div>
  );
}
