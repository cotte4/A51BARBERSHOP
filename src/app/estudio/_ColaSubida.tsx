"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { tituloDesdeArchivo } from "@/lib/estudio-reglas";
import { crearTemaAction } from "./actions";
import { leerDuracion, problemaConMp3, subirAudio } from "./_subir";

// Varios MP3 soltados de una: se suben de a uno, cada uno con el nombre de su archivo.
// Género y portada se agregan después desde "⋯".

type Item = {
  id: string;
  archivo: File;
  titulo: string;
  estado: "espera" | "subiendo" | "listo" | "error";
  progreso: number;
  error: string | null;
};

export function useColaSubida() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const trabajando = useRef(false);

  const agregar = useCallback((archivos: File[]) => {
    setItems((previos) => [
      ...previos,
      ...archivos.map((archivo): Item => {
        const problema = problemaConMp3(archivo);
        return {
          id: crypto.randomUUID(),
          archivo,
          titulo: tituloDesdeArchivo(archivo.name),
          estado: problema ? "error" : "espera",
          progreso: 0,
          error: problema,
        };
      }),
    ]);
  }, []);

  const actualizar = useCallback((id: string, cambios: Partial<Item>) => {
    setItems((previos) => previos.map((item) => (item.id === id ? { ...item, ...cambios } : item)));
  }, []);

  const siguiente = items.find((item) => item.estado === "espera");

  useEffect(() => {
    if (!siguiente || trabajando.current) return;
    trabajando.current = true;
    const { id, archivo, titulo } = siguiente;
    actualizar(id, { estado: "subiendo" });

    void (async () => {
      try {
        const [duracionSeg, audioPathname] = await Promise.all([
          leerDuracion(archivo),
          subirAudio(archivo, (progreso) => actualizar(id, { progreso })),
        ]);
        const resultado = await crearTemaAction({ titulo, genero: "", audioPathname, portadaPathname: null, duracionSeg });
        if (resultado.ok) {
          actualizar(id, { estado: "listo", progreso: 100 });
          router.refresh();
        } else {
          actualizar(id, { estado: "error", error: resultado.mensaje });
        }
      } catch {
        actualizar(id, { estado: "error", error: "Se cortó la subida." });
      } finally {
        trabajando.current = false;
        // Fuerza a mirar la fila otra vez para arrancar el próximo.
        setItems((previos) => [...previos]);
      }
    })();
  }, [actualizar, router, siguiente]);

  const limpiar = useCallback(() => setItems((previos) => previos.filter((item) => item.estado === "espera" || item.estado === "subiendo")), []);

  return { items, agregar, limpiar };
}

export function ColaSubida({ cola }: { cola: ReturnType<typeof useColaSubida> }) {
  const { items, limpiar } = cola;
  if (items.length === 0) return null;

  const pendientes = items.filter((item) => item.estado === "espera" || item.estado === "subiendo").length;

  return (
    <section className="panel-card rounded-[28px] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white">
          {pendientes > 0 ? `Subiendo ${items.length - pendientes + 1} de ${items.length}` : "Listo"}
        </h2>
        {pendientes === 0 ? (
          <button type="button" onClick={limpiar} className="text-sm text-zinc-400 hover:text-[#8cff59]">
            Cerrar
          </button>
        ) : null}
      </div>
      <ul className="mt-3 flex flex-col gap-2.5">
        {items.map((item) => (
          <li key={item.id} className="text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-zinc-200">{item.titulo || item.archivo.name}</span>
              <span
                className={`shrink-0 tabular-nums ${
                  item.estado === "error" ? "text-red-300" : item.estado === "listo" ? "text-[#8cff59]" : "text-zinc-400"
                }`}
              >
                {item.estado === "espera"
                  ? "En fila"
                  : item.estado === "subiendo"
                    ? `${Math.round(item.progreso)}%`
                    : item.estado === "listo"
                      ? "Subido"
                      : "No se subió"}
              </span>
            </div>
            {item.estado === "subiendo" ? (
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-[#8cff59] transition-[width]" style={{ width: `${item.progreso}%` }} />
              </div>
            ) : null}
            {item.error ? <p className="mt-0.5 text-xs text-red-300/90">{item.error}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
