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
        className="neon-button min-h-11 w-full rounded-[20px] px-5 py-3 font-semibold disabled:opacity-60"
      >
        Crear torneo
      </button>
    </div>
  );
}
