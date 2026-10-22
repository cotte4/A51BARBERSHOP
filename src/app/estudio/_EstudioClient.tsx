"use client";

import { useCallback, useMemo, useState } from "react";
import type { TemaEstudio } from "@/lib/estudio";
import { formatDuracion } from "@/lib/estudio-reglas";
import HojaTema from "./_HojaTema";
import { BarraReproductor, Portada, useReproductor } from "./_Reproductor";

type Hoja = { tipo: "nuevo" } | { tipo: "editar"; tema: TemaEstudio } | null;

function MasIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </svg>
  );
}

function OndasIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#8cff59]" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M6 10v4M10 7v10M14 9v6M18 11v2" strokeLinecap="round" />
    </svg>
  );
}

export default function EstudioClient({ temas }: { temas: TemaEstudio[] }) {
  const reproductor = useReproductor(temas);
  const [hoja, setHoja] = useState<Hoja>(null);
  const cerrarHoja = useCallback(() => setHoja(null), []);

  const generos = useMemo(
    () => [...new Set(temas.map((tema) => tema.genero).filter((g): g is string => !!g))].sort(),
    [temas]
  );

  return (
    <>
      <button type="button" onClick={() => setHoja({ tipo: "nuevo" })} className="neon-button rounded-[20px] px-5 py-3 font-semibold">
        Subir tema
      </button>

      {temas.length === 0 ? (
        <p className="panel-soft rounded-[22px] p-5 text-center text-zinc-400">Todavía no hay temas. Subí el primero.</p>
      ) : (
        <section className="panel-card rounded-[28px] p-2">
          <ul className="divide-y divide-zinc-800/70">
            {temas.map((tema) => {
              const esActual = reproductor.actual?.id === tema.id;
              return (
                <li key={tema.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => reproductor.reproducir(tema.id)}
                    className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2.5 text-left hover:bg-white/4 ${esActual ? "bg-white/5" : ""}`}
                  >
                    <Portada tema={tema} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className={`flex items-center gap-1.5 truncate font-semibold ${esActual ? "text-[#8cff59]" : "text-white"}`}>
                        {esActual && reproductor.sonando ? <OndasIcon /> : null}
                        <span className="truncate">{tema.titulo}</span>
                      </span>
                      <span className="block truncate text-sm text-zinc-400">
                        {[tema.genero, formatDuracion(tema.duracionSeg)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHoja({ tipo: "editar", tema })}
                    aria-label={`Opciones de ${tema.titulo}`}
                    className="rounded-full p-3 text-zinc-500 hover:text-white"
                  >
                    <MasIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <BarraReproductor reproductor={reproductor} />

      {hoja ? <HojaTema key={hoja.tipo === "editar" ? hoja.tema.id : "nuevo"} modo={hoja} generos={generos} onCerrar={cerrarHoja} /> : null}
    </>
  );
}
