"use client";

import { Reorder, useDragControls } from "framer-motion";
import type { TemaEstudio } from "@/lib/estudio";
import { formatDuracion } from "@/lib/estudio-reglas";
import { Portada } from "./_Reproductor";

// Las filas de la playlist: el puesto en el ranking, la portada, el nombre, género y escuchas, la
// duración y el menú. En modo ordenar, cada fila se arrastra desde su manija (el resto de la fila
// deja scrollear en el celu).

function escuchasTexto(escuchas: number) {
  return escuchas === 1 ? "1 escucha" : `${escuchas} escuchas`;
}

function OndasIcon() {
  return (
    <svg viewBox="0 0 24 24" className="mx-auto h-4 w-4 text-[#8cff59]" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M6 10v4M10 7v10M14 9v6M18 11v2" strokeLinecap="round" />
    </svg>
  );
}

function MasIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </svg>
  );
}

function ManijaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M5 9h14M5 15h14" strokeLinecap="round" />
    </svg>
  );
}

function Puesto({ puesto, sonando }: { puesto: number; sonando?: boolean }) {
  // El podio va en verde: es un ranking.
  return (
    <span className={`w-6 shrink-0 text-center font-display text-sm font-semibold tabular-nums ${puesto <= 3 ? "text-[#8cff59]" : "text-zinc-500"}`}>
      {sonando ? <OndasIcon /> : puesto}
    </span>
  );
}

type FilaProps = {
  tema: TemaEstudio;
  puesto: number;
  esActual: boolean;
  sonando: boolean;
  onTocar: () => void;
  onOpciones: () => void;
};

export function FilaTema({ tema, puesto, esActual, sonando, onTocar, onOpciones }: FilaProps) {
  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={onTocar}
        className={`flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-2 text-left hover:bg-white/4 ${esActual ? "bg-white/5" : ""}`}
      >
        <Puesto puesto={puesto} sonando={esActual && sonando} />
        <Portada tema={tema} size="sm" />
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-semibold ${esActual ? "text-[#8cff59]" : "text-white"}`}>{tema.titulo}</span>
          <span className="block truncate text-sm text-zinc-400">{[tema.genero, escuchasTexto(tema.escuchas)].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="shrink-0 text-sm tabular-nums text-zinc-500">{formatDuracion(tema.duracionSeg)}</span>
      </button>
      <button type="button" onClick={onOpciones} aria-label={`Opciones de ${tema.titulo}`} className="rounded-full p-3 text-zinc-500 hover:text-white">
        <MasIcon />
      </button>
    </li>
  );
}

function FilaOrdenable({ tema, puesto }: { tema: TemaEstudio; puesto: number }) {
  const controles = useDragControls();
  return (
    <Reorder.Item
      value={tema.id}
      dragListener={false}
      dragControls={controles}
      as="li"
      className="relative flex items-center gap-3 rounded-2xl bg-zinc-900/90 p-2"
      whileDrag={{ scale: 1.02, boxShadow: "0 14px 34px rgba(0,0,0,0.5)" }}
    >
      <Puesto puesto={puesto} />
      <Portada tema={tema} size="sm" />
      <span className="min-w-0 flex-1 truncate font-semibold text-white">{tema.titulo}</span>
      <button
        type="button"
        aria-label={`Mover ${tema.titulo}`}
        onPointerDown={(evento) => controles.start(evento)}
        className="cursor-grab touch-none rounded-full p-3 text-zinc-400 hover:text-white active:cursor-grabbing"
      >
        <ManijaIcon />
      </button>
    </Reorder.Item>
  );
}

type OrdenableProps = {
  temas: Map<string, TemaEstudio>;
  orden: string[];
  onOrden: (orden: string[]) => void;
};

export function ListaOrdenable({ temas, orden, onOrden }: OrdenableProps) {
  return (
    <Reorder.Group axis="y" values={orden} onReorder={onOrden} as="ul" className="flex flex-col gap-1.5">
      {orden.map((id, i) => {
        const tema = temas.get(id);
        return tema ? <FilaOrdenable key={id} tema={tema} puesto={i + 1} /> : null;
      })}
    </Reorder.Group>
  );
}
