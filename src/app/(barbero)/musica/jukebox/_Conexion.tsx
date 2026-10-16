"use client";

import SpotifyConnectButton from "@/components/musica/SpotifyConnectButton";
import type { FotoSpotify } from "@/lib/jukebox-runtime";

const VUELTA = "/musica/jukebox";

/**
 * Cómo está Spotify, del tamaño de lo que hay que hacer: si falta conectar, ocupa la pantalla con el
 * botón; si está todo bien, es una línea. Solo crece de nuevo si hay algo que Pinky tiene que resolver.
 */
export default function Conexion({ foto }: { foto: FotoSpotify | null }) {
  if (!foto) {
    return (
      <div className="flex min-h-11 items-center gap-2 px-1" aria-busy="true">
        <span className="skeleton h-2.5 w-2.5 rounded-full" />
        <span className="skeleton h-3 w-40 rounded-full" />
      </div>
    );
  }

  if (foto.conexion !== "conectado") {
    return (
      <section className="panel-card rounded-[28px] p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1ed760]/12 text-[#1ed760]">
          <IconoSpotify className="h-8 w-8" />
        </span>
        <h2 className="font-display mt-4 text-2xl font-semibold text-white">
          {foto.conexion === "error" ? "Volvé a conectar Spotify" : "Conectá tu Spotify"}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
          Una sola vez. Después la música sale de tu app de Spotify: con el celu bloqueado o en el parlante.
        </p>
        <div className="mt-5 flex justify-center">
          <SpotifyConnectButton
            returnTo={VUELTA}
            elegirCuenta
            label="Conectar Spotify"
            className="min-h-14 w-full max-w-xs rounded-[20px] bg-[#1ed760] px-6 text-base font-semibold text-[#06140b] transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-70"
          />
        </div>
      </section>
    );
  }

  const sinDispositivo = foto.estado === "sin_dispositivo";
  return (
    <div className="space-y-2">
      <div className="flex min-h-11 items-center gap-2.5 px-1">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${
            sinDispositivo ? "bg-amber-300" : "bg-[#1ed760] shadow-[0_0_10px_rgba(30,215,96,0.7)]"
          }`}
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 truncate text-sm text-zinc-300">
          <span className="font-semibold text-white">Spotify{foto.cuenta ? ` de ${foto.cuenta}` : ""}</span>
          {foto.dispositivo ? <span className="text-zinc-500"> · en {foto.dispositivo}</span> : null}
        </p>
        <SpotifyConnectButton
          returnTo={VUELTA}
          elegirCuenta
          label="Cambiar"
          className="min-h-11 shrink-0 rounded-xl px-2 text-sm font-medium text-zinc-500 hover:text-white"
        />
      </div>

      {sinDispositivo ? (
        <div className="rounded-[22px] border border-amber-500/35 bg-amber-500/10 p-4">
          <p className="font-semibold text-amber-100">Abrí Spotify y poné cualquier tema</p>
          <p className="mt-1 text-sm leading-6 text-amber-200/80">
            En el celu o en el parlante. La jukebox lo toma desde ahí y va metiendo los temas de la gente.
          </p>
        </div>
      ) : null}

      {foto.error && !sinDispositivo ? (
        <p role="alert" className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {foto.error}
        </p>
      ) : null}
    </div>
  );
}

export function IconoSpotify({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <path d="M7 9.6c3.3-1 7-.7 10 .9M7.6 12.7c2.7-.8 5.6-.5 8 .8M8.3 15.6c2-.5 4.1-.3 5.9.6" strokeLinecap="round" />
    </svg>
  );
}
