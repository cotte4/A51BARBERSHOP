"use client";

import dynamic from "next/dynamic";

const PelotaAlien = dynamic(() => import("@/app/torneo/pantalla/_PelotaAlien"), { ssr: false });

export type TorneoDatosLanding = { cupo: number; cuota: string; fecha: string | null };

function filas(torneo?: TorneoDatosLanding) {
  return [
    { label: "Juego", value: "EA FC 27 · PS4" },
    { label: "Cupo", value: `${torneo?.cupo ?? 16} jugadores` },
    { label: "Formato", value: "Eliminación directa" },
    { label: "Cuota", value: `${torneo?.cuota ?? "$4.200"} en el local` },
    { label: "Fecha", value: torneo?.fecha ?? "A confirmar", accent: !torneo?.fecha },
  ] as const;
}

/** Tarjeta del hero cuando la reserva está cerrada: el torneo es lo único que se vende. */
export default function TorneoHeroCard({ datos: torneo }: { datos?: TorneoDatosLanding }) {
  const datos = filas(torneo);
  return (
    <div
      className="animate-scale-in-landing panel-card relative overflow-hidden rounded-[36px] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:p-5 lg:p-6"
      style={{ animationDelay: "0.15s" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(140,255,89,0.2),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(255,59,78,0.08),transparent_35%)]" />
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8cff59]">
            A51 // torneo
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-[#8cff59]/50 via-[#8cff59]/20 to-transparent" />
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Señal interceptada</div>
        </div>

        <div className="mx-auto -my-4 flex justify-center sm:-my-2">
          <div className="origin-center scale-[0.72] sm:scale-90 lg:scale-100">
            <PelotaAlien tamano={400} />
          </div>
        </div>

        <div className="-mt-6 rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <div className="space-y-3">
            {datos.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-400">{row.label}</span>
                <span
                  className={`text-sm font-semibold ${"accent" in row && row.accent ? "text-[#8cff59]" : "text-zinc-100"}`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
