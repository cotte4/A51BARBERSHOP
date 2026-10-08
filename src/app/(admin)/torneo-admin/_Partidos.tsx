"use client";

import { useState, useTransition } from "react";
import { GOLES_MAX } from "@/lib/torneo";
import Escudo from "@/components/torneo/Escudo";
import { cargarResultadoAction } from "./actions";

export type PartidoVista = {
  id: string;
  ronda: number;
  posicion: number;
  jugadorAId: string | null;
  jugadorBId: string | null;
  ganadorId: string | null;
  marcadorA: number | null;
  marcadorB: number | null;
  esBye: boolean;
  estado: "pendiente" | "listo" | "jugado";
};

/** `alias` es lo que se ve en la tele; `nombre` (completo) solo se ve acá. */
export type JugadorInfo = { alias: string; nombre: string; equipoNombre: string | null };

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

  // Un cruce se puede corregir mientras el partido al que lleva no se jugó (lo mismo valida el servidor).
  const siguienteJugado = (p: PartidoVista) =>
    partidos.some(
      (q) => q.ronda === p.ronda + 1 && q.posicion === Math.ceil(p.posicion / 2) && q.estado === "jugado",
    );

  return (
    <div className="flex flex-col gap-6">
      {campeon ? (
        <div className="relative overflow-hidden rounded-[24px] border border-[#8cff59]/35 bg-[radial-gradient(circle_at_top,rgba(140,255,89,0.22),rgba(9,9,11,0.9)_70%)] px-5 py-6 text-center shadow-[0_0_48px_rgba(140,255,89,0.12)] motion-safe:animate-[a51-scale-in_0.6s_cubic-bezier(0.22,1,0.36,1)_both]">
          <p className="eyebrow text-[11px] font-semibold">Campeón</p>
          {campeon.equipoNombre ? (
            <div className="mt-3 flex justify-center">
              <Escudo equipo={campeon.equipoNombre} tamano={72} />
            </div>
          ) : null}
          <p className="font-display mt-3 text-4xl font-bold text-[#8cff59] [text-shadow:0_0_24px_rgba(140,255,89,0.45)]">
            {campeon.alias}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {campeon.nombre}
            {campeon.equipoNombre ? ` · ${campeon.equipoNombre}` : ""}
          </p>
        </div>
      ) : null}

      {rondas.map((ronda) => {
        const deLaRonda = partidos.filter((p) => p.ronda === ronda).sort((a, b) => a.posicion - b.posicion);
        const jugables = deLaRonda.filter((p) => !p.esBye);
        const jugados = jugables.filter((p) => p.estado === "jugado").length;
        return (
          <div key={ronda} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#b6ff84]">{nombreRonda(ronda, maxRonda)}</p>
              {jugables.length > 1 ? (
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-300">
                  {jugados}/{jugables.length}
                </span>
              ) : null}
              <span className="h-px flex-1 bg-gradient-to-r from-zinc-700/80 to-transparent" />
            </div>
            <div className={`grid grid-cols-1 gap-3 ${deLaRonda.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {deLaRonda.map((partido) => (
                <PartidoCard
                  // Si el resultado cambia desde otro celular, la tarjeta arranca de nuevo con lo guardado.
                  key={`${partido.id}-${partido.ganadorId}-${partido.marcadorA}-${partido.marcadorB}`}
                  partido={partido}
                  jugadores={jugadores}
                  bloqueado={siguienteJugado(partido)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** "3" -> 3; vacío o cualquier otra cosa -> null. */
function aGoles(texto: string): number | null {
  if (!/^\d{1,2}$/.test(texto)) return null;
  const n = Number(texto);
  return n <= GOLES_MAX ? n : null;
}

function PartidoCard({
  partido,
  jugadores,
  bloqueado,
}: {
  partido: PartidoVista;
  jugadores: Map<string, JugadorInfo>;
  bloqueado: boolean;
}) {
  const [golesA, setGolesA] = useState(partido.marcadorA?.toString() ?? "");
  const [golesB, setGolesB] = useState(partido.marcadorB?.toString() ?? "");
  const guardadoPenales =
    partido.ganadorId && partido.marcadorA !== null && partido.marcadorA === partido.marcadorB
      ? partido.ganadorId
      : null;
  const [penales, setPenales] = useState<string | null>(guardadoPenales);
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (partido.esBye) {
    const id = partido.jugadorAId ?? partido.jugadorBId;
    const info = id ? jugadores.get(id) : undefined;
    if (!info) return null;
    return (
      <p className="flex min-h-12 items-center rounded-[22px] border border-zinc-800/80 px-4 text-sm text-zinc-500">
        {info.alias} pasa directo
      </p>
    );
  }

  const { jugadorAId, jugadorBId } = partido;
  if (!jugadorAId || !jugadorBId) {
    return (
      <p className="flex min-h-12 items-center rounded-[22px] border border-dashed border-zinc-800 px-4 py-3 text-sm text-zinc-500">
        Cruce {partido.posicion} · esperando rivales
      </p>
    );
  }

  const a = jugadores.get(jugadorAId);
  const b = jugadores.get(jugadorBId);
  const nA = aGoles(golesA);
  const nB = aGoles(golesB);
  const empate = nA !== null && nB !== null && nA === nB;
  const ganadorId =
    nA === null || nB === null ? null : nA > nB ? jugadorAId : nB > nA ? jugadorBId : penales;
  const ganador = ganadorId ? jugadores.get(ganadorId) : undefined;

  const jugado = partido.estado === "jugado";
  const sinCambios =
    jugado && nA === partido.marcadorA && nB === partido.marcadorB && ganadorId === partido.ganadorId;
  const puedeGuardar = !bloqueado && !pendiente && ganadorId !== null && !sinCambios;

  function guardar() {
    if (nA === null || nB === null || !ganadorId) return;
    // Solo se pregunta al corregir: cargar el primer resultado es un toque.
    if (jugado) {
      const texto = `${a?.alias} ${nA} – ${nB} ${b?.alias}${empate ? ` (penales: ${ganador?.alias})` : ""}`;
      if (!window.confirm(`¿Corregir el resultado? Queda ${texto}.`)) return;
    }
    setError(null);
    startTransition(async () => {
      const resultado = await cargarResultadoAction({
        partidoId: partido.id,
        ganadorId,
        marcadorA: nA,
        marcadorB: nB,
      });
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-[22px] border p-3.5 transition-colors duration-300 ${
        jugado
          ? "border-zinc-800 bg-zinc-950/60"
          : "border-[#8cff59]/30 bg-[linear-gradient(160deg,rgba(140,255,89,0.07),rgba(9,9,11,0.85)_50%)]"
      }`}
    >
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Cruce {partido.posicion}</p>
        {jugado ? (
          <p className="rounded-full border border-[#8cff59]/25 bg-[#8cff59]/10 px-2 py-0.5 text-[11px] font-semibold text-[#8cff59]">
            Jugado
          </p>
        ) : (
          <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300 motion-safe:animate-pulse" />
            Por jugar
          </p>
        )}
      </div>

      <LadoGoles
        id={`${partido.id}-a`}
        info={a}
        goles={golesA}
        onGoles={setGolesA}
        gana={ganadorId === jugadorAId}
        porPenales={empate && ganadorId === jugadorAId}
        deshabilitado={bloqueado || pendiente}
      />
      <LadoGoles
        id={`${partido.id}-b`}
        info={b}
        goles={golesB}
        onGoles={setGolesB}
        gana={ganadorId === jugadorBId}
        porPenales={empate && ganadorId === jugadorBId}
        deshabilitado={bloqueado || pendiente}
      />

      {bloqueado ? (
        <p className="px-1 text-sm text-zinc-500">Ya se jugó el partido siguiente: este resultado no se cambia.</p>
      ) : (
        <>
          {empate ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-sm font-semibold text-amber-200">¿Quién ganó en los penales?</p>
              <div className="grid grid-cols-2 gap-2">
                {[jugadorAId, jugadorBId].map((id) => {
                  const elegido = penales === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={elegido}
                      disabled={pendiente}
                      onClick={() => setPenales(id)}
                      className={`min-h-12 truncate rounded-[18px] px-3 text-base font-semibold transition-transform active:scale-[0.97] ${
                        elegido ? "neon-button" : "ghost-button"
                      }`}
                    >
                      {jugadores.get(id)?.alias ?? "—"}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {ganador && !sinCambios ? (
            <p className="px-1 text-sm text-zinc-300">
              Gana <span className="font-semibold text-[#8cff59]">{ganador.alias}</span>
              {empate ? " por penales" : ""}
            </p>
          ) : null}

          {sinCambios ? (
            <p className="px-1 text-sm text-zinc-400">
              <span className="font-semibold text-[#8cff59]">Resultado guardado ✓</span> · para corregirlo, cambiá
              los goles.
            </p>
          ) : (
            <button
              type="button"
              onClick={guardar}
              disabled={!puedeGuardar}
              className="neon-button min-h-12 w-full rounded-[20px] px-5 py-3 text-base font-semibold transition-transform active:scale-[0.97] disabled:opacity-40"
            >
              {pendiente ? "Guardando…" : jugado ? "Corregir resultado" : "Guardar resultado"}
            </button>
          )}
        </>
      )}

      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Una fila del cruce: alias grande, nombre completo chico, y el campo de goles a la derecha. */
function LadoGoles({
  id,
  info,
  goles,
  onGoles,
  gana,
  porPenales,
  deshabilitado,
}: {
  id: string;
  info: JugadorInfo | undefined;
  goles: string;
  onGoles: (valor: string) => void;
  gana: boolean;
  porPenales: boolean;
  deshabilitado: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {info?.equipoNombre ? <Escudo equipo={info.equipoNombre} tamano={36} /> : null}
      <label htmlFor={id} className="min-w-0 flex-1">
        <span
          className={`block truncate font-semibold ${(info?.alias.length ?? 0) > 14 ? "text-base" : "text-lg"} ${gana ? "text-[#8cff59]" : "text-white"}`}
        >
          {info?.alias ?? "—"}
          {porPenales ? <span className="ml-1.5 text-xs font-medium text-amber-300">pen.</span> : null}
        </span>
        <span className="block truncate text-xs text-zinc-500">
          {info?.nombre}
          {info?.equipoNombre ? ` · ${info.equipoNombre}` : ""}
        </span>
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={2}
        placeholder="–"
        value={goles}
        disabled={deshabilitado}
        // Solo dígitos: en el celular el teclado numérico igual deja pegar cualquier cosa.
        onChange={(e) => onGoles(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={`Goles de ${info?.alias ?? "este jugador"}`}
        // globals.css fija el cuerpo de los inputs (anti-zoom de iOS) fuera de las capas de Tailwind: va por style.
        style={{ fontSize: 30 }}
        className={`h-14 w-16 shrink-0 rounded-2xl border bg-zinc-900 text-center font-display font-bold tabular-nums text-white placeholder:text-zinc-600 focus:border-[#8cff59]/70 focus:outline-none disabled:opacity-60 ${
          gana ? "border-[#8cff59]/60" : "border-zinc-700"
        }`}
      />
    </div>
  );
}
