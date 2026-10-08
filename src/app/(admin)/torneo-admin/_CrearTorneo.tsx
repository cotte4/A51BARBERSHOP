"use client";

import { useTransition } from "react";
import { crearTorneoAction } from "./actions";

export default function CrearTorneo() {
  const [pendiente, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => startTransition(async () => { await crearTorneoAction(); })}
        className="neon-button min-h-14 w-full rounded-[20px] px-5 py-3 text-lg font-bold transition-transform duration-150 active:scale-[0.97] disabled:opacity-60 sm:w-auto sm:px-10"
      >
        {pendiente ? "Creando…" : "Crear torneo"}
      </button>
    </div>
  );
}
