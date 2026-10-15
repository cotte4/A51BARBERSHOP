"use client";

import { useState, useTransition } from "react";
import Escudo from "@/components/torneo/Escudo";
import { cambiarEquipoPremiumAction } from "./actions";

type Sorteado = { id: string; alias: string; equipo: string | null };
type Libre = { id: string; nombre: string };
type Pedido = { tipo: "reroll" } | { tipo: "elegir"; equipoId: string; nombre: string };

/**
 * La ventana premium en el celular de Pinky: elige a quién, y "Girar de nuevo" o "Elegir equipo".
 * La plata se arregla en el local; acá solo queda el cambio y la tele lo anima.
 */
export default function VentanaPremium({
  sorteados,
  libres,
  ocupado,
  alCerrar,
}: {
  sorteados: Sorteado[];
  libres: Libre[];
  ocupado: boolean;
  alCerrar: () => void;
}) {
  const [pendiente, startTransition] = useTransition();
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const [eligiendoEquipo, setEligiendoEquipo] = useState(false);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  const elegido = sorteados.find((s) => s.id === elegidoId) ?? null;
  const trabado = pendiente || ocupado;

  function cambiar(pedido: Pedido) {
    if (!elegido) return;
    const pregunta =
      pedido.tipo === "reroll"
        ? `¿${elegido.alias} pagó $5.000? Su ruleta vuelve a girar en la tele.`
        : `¿${elegido.alias} pagó $10.000? Se queda con ${pedido.nombre}.`;
    if (!window.confirm(pregunta)) return;
    setAviso(null);
    startTransition(async () => {
      const resultado = await cambiarEquipoPremiumAction(
        pedido.tipo === "reroll"
          ? { jugadorId: elegido.id, tipo: "reroll" }
          : { jugadorId: elegido.id, tipo: "elegir", equipoId: pedido.equipoId },
      );
      if (!resultado.ok) {
        setAviso({ tono: "error", texto: resultado.mensaje ?? "No se pudo cambiar." });
        return;
      }
      setAviso({ tono: "ok", texto: `${elegido.alias} ahora juega con ${resultado.equipo}. Mirá la tele.` });
      setElegidoId(null);
      setEligiendoEquipo(false);
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-[22px] border border-[#8cff59]/40 bg-[#8cff59]/[0.06] p-4 shadow-[0_0_40px_rgba(140,255,89,0.12)]">
      <div>
        <p className="eyebrow text-[11px] font-semibold">En la tele ahora</p>
        <p className="font-display mt-1 text-xl font-semibold text-white">Ventana premium abierta</p>
        <p className="mt-1 text-sm text-zinc-400">{elegido ? "¿Qué pagó?" : "Tocá al jugador que pagó."}</p>
      </div>

      {aviso ? (
        <p
          role={aviso.tono === "error" ? "alert" : "status"}
          className={`rounded-xl border px-3 py-2 text-sm ${
            aviso.tono === "ok"
              ? "border-[#8cff59]/25 bg-[#8cff59]/10 text-[#8cff59]"
              : "border-red-500/35 bg-red-500/10 text-red-300"
          }`}
        >
          {aviso.texto}
        </p>
      ) : null}

      {!elegido ? (
        <ul className="grid grid-cols-2 gap-2">
          {sorteados.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                disabled={trabado}
                onClick={() => {
                  setElegidoId(s.id);
                  setAviso(null);
                }}
                className="flex min-h-14 w-full items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-2.5 py-2 text-left hover:border-[#8cff59]/40 disabled:opacity-60"
              >
                <Escudo equipo={s.equipo} tamano={32} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{s.alias}</span>
                  <span className="block truncate text-xs text-zinc-500">{s.equipo ?? "Sin equipo"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
            <Escudo equipo={elegido.equipo} tamano={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">{elegido.alias}</p>
              <p className="truncate text-sm text-zinc-400">{elegido.equipo ?? "Sin equipo"}</p>
            </div>
            <button
              type="button"
              disabled={trabado}
              onClick={() => {
                setElegidoId(null);
                setEligiendoEquipo(false);
              }}
              className="min-h-11 px-2 text-sm text-zinc-400 hover:text-white"
            >
              Otro jugador
            </button>
          </div>

          {!eligiendoEquipo ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={trabado || libres.length === 0}
                onClick={() => cambiar({ tipo: "reroll" })}
                className="neon-button flex min-h-16 flex-col items-center justify-center rounded-[20px] px-3 font-bold leading-tight disabled:opacity-50"
              >
                Girar de nuevo
                <span className="text-xs font-semibold opacity-70">$5.000</span>
              </button>
              <button
                type="button"
                disabled={trabado || libres.length === 0}
                onClick={() => setEligiendoEquipo(true)}
                className="ghost-button flex min-h-16 flex-col items-center justify-center rounded-[20px] px-3 font-bold leading-tight disabled:opacity-50"
              >
                Elegir equipo
                <span className="text-xs font-semibold opacity-70">$10.000</span>
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm text-zinc-400">Equipos libres</p>
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {libres.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      disabled={trabado}
                      onClick={() => cambiar({ tipo: "elegir", equipoId: e.id, nombre: e.nombre })}
                      className="flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-2 hover:border-[#8cff59]/50 disabled:opacity-60"
                    >
                      <Escudo equipo={e.nombre} tamano={44} />
                      <span className="w-full truncate text-center text-xs font-medium text-zinc-300">{e.nombre}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setEligiendoEquipo(false)}
                className="mt-2 min-h-11 px-1 text-sm text-zinc-400 hover:text-white"
              >
                Volver
              </button>
            </div>
          )}
          {libres.length === 0 ? <p className="text-sm text-amber-300">No quedan equipos libres.</p> : null}
        </div>
      )}

      <button
        type="button"
        disabled={trabado}
        onClick={alCerrar}
        className="neon-button flex min-h-16 w-full items-center justify-center gap-2 rounded-[22px] px-5 text-lg font-bold disabled:opacity-60"
      >
        Cerrar ventana y seguir a los cruces
      </button>
    </div>
  );
}
