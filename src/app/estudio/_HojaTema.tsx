"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import type { TemaEstudio } from "@/lib/estudio";
import { GENERO_MAX, formatDuracion, TITULO_MAX, tituloDesdeArchivo } from "@/lib/estudio-reglas";
import { borrarTemaAction, crearTemaAction, editarTemaAction } from "./actions";
import { leerDuracion, problemaConMp3, subirAudio, subirPortada } from "./_subir";

const inputClase =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none";

type Props = {
  // En "nuevo", `archivo` llega cuando el MP3 se soltó arrastrándolo sobre la página.
  modo: { tipo: "nuevo"; archivo?: File } | { tipo: "editar"; tema: TemaEstudio };
  generos: string[];
  onCerrar: () => void;
};

export default function HojaTema({ modo, generos, onCerrar }: Props) {
  const router = useRouter();
  const ids = useId();
  const editando = modo.tipo === "editar" ? modo.tema : null;

  const [audio, setAudio] = useState<File | null>(null);
  const [duracion, setDuracion] = useState<number | null>(null);
  const [titulo, setTitulo] = useState(editando?.titulo ?? "");
  const [genero, setGenero] = useState(editando?.genero ?? "");
  const [portada, setPortada] = useState<File | null>(null);
  const [portadaPreview, setPortadaPreview] = useState<string | null>(null);
  const [progreso, setProgreso] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  useEffect(() => {
    if (!portada) {
      setPortadaPreview(null);
      return;
    }
    const url = URL.createObjectURL(portada);
    setPortadaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [portada]);

  // Escape cierra (en la compu); en el celu se cierra tocando afuera.
  useEffect(() => {
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && !guardando) onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [guardando, onCerrar]);

  // El MP3 que se soltó sobre la página entra como si lo hubieran elegido acá.
  const archivoInicial = modo.tipo === "nuevo" ? modo.archivo : undefined;
  useEffect(() => {
    if (archivoInicial) void elegirAudio(archivoInicial);
    // Solo al abrir: la hoja se monta de nuevo para cada archivo soltado.
  }, []);

  async function elegirAudio(archivo: File | undefined) {
    setError(null);
    if (!archivo) return;
    const problema = problemaConMp3(archivo);
    if (problema) {
      setError(problema);
      return;
    }
    setAudio(archivo);
    setTitulo((actual) => (actual.trim() ? actual : tituloDesdeArchivo(archivo.name)));
    setDuracion(await leerDuracion(archivo));
  }

  async function guardar() {
    setError(null);
    if (!editando && !audio) {
      setError("Elegí el MP3 del tema.");
      return;
    }
    if (!titulo.trim()) {
      setError("Ponele un nombre al tema.");
      return;
    }

    setGuardando(true);
    try {
      let portadaPathname: string | undefined;
      if (portada) {
        try {
          portadaPathname = await subirPortada(portada);
        } catch {
          setError("No se pudo usar esa imagen. Probá con otra.");
          return;
        }
      }

      if (editando) {
        const resultado = await editarTemaAction({ id: editando.id, titulo, genero, portadaPathname });
        if (!resultado.ok) {
          setError(resultado.mensaje);
          return;
        }
      } else if (audio) {
        setProgreso(0);
        const audioPathname = await subirAudio(audio, setProgreso);
        const resultado = await crearTemaAction({
          titulo,
          genero,
          audioPathname,
          portadaPathname: portadaPathname ?? null,
          duracionSeg: duracion,
        });
        if (!resultado.ok) {
          setError(resultado.mensaje);
          return;
        }
      }

      router.refresh();
      onCerrar();
    } catch {
      setError("Se cortó la subida. Revisá la conexión y probá de nuevo.");
    } finally {
      setGuardando(false);
      setProgreso(null);
    }
  }

  async function borrar() {
    if (!editando) return;
    if (!confirmarBorrar) {
      setConfirmarBorrar(true);
      return;
    }
    setGuardando(true);
    const resultado = await borrarTemaAction(editando.id);
    setGuardando(false);
    if (!resultado.ok) {
      setError(resultado.mensaje);
      return;
    }
    router.refresh();
    onCerrar();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={() => !guardando && onCerrar()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-titulo`}
        className="panel-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-[28px] p-5 pb-[max(env(safe-area-inset-bottom),20px)] sm:rounded-[28px]"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2 id={`${ids}-titulo`} className="font-display text-xl font-semibold text-white">
          {editando ? "Editar tema" : "Subir tema"}
        </h2>

        <div className="mt-4 flex flex-col gap-4">
          {editando ? null : (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-300">El MP3</span>
              <input
                type="file"
                accept="audio/mpeg,.mp3"
                disabled={guardando}
                onChange={(evento) => void elegirAudio(evento.target.files?.[0])}
                className="text-sm text-zinc-300 file:mr-3 file:rounded-xl file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-white"
              />
              {audio ? (
                <span className="text-xs text-zinc-500">
                  {(audio.size / (1024 * 1024)).toFixed(1)} MB{duracion ? ` · ${formatDuracion(duracion)}` : ""}
                </span>
              ) : null}
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-300">Nombre</span>
            <input
              value={titulo}
              maxLength={TITULO_MAX}
              disabled={guardando}
              onChange={(evento) => setTitulo(evento.target.value)}
              placeholder="BLINGDADO"
              className={inputClase}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-300">Género</span>
            <input
              value={genero}
              maxLength={GENERO_MAX}
              disabled={guardando}
              list={`${ids}-generos`}
              onChange={(evento) => setGenero(evento.target.value)}
              placeholder="Trap"
              className={inputClase}
            />
            <datalist id={`${ids}-generos`}>
              {generos.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </label>

          <label className="flex items-center gap-3">
            {portadaPreview ? (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa local
              <img src={portadaPreview} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-zinc-700 text-xl text-zinc-500">+</span>
            )}
            <span className="flex flex-col">
              <span className="text-sm font-medium text-zinc-300">
                {editando?.tienePortada ? "Cambiar portada" : "Portada"} <span className="text-zinc-500">(opcional)</span>
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={guardando}
                onChange={(evento) => setPortada(evento.target.files?.[0] ?? null)}
                className="sr-only"
              />
              <span className="text-xs text-zinc-500">Tocá para elegir una imagen</span>
            </span>
          </label>

          {progreso !== null ? (
            <div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-[#8cff59] transition-[width]" style={{ width: `${progreso}%` }} />
              </div>
              <p className="mt-1 text-xs text-zinc-400">Subiendo… {Math.round(progreso)}%</p>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}

          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => void guardar()} disabled={guardando} className="neon-button rounded-[20px] px-5 py-3 font-semibold disabled:opacity-60">
              {guardando ? "Guardando…" : editando ? "Guardar" : "Subir"}
            </button>
            <button type="button" onClick={onCerrar} disabled={guardando} className="rounded-[20px] px-5 py-2.5 text-sm text-zinc-400 hover:text-white">
              Cancelar
            </button>
            {editando ? (
              <button
                type="button"
                onClick={() => void borrar()}
                disabled={guardando}
                className={`rounded-[20px] px-5 py-2.5 text-sm ${confirmarBorrar ? "bg-red-500/15 font-semibold text-red-300" : "text-red-400/80 hover:text-red-300"}`}
              >
                {confirmarBorrar ? "Tocá otra vez para borrarlo" : "Borrar tema"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
