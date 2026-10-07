"use client";

import { useActionState } from "react";
import { guardarEquiposAction, type TorneoAdminState } from "./actions";

type EquiposFormProps = {
  equiposTexto: string;
  bloqueado: boolean;
};

const ESTADO_INICIAL: TorneoAdminState = { ok: false, mensaje: null };

const INPUT =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none disabled:opacity-50";

export default function EquiposForm({ equiposTexto, bloqueado }: EquiposFormProps) {
  const [state, formAction, pendiente] = useActionState(guardarEquiposAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="equipos" className="text-sm font-medium text-zinc-300">
          Equipos
        </label>
        <textarea
          id="equipos"
          name="equipos"
          rows={10}
          defaultValue={equiposTexto}
          disabled={bloqueado}
          className={INPUT}
        />
        <p className="text-xs text-zinc-500">
          Un equipo por línea. Hacen falta al menos tantos como jugadores.
        </p>
        {bloqueado ? (
          <p className="text-xs text-zinc-400">El torneo ya se sorteó: los equipos no se pueden cambiar.</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={bloqueado || pendiente}
          className="neon-button min-h-11 w-full rounded-[20px] px-5 py-3 font-semibold disabled:opacity-60"
        >
          Guardar equipos
        </button>
        {state.mensaje ? (
          <p
            className={
              state.ok
                ? "rounded-xl border border-[#8cff59]/25 bg-[#8cff59]/10 px-3 py-2 text-sm text-[#8cff59]"
                : "rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            }
          >
            {state.mensaje}
          </p>
        ) : null}
      </div>
    </form>
  );
}
