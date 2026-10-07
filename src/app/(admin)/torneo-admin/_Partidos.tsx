"use client";

import { useState, useTransition } from "react";
import { cargarResultadoAction } from "./actions";

export type PartidoVista = {
  id: string;
  ronda: number;
  jugadorAId: string | null;
  jugadorBId: string | null;
  ganadorId: string | null;
  esBye: boolean;
  estado: "pendiente" | "listo" | "jugado";
};

export type JugadorInfo = { nombre: string; equipoNombre: string | null };

type PartidosProps = {
  partidos: PartidoVista[];
  jugadores: Map<string, JugadorInfo>;
  finalizado: boolean;
};

function nombreRonda(ronda: number, maxRonda: number): string {
  const desdeLaFinal = maxRonda - ronda;
  if (desdeLaFinal === 0) return "Final";
  if (desdeLaFinal === 1) return "Semifinales";
  if (desdeLaFinal === 2) return "Cuartos";
  if (desdeLaFinal === 3) return "Octavos";
  return `Ronda ${ronda}`;
}

export default function Partidos({ partidos, jugadores, finalizado }: PartidosProps) {
  const maxRonda = partidos.reduce((m, p) => Math.max(m, p.ronda), 0);
  const rondas = [...new Set(partidos.map((p) => p.ronda))].sort((a, b) => a - b);

  const final = partidos.find((p) => p.ronda === maxRonda);
  const campeon = finalizado && final?.ganadorId ? jugadores.get(final.ganadorId) : undefined;

  return (
    <div className="flex flex-col gap-6">
      {campeon ? (
        <div className="rounded-[22px] border border-[#8cff59]/25 bg-[#8cff59]/10 px-5 py-4">
          <p className="font-display text-2xl font-bold text-white">
            Campeón: <span className="text-[#8cff59]">{campeon.nombre}</span>
          </p>
          {campeon.equipoNombre ? (
            <p className="mt-1 text-sm text-zinc-400">{campeon.equipoNombre}</p>
          ) : null}
        </div>
      ) : null}

      {rondas.map((ronda) => (
        <div key={ronda} className="flex flex-col gap-3">
          <p className="eyebrow text-xs font-semibold">{nombreRonda(ronda, maxRonda)}</p>
          {partidos
            .filter((p) => p.ronda === ronda)
            .map((partido) => (
              <PartidoCard key={partido.id} partido={partido} jugadores={jugadores} />
            ))}
        </div>
      ))}
    </div>
  );
}

function PartidoCard({
  partido,
  jugadores,
}: {
  partido: PartidoVista;
  jugadores: Map<string, JugadorInfo>;
}) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (partido.esBye) {
    const id = partido.jugadorAId ?? partido.jugadorBId;
    const info = id ? jugadores.get(id) : undefined;
    if (!info) return null;
    return <p className="px-1 text-sm text-zinc-500">{info.nombre} pasa directo</p>;
  }

  const { jugadorAId, jugadorBId, ganadorId } = partido;
  if (!jugadorAId || !jugadorBId) {
    return <p className="px-1 text-sm text-zinc-500">Esperando rivales</p>;
  }

  function tocar(jugadorId: string) {
    const nombre = jugadores.get(jugadorId)?.nombre ?? "";
    const pregunta = ganadorId ? `¿Corregir? Pasa a ganar ${nombre}` : `¿Ganó ${nombre}?`;
    if (!window.confirm(pregunta)) return;
    setError(null);
    startTransition(async () => {
      const resultado = await cargarResultadoAction(partido.id, jugadorId);
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-[22px] border border-zinc-800 bg-zinc-950/60 p-3">
      <BotonJugador
        jugadorId={jugadorAId}
        jugadores={jugadores}
        ganadorId={ganadorId}
        pendiente={pendiente}
        onTocar={tocar}
      />
      <BotonJugador
        jugadorId={jugadorBId}
        jugadores={jugadores}
        ganadorId={ganadorId}
        pendiente={pendiente}
        onTocar={tocar}
      />
      {error ? (
        <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function BotonJugador({
  jugadorId,
  jugadores,
  ganadorId,
  pendiente,
  onTocar,
}: {
  jugadorId: string;
  jugadores: Map<string, JugadorInfo>;
  ganadorId: string | null;
  pendiente: boolean;
  onTocar: (jugadorId: string) => void;
}) {
  const info = jugadores.get(jugadorId);
  const esGanador = ganadorId === jugadorId;
  const clase = esGanador
    ? "neon-button disabled:opacity-100"
    : "ghost-button disabled:opacity-60";

  return (
    <button
      type="button"
      disabled={pendiente || esGanador}
      onClick={() => onTocar(jugadorId)}
      className={`${clase} flex min-h-[52px] w-full flex-col items-start justify-center rounded-[20px] px-5 py-3 text-left`}
    >
      <span className="text-lg font-semibold">
        {esGanador ? "✓ " : ""}
        {info?.nombre ?? "—"}
      </span>
      {info?.equipoNombre ? <span className="text-xs opacity-80">{info.equipoNombre}</span> : null}
    </button>
  );
}
