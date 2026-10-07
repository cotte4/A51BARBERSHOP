"use client";

import { useActionState } from "react";
import { guardarConfigAction, type TorneoAdminState } from "./actions";

type ConfigFormProps = {
  nombre: string;
  fechaLocal: string;
  premiosTexto: string;
};

const ESTADO_INICIAL: TorneoAdminState = { ok: false, mensaje: null };

const INPUT =
  "w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none";

export default function ConfigForm({ nombre, fechaLocal, premiosTexto }: ConfigFormProps) {
  const [state, formAction, pendiente] = useActionState(guardarConfigAction, ESTADO_INICIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className="text-sm font-medium text-zinc-300">
          Nombre
        </label>
        <input id="nombre" name="nombre" type="text" defaultValue={nombre} required className={INPUT} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fechaLocal" className="text-sm font-medium text-zinc-300">
          Fecha y hora
        </label>
        <input
          id="fechaLocal"
          name="fechaLocal"
          type="datetime-local"
          defaultValue={fechaLocal}
          className={INPUT}
        />
        <p className="text-xs text-zinc-500">Vacío = fecha a confirmar</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="premiosTexto" className="text-sm font-medium text-zinc-300">
          Premios
        </label>
        <textarea
          id="premiosTexto"
          name="premiosTexto"
          rows={4}
          defaultValue={premiosTexto}
          className={INPUT}
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={pendiente}
          className="neon-button min-h-11 w-full rounded-[20px] px-5 py-3 font-semibold disabled:opacity-60"
        >
          Guardar
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
