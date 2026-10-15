"use client";

import { useState, useTransition } from "react";
import Escudo from "@/components/torneo/Escudo";
import { elegirMejorGolAction } from "./actions";
import type { JugadorInfo, PartidoVista } from "./_Partidos";

/** Pinky elige en qué partido fue el mejor gol y quién lo hizo. Sale en la pantalla final de la tele. */
export default function MejorGol({
  partidos,
  jugadores,
  elegido,
  nombreGrupo,
}: {
  /** Solo los partidos jugados. */
  partidos: PartidoVista[];
  jugadores: Map<string, JugadorInfo>;
  elegido: { partidoId: string; jugadorId: string } | null;
  nombreGrupo: (p: PartidoVista) => string;
}) {
  const [pendiente, startTransition] = useTransition();
  const [partidoId, setPartidoId] = useState<string>(elegido?.partidoId ?? "");
  const [error, setError] = useState<string | null>(null);

  const alias = (id: string | null) => (id ? (jugadores.get(id)?.alias ?? "—") : "—");
  const partido = partidos.find((p) => p.id === partidoId);
  const autor = elegido ? jugadores.get(elegido.jugadorId) : undefined;

  function guardar(eleccion: { partidoId: string; jugadorId: string } | null) {
    setError(null);
    startTransition(async () => {
      const resultado = await elegirMejorGolAction(eleccion);
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b6ff84]">Mejor gol</p>

      {autor && elegido ? (
        <div className="mt-3 flex items-center gap-3">
          <Escudo equipo={autor.equipoNombre} tamano={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">{autor.alias}</p>
            <p className="truncate text-sm text-zinc-400">
              {(() => {
                const p = partidos.find((x) => x.id === elegido.partidoId);
                return p ? `${nombreGrupo(p)} · ${alias(p.jugadorAId)} vs ${alias(p.jugadorBId)}` : "";
              })()}
            </p>
          </div>
          <button
            type="button"
            disabled={pendiente}
            onClick={() => {
              setPartidoId("");
              guardar(null);
            }}
            className="min-h-11 px-2 text-sm text-zinc-400 hover:text-amber-300 disabled:opacity-60"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-300">¿En qué partido fue?</span>
            <select
              value={partidoId}
              onChange={(e) => setPartidoId(e.target.value)}
              disabled={pendiente}
              className="min-h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-white focus:border-[#8cff59]/60 focus:outline-none"
            >
              <option value="">Elegí el partido</option>
              {partidos.map((p) => (
                <option key={p.id} value={p.id}>
                  {nombreGrupo(p)} · {alias(p.jugadorAId)} vs {alias(p.jugadorBId)}
                </option>
              ))}
            </select>
          </label>

          {partido ? (
            <div>
              <p className="mb-1.5 text-sm font-medium text-zinc-300">¿Quién lo hizo?</p>
              <div className="grid grid-cols-2 gap-2">
                {[partido.jugadorAId, partido.jugadorBId].map((id) =>
                  id ? (
                    <button
                      key={id}
                      type="button"
                      disabled={pendiente}
                      onClick={() => guardar({ partidoId: partido.id, jugadorId: id })}
                      className="flex min-h-14 items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 px-3 text-left hover:border-[#8cff59]/50 disabled:opacity-60"
                    >
                      <Escudo equipo={jugadores.get(id)?.equipoNombre ?? null} tamano={30} />
                      <span className="min-w-0 truncate font-semibold text-white">{alias(id)}</span>
                    </button>
                  ) : null,
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
