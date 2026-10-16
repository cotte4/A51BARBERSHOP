"use client";

import { useCallback, useEffect, useState } from "react";
import JukeboxPlayer from "@/components/musica/JukeboxPlayer";
import type { JukeboxStaffState } from "@/lib/jukebox-spotify";
import {
  approveJukeboxProposalAction,
  cambiarFuenteJukeboxAction,
  dismissJukeboxProposalAction,
  pausaOPlayJukeboxAction,
  removeJukeboxQueuedAction,
  skipJukeboxAction,
  toggleJukeboxAutoApproveAction,
} from "./actions";
import Cola from "./_Cola";
import Conexion from "./_Conexion";
import Deck from "./_Deck";
import SumarTema from "./_SumarTema";

const POLL_INTERVAL_MS = 3000;

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, 3500);
    return () => window.clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <div
      role="status"
      className="pop-in fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-2xl border border-[#8cff59]/30 bg-zinc-900 px-4 py-3 text-sm text-white shadow-xl"
    >
      {message}
    </div>
  );
}

/**
 * La consola de Pinky para la jukebox.
 *
 * - La música sale del Spotify del local (su app, con el celu bloqueado o en el parlante). Esta pantalla no
 *   reproduce nada: muestra y controla. La cola avanza sola con los sondeos de cualquiera (ver latidoJukebox).
 * - La verdad vive en el servidor: se sondea /api/jukebox/staff cada 3 s. `initial` solo evita la pantalla
 *   vacía al entrar (al volver atrás el navegador puede reusar un payload viejo; el primer sondeo lo pisa).
 * - Salida de emergencia: si Spotify no anda, "¿Problemas con Spotify?" pasa la música a YouTube en este
 *   celu. Ahí sí hay que dejar la pantalla abierta, y el audio necesita un toque para arrancar.
 */
export default function JukeboxStaff({ initial, esAdmin }: { initial: JukeboxStaffState; esAdmin: boolean }) {
  const [state, setState] = useState<JukeboxStaffState>(initial);
  const [sonidoYoutube, setSonidoYoutube] = useState(false);
  const [offline, setOffline] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [ayuda, setAyuda] = useState(false);

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

  function correr(id: string, tarea: () => Promise<{ error?: string; aviso?: string }>, exito?: string) {
    setOcupado(id);
    tarea()
      .then((r) => {
        if (r.error) setFeedback(r.error);
        else if (r.aviso) setFeedback(r.aviso);
        else if (exito) setFeedback(exito);
        return refresh();
      })
      .catch(() => setFeedback("Algo salió mal. Probá de nuevo."))
      .finally(() => setOcupado(null));
  }

  function pasarAYoutube() {
    if (!window.confirm("¿Pasar la música a YouTube en este celular? Vas a tener que dejar esta pantalla abierta.")) {
      return;
    }
    // Este mismo toque es el gesto que el navegador exige para dejar sonar el video.
    setSonidoYoutube(true);
    setAyuda(false);
    correr("fuente", () => cambiarFuenteJukeboxAction("youtube"), "Listo: suena por YouTube desde este celular.");
  }

  function volverASpotify() {
    setSonidoYoutube(false);
    correr("fuente", () => cambiarFuenteJukeboxAction("spotify"), "Volvió a Spotify.");
  }

  const enYoutube = state.fuente === "youtube";
  const conectado = state.spotify?.conexion === "conectado";
  const hayCola = state.queue.some((i) => i.state === "queued");

  return (
    <div className="flex flex-col gap-4">
      {feedback ? <Toast message={feedback} onDismiss={dismissFeedback} /> : null}

      {offline ? (
        <p className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-200">
          Sin conexión con el servidor. Reintentando.
        </p>
      ) : null}

      {enYoutube ? (
        <section className="rounded-[22px] border border-amber-500/35 bg-amber-500/10 p-4">
          <p className="font-semibold text-amber-100">Modo YouTube: suena desde este celular</p>
          <p className="mt-1 text-sm leading-6 text-amber-200/80">
            Dejá esta pantalla abierta y prendida. Si salís o lo bloqueás, se corta.
          </p>
          {state.aviso ? (
            <p role="alert" className="mt-2 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.aviso}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {!sonidoYoutube ? (
              <button
                type="button"
                onClick={() => setSonidoYoutube(true)}
                className="neon-button min-h-12 rounded-[18px] px-4 text-sm font-semibold text-[#07130a] active:scale-[0.97]"
              >
                Activar sonido
              </button>
            ) : null}
            <button
              type="button"
              disabled={ocupado !== null}
              onClick={volverASpotify}
              className="min-h-12 rounded-[18px] border border-amber-400/40 px-4 text-sm font-semibold text-amber-100 active:scale-[0.97] disabled:opacity-50"
            >
              Volver a Spotify
            </button>
          </div>
        </section>
      ) : (
        <Conexion foto={state.spotify} />
      )}

      {/* Sin Spotify conectado no hay nada que manejar todavía: solo se ve el botón de conectar. */}
      {enYoutube || conectado ? (
        <>
          <Deck
            nowPlaying={state.nowPlaying}
            foto={state.spotify}
            fuente={state.fuente}
            hayCola={hayCola}
            ocupado={ocupado}
            onSaltar={() => correr("saltar", skipJukeboxAction)}
            onPausaPlay={() => correr("pausa", pausaOPlayJukeboxAction)}
          >
            {enYoutube && sonidoYoutube ? <JukeboxPlayer nowPlaying={state.nowPlaying} /> : null}
          </Deck>

          <Cola
            queue={state.queue}
            proposals={state.proposals}
            ocupado={ocupado}
            fuente={state.fuente}
            onQuitar={(id) => correr(`quitar-${id}`, () => removeJukeboxQueuedAction(id), "Tema quitado.")}
            onAprobar={(id) => correr(`aprobar-${id}`, () => approveJukeboxProposalAction(id), "A la cola.")}
            onRechazar={(id) => correr(`rechazar-${id}`, () => dismissJukeboxProposalAction(id))}
          />

          <SumarTema alSumar={(m) => {
            setFeedback(m);
            void refresh();
          }} />
        </>
      ) : null}

      <section className="flex flex-col gap-1 px-1 pt-2">
        {esAdmin ? (
          <div className="flex min-h-14 items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-200">Aprobar cada pedido</p>
              <p className="text-xs text-zinc-500">
                {state.autoApprove ? "Apagado: lo que pide la gente entra directo." : "Prendido: vos decidís qué entra."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!state.autoApprove}
              aria-label="Aprobar cada pedido"
              disabled={ocupado !== null}
              onClick={() => correr("auto", () => toggleJukeboxAutoApproveAction(!state.autoApprove))}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-60 ${
                !state.autoApprove ? "bg-[#8cff59]" : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-out ${
                  !state.autoApprove ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        ) : null}

        <a
          href="/jukebox"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-between text-sm text-zinc-400 hover:text-[#8cff59]"
        >
          Ver lo que ve la gente al escanear el QR
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>

        {!enYoutube ? (
          <>
            <button
              type="button"
              aria-expanded={ayuda}
              onClick={() => setAyuda((a) => !a)}
              className="flex min-h-12 items-center text-left text-sm text-zinc-500 hover:text-zinc-300"
            >
              ¿Problemas con Spotify?
            </button>
            {ayuda ? (
              <div className="pop-in rounded-[22px] border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-sm leading-6 text-zinc-300">Probá en este orden:</p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-zinc-400">
                  <li>Abrí Spotify en el celu o el parlante y poné cualquier tema.</li>
                  <li>
                    Si dice que no deja manejar la cuenta, la cuenta tiene que ser Premium y estar anotada en la app
                    de Spotify (eso lo hace Was).
                  </li>
                  <li>Si nada de eso anda, pasá a YouTube: la gente sigue pidiendo igual y suena desde este celular.</li>
                </ol>
                <button
                  type="button"
                  disabled={ocupado !== null}
                  onClick={pasarAYoutube}
                  className="mt-4 min-h-12 w-full rounded-[18px] border border-zinc-700 bg-zinc-900 text-sm font-semibold text-zinc-200 active:scale-[0.98] disabled:opacity-50"
                >
                  Pasar a YouTube en este celular
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
