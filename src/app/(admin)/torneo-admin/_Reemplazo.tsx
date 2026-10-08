"use client";

import { useState, useTransition } from "react";
import { reemplazarJugadorAction } from "./actions";

type Candidato = { id: string; nombre: string };

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
        className="min-h-9 px-2 text-xs font-medium text-zinc-500 hover:text-amber-300"
      >
        Se baja
      </button>
    );
  }

  return (
    <div className="mt-3 flex w-full flex-col gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3">
      <p className="text-sm font-semibold text-white">¿Quién entra por {nombre}?</p>

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
                    onClick={() => enviar({ tipo: "espera", jugadorId: c.id }, c.nombre)}
                    className="ghost-button min-h-11 w-full rounded-[20px] px-4 py-2 text-left text-base font-semibold disabled:opacity-60"
                  >
                    {c.nombre}
                    {i === 0 ? <span className="ml-2 text-xs text-amber-300">el que sigue</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setNuevo(true)}
            className="text-left text-sm text-zinc-400 hover:text-[#8cff59]"
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
            enviar(
              {
                tipo: "nuevo",
                nombre: nombreNuevo,
                email: String(datos.get("email") ?? ""),
                whatsapp: String(datos.get("whatsapp") ?? ""),
              },
              nombreNuevo,
            );
          }}
        >
          <input name="nombre" required placeholder="Nombre" autoComplete="off" className={campo} />
          <input name="email" type="email" required placeholder="Email" autoComplete="off" className={campo} />
          <input name="whatsapp" type="tel" required placeholder="WhatsApp" autoComplete="off" className={campo} />
          <button
            type="submit"
            disabled={pendiente}
            className="neon-button min-h-11 rounded-[20px] px-4 py-2 text-base font-semibold disabled:opacity-60"
          >
            {pendiente ? "Guardando…" : "Cobrar y reemplazar"}
          </button>
          <button type="button" onClick={() => setNuevo(false)} className="text-left text-sm text-zinc-400">
            Volver
          </button>
        </form>
      )}

      {error ? (
        <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : null}
      <button type="button" onClick={() => setAbierto(false)} className="text-left text-sm text-zinc-500">
        Cancelar
      </button>
    </div>
  );
}
