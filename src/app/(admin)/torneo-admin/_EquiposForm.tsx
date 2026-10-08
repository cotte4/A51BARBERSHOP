"use client";

import { useState, useTransition } from "react";
import { CATALOGO_CLUBES, LIGAS, clubDelCatalogo } from "@/lib/torneo-escudos";
import Escudo from "@/components/torneo/Escudo";
import { guardarEquiposAction, type TorneoAdminState } from "./actions";

type EquiposFormProps = {
  /** Nombres guardados hoy en torneo_equipos. */
  guardados: string[];
  /** Hacen falta al menos tantos equipos como jugadores (16 si todavía pagaron menos). */
  minimo: number;
  bloqueado: boolean;
};

function slugsDe(nombres: readonly string[]): Set<string> {
  return new Set(nombres.map((n) => clubDelCatalogo(n)?.slug).filter((s): s is string => Boolean(s)));
}

/** Grilla de los 24 clubes del catálogo: se toca para elegir o sacar. Lo que se guarda es el nombre canónico. */
export default function EquiposForm({ guardados, minimo, bloqueado }: EquiposFormProps) {
  const [elegidos, setElegidos] = useState<Set<string>>(() => slugsDe(guardados));
  const [pendiente, startTransition] = useTransition();
  const [estado, setEstado] = useState<TorneoAdminState>({ ok: false, mensaje: null });

  const inicial = slugsDe(guardados);
  const fueraDelCatalogo = guardados.filter((n) => !clubDelCatalogo(n));
  const cambios =
    fueraDelCatalogo.length > 0 ||
    elegidos.size !== inicial.size ||
    [...elegidos].some((s) => !inicial.has(s));
  const alcanza = elegidos.size >= minimo;

  function cambiar(nuevos: Set<string>) {
    setElegidos(nuevos);
    setEstado({ ok: false, mensaje: null });
  }

  function alternar(slug: string) {
    const nuevos = new Set(elegidos);
    if (nuevos.has(slug)) nuevos.delete(slug);
    else nuevos.add(slug);
    cambiar(nuevos);
  }

  function guardar() {
    startTransition(async () => {
      setEstado(await guardarEquiposAction([...elegidos]));
    });
  }

  if (bloqueado) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-400">
          <span className="font-display text-2xl font-bold tabular-nums text-white">{guardados.length}</span> equipos · el
          torneo ya se sorteó: no se pueden cambiar.
        </p>
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {guardados.map((nombre) => (
            <li
              key={nombre}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/60 px-1 py-2.5"
            >
              <Escudo equipo={nombre} tamano={36} />
              <span className="w-full truncate text-center text-[11px] font-medium leading-tight text-zinc-400">
                {nombre}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  let indice = 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-300">
          <span className="font-display text-2xl font-bold tabular-nums text-white">{elegidos.size}</span> elegidos ·{" "}
          <span className={alcanza ? "text-zinc-400" : "font-semibold text-amber-300"}>
            hacen falta al menos {minimo}
          </span>
        </p>
        {!bloqueado ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pendiente || elegidos.size === CATALOGO_CLUBES.length}
              onClick={() => cambiar(new Set(CATALOGO_CLUBES.map((c) => c.slug)))}
              className="ghost-button min-h-11 rounded-[18px] px-4 text-sm font-semibold transition-transform active:scale-[0.97] disabled:opacity-40"
            >
              Elegir todos
            </button>
            <button
              type="button"
              disabled={pendiente || elegidos.size === 0}
              onClick={() => cambiar(new Set())}
              className="min-h-11 rounded-[18px] border border-zinc-700 px-4 text-sm font-semibold text-zinc-300 transition-transform hover:border-zinc-500 active:scale-[0.97] disabled:opacity-40"
            >
              Limpiar
            </button>
          </div>
        ) : null}
      </div>

      {LIGAS.map((liga) => (
        <div key={liga} className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{liga}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {CATALOGO_CLUBES.filter((c) => c.liga === liga).map((club) => {
              const elegido = elegidos.has(club.slug);
              const retraso = Math.min(indice++, 23) * 22;
              return (
                <button
                  key={club.slug}
                  style={{ animationDelay: `${retraso}ms` }}
                  type="button"
                  aria-pressed={elegido}
                  disabled={bloqueado || pendiente}
                  onClick={() => alternar(club.slug)}
                  className={`relative flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-2xl border px-1.5 py-3 transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.95] disabled:cursor-default motion-safe:animate-[a51-scale-in_0.4s_cubic-bezier(0.22,1,0.36,1)_both] ${
                    elegido
                      ? "border-[#8cff59]/70 bg-[#8cff59]/10 shadow-[0_0_18px_rgba(140,255,89,0.12)]"
                      : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-600"
                  }`}
                >
                  {/* Sin elegir el escudo queda gris y apagado: se distingue de un vistazo sin leer. */}
                  <Escudo
                    equipo={club.nombre}
                    tamano={48}
                    className={`transition-[filter,opacity] duration-150 ${elegido ? "" : "opacity-40 grayscale"}`}
                  />
                  <span
                    className={`text-center text-xs font-semibold leading-tight ${elegido ? "text-white" : "text-zinc-500"}`}
                  >
                    {club.nombre}
                  </span>
                  {elegido ? (
                    <span
                      aria-hidden="true"
                      className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#8cff59] text-[#07130a]"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {fueraDelCatalogo.length > 0 && !bloqueado ? (
        <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
          Hay equipos cargados que no están en esta lista ({fueraDelCatalogo.join(", ")}): se sacan al guardar.
        </p>
      ) : null}

      {!bloqueado ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={guardar}
            disabled={pendiente || !cambios || elegidos.size < 2}
            className="neon-button min-h-12 w-full rounded-[20px] px-5 py-3 font-semibold transition-transform active:scale-[0.97] disabled:opacity-40"
          >
            {pendiente ? "Guardando…" : cambios ? "Guardar equipos" : "Equipos guardados ✓"}
          </button>
          {cambios && !pendiente ? <p className="text-center text-xs text-zinc-500">Hay cambios sin guardar.</p> : null}
          {estado.mensaje ? (
            <p
              role={estado.ok ? "status" : "alert"}
              className={
                estado.ok
                  ? "rounded-xl border border-[#8cff59]/25 bg-[#8cff59]/10 px-3 py-2 text-sm text-[#8cff59]"
                  : "rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300"
              }
            >
              {estado.mensaje}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
