"use client";

import { useState, useTransition } from "react";
import { ALIAS_MAX, ALIAS_MIN } from "@/lib/torneo";
import { reemplazarJugadorAction } from "./actions";

type Candidato = { id: string; alias: string; nombre: string };

type ReemplazoProps = {
  bajaId: string;
  nombre: string;
  espera: Candidato[];
  cuota: string;
};

const campo =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none";

/** "Se baja": otro jugador toma su equipo y su cruce. Solo antes del primer partido. */
export default function Reemplazo({ bajaId, nombre, espera, cuota }: ReemplazoProps) {
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enviar(input: unknown, quien: string) {
    const pregunta = `¿Le devolviste la cuota a ${nombre} y ${quien} pagó ${cuota}? Entra con el mismo equipo y el mismo cruce.`;
    if (!window.confirm(pregunta)) return;
    setError(null);
    startTransition(async () => {
      const resultado = await reemplazarJugadorAction(bajaId, input);
      if (!resultado.ok) setError(resultado.mensaje);
      else setAbierto(false);
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="min-h-11 self-start rounded-full border border-zinc-700 px-4 text-sm font-medium text-zinc-400 transition-[transform,color,border-color] duration-150 hover:border-amber-500/50 hover:text-amber-300 active:scale-[0.97]"
      >
        Se baja
      </button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] p-3.5 motion-safe:animate-[a51-fade-up_0.3s_cubic-bezier(0.22,1,0.36,1)_both]">
      <p className="font-display text-base font-semibold text-white">¿Quién entra por {nombre}?</p>

      {!nuevo ? (
        <>
          {espera.length === 0 ? (
            <p className="text-sm text-zinc-400">No hay nadie en lista de espera.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {espera.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() => enviar({ tipo: "espera", jugadorId: c.id }, c.alias)}
                    className="ghost-button flex min-h-12 w-full flex-col items-start rounded-[18px] px-4 py-2 text-left transition-transform active:scale-[0.98] disabled:opacity-60"
                  >
                    <span className="text-base font-semibold">
                      {c.alias}
                      {i === 0 ? <span className="ml-2 text-xs text-amber-300">el que sigue</span> : null}
                    </span>
                    <span className="text-xs opacity-75">{c.nombre}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setNuevo(true)}
            className="min-h-11 text-left text-sm text-zinc-400 hover:text-[#8cff59]"
          >
            Es una persona que no está anotada
          </button>
        </>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            const nombreNuevo = String(datos.get("nombre") ?? "");
            const aliasNuevo = String(datos.get("alias") ?? "").trim();
            enviar(
              {
                tipo: "nuevo",
                nombre: nombreNuevo,
                alias: String(datos.get("alias") ?? ""),
                email: String(datos.get("email") ?? ""),
                whatsapp: String(datos.get("whatsapp") ?? ""),
              },
              aliasNuevo || nombreNuevo,
            );
          }}
        >
          <input name="nombre" required placeholder="Nombre y apellido" autoComplete="off" className={campo} />
          <input
            name="alias"
            required
            minLength={ALIAS_MIN}
            maxLength={ALIAS_MAX}
            placeholder="Alias (así se ve en la tele)"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className={campo}
          />
          <input name="email" type="email" required placeholder="Email" autoComplete="off" className={campo} />
          <input name="whatsapp" type="tel" required placeholder="WhatsApp" autoComplete="off" className={campo} />
          <button
            type="submit"
            disabled={pendiente}
            className="neon-button min-h-12 rounded-[18px] px-4 py-2 text-base font-semibold transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {pendiente ? "Guardando…" : "Cobrar y reemplazar"}
          </button>
          <button type="button" onClick={() => setNuevo(false)} className="min-h-11 text-left text-sm text-zinc-400">
            Volver
          </button>
        </form>
      )}

      {error ? (
        <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : null}
      <button type="button" onClick={() => setAbierto(false)} className="min-h-11 text-left text-sm text-zinc-500 hover:text-zinc-300">
        Cancelar
      </button>
    </div>
  );
}
