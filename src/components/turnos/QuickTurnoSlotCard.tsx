"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { QuickTurnoCreateState } from "@/app/(admin)/turnos/actions";

type ServicioOption = {
  id: string;
  nombre: string;
  precioBase: string | null;
};

type QuickTurnoSlotCardProps = {
  time: string;
  barberName: string;
  durationMinutos: number;
  servicios?: ServicioOption[];
  action: (
    prevState: QuickTurnoCreateState,
    formData: FormData
  ) => Promise<QuickTurnoCreateState>;
};

const initialState: QuickTurnoCreateState = {};

export default function QuickTurnoSlotCard({
  time,
  barberName,
  durationMinutos,
  servicios = [],
  action,
}: QuickTurnoSlotCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedServicioId, setSelectedServicioId] = useState("");
  const [precioEsperado, setPrecioEsperado] = useState("");
  const [state, formAction, pending] = useActionState(action, initialState);
  const fieldError = state.fieldErrors?.clienteNombre;
  const hasError = Boolean(state.error || fieldError);
  const panelId = `quick-slot-${barberName}-${time}-${durationMinutos}`.replace(/[^a-zA-Z0-9-]/g, "-");

  function handleServicioChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedServicioId(id);
    const servicio = servicios.find((s) => s.id === id);
    setPrecioEsperado(servicio?.precioBase ?? "");
  }

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      router.refresh();
    }
  }, [router, state.success]);

  return (
    <div
      className={`overflow-hidden rounded-[22px] border transition ${
        open
          ? "border-[#8cff59]/25 bg-[linear-gradient(180deg,rgba(140,255,89,0.08),rgba(24,24,27,0.92))]"
          : "border-dashed border-zinc-800 bg-transparent hover:border-zinc-700"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[54px] w-full items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${open ? "text-white" : "text-zinc-400"}`}>{time}</p>
          <p className={`text-[11px] ${open ? "text-zinc-300" : "text-zinc-600"}`}>
            {durationMinutos} min | {barberName}
          </p>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            open ? "bg-[#8cff59] text-[#07130a]" : "bg-zinc-900 text-zinc-500"
          }`}
        >
          {open ? "Cerrar" : "Tomar"}
        </span>
      </button>

      {open ? (
        <form id={panelId} action={formAction} className="space-y-3 border-t border-zinc-800/80 px-3.5 pb-3.5 pt-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8cff59]">
              Alta rapida
            </p>
            <p className="text-xs text-zinc-400">
              Carga el nombre y, si lo tenes, el telefono para confirmar este hueco al instante.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="clienteNombre"
              autoComplete="name"
              autoFocus
              placeholder="Nombre del cliente"
              required
              aria-invalid={hasError}
              className={`h-11 rounded-xl border bg-zinc-950 px-3 text-sm text-white placeholder-zinc-600 outline-none ${
                fieldError ? "border-red-500/40 focus:border-red-400" : "border-zinc-700 focus:border-[#8cff59]"
              }`}
            />
            <input
              name="clienteTelefonoRaw"
              autoComplete="tel"
              inputMode="tel"
              placeholder="Telefono (opcional)"
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
            />
          </div>

          {servicios.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                name="servicioId"
                value={selectedServicioId}
                onChange={handleServicioChange}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-[#8cff59]"
              >
                <option value="">Sin servicio específico</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
              <input
                name="precioEsperado"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="Precio esperado"
                value={precioEsperado}
                onChange={(e) => setPrecioEsperado(e.target.value)}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Guardando..." : "Confirmar turno"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800 px-4 text-sm font-medium text-zinc-300"
            >
              Cancelar
            </button>
          </div>

          {state.error ? (
            <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {state.error}
            </p>
          ) : null}
          {fieldError ? (
            <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {fieldError}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
