"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { TemaEstudio } from "@/lib/estudio";
import { formatDuracion } from "@/lib/estudio-reglas";
import HojaTema from "./_HojaTema";
import { ColaSubida, useColaSubida } from "./_ColaSubida";
import { BarraReproductor, Portada, useReproductor } from "./_Reproductor";
import { esMp3 } from "./_subir";

// three.js se baja recién con el primer play.
const Nave = dynamic(() => import("./_Nave"), { ssr: false });

type Hoja = { tipo: "nuevo"; archivo?: File } | { tipo: "editar"; tema: TemaEstudio } | null;

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

function hayArchivos(evento: DragEvent) {
  return Array.from(evento.dataTransfer?.types ?? []).includes("Files");
}

export default function EstudioClient({ temas }: { temas: TemaEstudio[] }) {
  const reproductor = useReproductor(temas);
  const cola = useColaSubida();
  const [hoja, setHoja] = useState<Hoja>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [avisoArrastre, setAvisoArrastre] = useState<string | null>(null);
  const [yaSono, setYaSono] = useState(false);
  const [inmersivo, setInmersivo] = useState(false);
  const cerrarHoja = useCallback(() => setHoja(null), []);
  const { agregar } = cola;

  if (reproductor.sonando && !yaSono) setYaSono(true);

  const generos = useMemo(
    () => [...new Set(temas.map((tema) => tema.genero).filter((g): g is string => !!g))].sort(),
    [temas]
  );

  const recibir = useCallback(
    (archivos: File[]) => {
      const mp3s = archivos.filter(esMp3);
      if (mp3s.length === 0) {
        setAvisoArrastre("Solo se pueden subir MP3.");
        return;
      }
      setAvisoArrastre(mp3s.length < archivos.length ? "Algunos archivos no eran MP3 y quedaron afuera." : null);
      // Uno solo: se abre el formulario para ponerle género y portada. Varios: van en fila.
      if (mp3s.length === 1) setHoja({ tipo: "nuevo", archivo: mp3s[0] });
      else agregar(mp3s);
    },
    [agregar]
  );

  // Arrastrar MP3 a cualquier parte de la página.
  useEffect(() => {
    let profundidad = 0;
    const entrar = (evento: DragEvent) => {
      if (!hayArchivos(evento)) return;
      evento.preventDefault();
      profundidad++;
      setArrastrando(true);
    };
    const sobre = (evento: DragEvent) => {
      if (!hayArchivos(evento)) return;
      evento.preventDefault();
      if (evento.dataTransfer) evento.dataTransfer.dropEffect = "copy";
    };
    const salir = (evento: DragEvent) => {
      if (!hayArchivos(evento)) return;
      profundidad = Math.max(0, profundidad - 1);
      if (profundidad === 0) setArrastrando(false);
    };
    const soltar = (evento: DragEvent) => {
      if (!hayArchivos(evento)) return;
      evento.preventDefault();
      profundidad = 0;
      setArrastrando(false);
      recibir(Array.from(evento.dataTransfer?.files ?? []));
    };
    window.addEventListener("dragenter", entrar);
    window.addEventListener("dragover", sobre);
    window.addEventListener("dragleave", salir);
    window.addEventListener("drop", soltar);
    return () => {
      window.removeEventListener("dragenter", entrar);
      window.removeEventListener("dragover", sobre);
      window.removeEventListener("dragleave", salir);
      window.removeEventListener("drop", soltar);
    };
  }, [recibir]);

  useEffect(() => {
    if (!inmersivo) return;
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setInmersivo(false);
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [inmersivo]);

  const actual = reproductor.actual;

  return (
    <>
      <div className="relative z-10 flex flex-col gap-6">
        <button type="button" onClick={() => setHoja({ tipo: "nuevo" })} className="neon-button rounded-[20px] px-5 py-3 font-semibold">
          Subir tema
        </button>
        <p className="-mt-3 hidden text-center text-sm text-zinc-500 sm:block">O arrastrá los MP3 acá, uno o varios.</p>

        {avisoArrastre ? (
          <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">{avisoArrastre}</p>
        ) : null}

        <ColaSubida cola={cola} />

        {temas.length === 0 ? (
          <p className="panel-soft rounded-[22px] p-5 text-center text-zinc-400">Todavía no hay temas. Subí el primero.</p>
        ) : (
          <section className="panel-card rounded-[28px] p-2">
            <ul className="divide-y divide-zinc-800/70">
              {temas.map((tema) => {
                const esActual = actual?.id === tema.id;
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
      </div>

      {yaSono ? (
        <>
          {inmersivo ? <div className="fixed inset-0 z-[29] bg-[#040705]" /> : null}
          <div className={`pointer-events-none fixed inset-0 ${inmersivo ? "z-30" : "z-0"}`}>
            <Nave audioRef={reproductor.audioRef} temaId={actual?.id ?? null} sonando={reproductor.sonando} />
          </div>
        </>
      ) : null}

      {inmersivo && actual ? (
        <div className="fixed inset-x-0 top-0 z-[31] px-4 pt-[max(env(safe-area-inset-top),16px)]">
          <div className="mx-auto flex max-w-xl items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-display text-3xl font-bold text-white drop-shadow-[0_0_18px_rgba(140,255,89,0.45)]">{actual.titulo}</p>
              <p className="text-sm text-zinc-300">Was &amp; Pinky{actual.genero ? ` · ${actual.genero}` : ""}</p>
            </div>
            <button
              type="button"
              onClick={() => setInmersivo(false)}
              className="shrink-0 rounded-full border border-zinc-700 bg-zinc-950/70 px-4 py-2 text-sm text-zinc-200 hover:text-[#8cff59]"
            >
              Volver
            </button>
          </div>
        </div>
      ) : null}

      <BarraReproductor reproductor={reproductor} onNave={() => setInmersivo((valor) => !valor)} naveAbierta={inmersivo} />

      {arrastrando ? (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-6">
          <div className="flex h-full w-full max-w-xl items-center justify-center rounded-[28px] border-2 border-dashed border-[#8cff59]/70">
            <p className="font-display text-2xl font-semibold text-[#8cff59]">Soltá los MP3 acá</p>
          </div>
        </div>
      ) : null}

      {hoja ? (
        <HojaTema
          key={hoja.tipo === "editar" ? hoja.tema.id : (hoja.archivo?.name ?? "nuevo")}
          modo={hoja}
          generos={generos}
          onCerrar={cerrarHoja}
        />
      ) : null}
    </>
  );
}
