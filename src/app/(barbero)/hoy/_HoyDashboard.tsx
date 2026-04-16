"use client";

import { useState } from "react";
import Link from "next/link";
import FullScreenOverlay from "@/components/ui/FullScreenOverlay";
import QuickCheckoutPanel from "@/components/caja/QuickCheckoutPanel";
import TurnosPendientesInbox, { type TurnoConAcciones } from "./_TurnosPendientesInbox";
import { formatARS } from "@/lib/format";
import type { TurnoSummary } from "@/lib/types";
import type { AtencionRapidaState } from "@/app/(barbero)/caja/actions";

type Servicio = { id: string; nombre: string; precioBase: string | null };
type MedioPago = { id: string; nombre: string | null; comisionPorcentaje: string | null };

type Props = {
  barberoNombre: string;
  fechaLabel: string;
  totalCobrado: number;
  atencionesCount: number;
  turnosOperativos: TurnoSummary[];
  turnosPendientesConAcciones: TurnoConAcciones[];
  proximoTurno: TurnoSummary | null;
  servicios: Servicio[];
  mediosPago: MedioPago[];
  registrarAction: (
    prevState: AtencionRapidaState,
    formData: FormData
  ) => Promise<AtencionRapidaState>;
  marcianosTurnos: {
    turnoId: string;
    horaInicio: string;
    clienteNombre: string | null;
  }[];
};

function getBadgeTone(estado: string) {
  if (estado === "confirmado")
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (estado === "pendiente")
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  return "border-zinc-800 bg-zinc-950 text-zinc-300";
}

function getEstadoLabel(estado: string) {
  if (estado === "confirmado") return "Confirmado";
  if (estado === "pendiente") return "Pendiente";
  if (estado === "completado") return "Completado";
  return estado;
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M7.5 3.5V7M16.5 3.5V7M3.5 9.5h17" strokeLinecap="round" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M8 18a2.5 2.5 0 1 1-2.5-2.5A2.5 2.5 0 0 1 8 18Z" />
      <path d="M18.5 16.5A2.5 2.5 0 1 1 16 14a2.5 2.5 0 0 1 2.5 2.5Z" />
      <path d="M8 18V7.5l10-2V16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


function TurnosOverlayContent({
  turnosOperativos,
  turnosPendientesConAcciones,
  marcianosTurnos,
}: {
  turnosOperativos: TurnoSummary[];
  turnosPendientesConAcciones: TurnoConAcciones[];
  marcianosTurnos: { turnoId: string; horaInicio: string; clienteNombre: string | null }[];
}) {
  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Pending inbox */}
      {turnosPendientesConAcciones.length > 0 ? (
        <TurnosPendientesInbox items={turnosPendientesConAcciones} />
      ) : null}

      {/* Turnos list */}
      <div>
        <p className="eyebrow mb-3 text-xs">Agenda de hoy</p>
        {turnosOperativos.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-zinc-700 bg-zinc-950/25 p-6 text-center">
            <p className="text-sm text-zinc-500">No hay turnos para hoy</p>
          </div>
        ) : (
          <div className="space-y-2">
            {turnosOperativos.map((t) => (
              <article
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-[20px] border border-zinc-800 bg-zinc-950/40 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-white">{t.clienteNombre}</p>
                    {t.esMarcianoSnapshot ? (
                      <span className="rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-300">
                        Marciano
                      </span>
                    ) : null}
                    {t.prioridadAbsoluta ? (
                      <span className="rounded-full border border-amber-300/40 bg-amber-300/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                        !
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {t.horaInicio} · {t.duracionMinutos} min
                    {t.servicioNombre ? ` · ${t.servicioNombre}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getBadgeTone(t.estado)}`}
                >
                  {getEstadoLabel(t.estado)}
                </span>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Marcianos section */}
      {marcianosTurnos.length > 0 ? (
        <div>
          <p className="eyebrow mb-3 text-xs text-[#8cff59]">Marcianos hoy</p>
          <div className="space-y-2">
            {marcianosTurnos.map((m) => (
              <div
                key={m.turnoId}
                className="flex items-center gap-3 rounded-[20px] border border-[#8cff59]/15 bg-[#8cff59]/5 px-4 py-3"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#8cff59]" />
                <p className="text-sm font-semibold text-white">{m.clienteNombre ?? "Marciano"}</p>
                <span className="ml-auto text-xs text-zinc-400">{m.horaInicio.slice(0, 5)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Footer link */}
      <Link
        href="/turnos"
        className="block rounded-[20px] border border-zinc-800 bg-zinc-900/60 px-5 py-3.5 text-center text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:text-white"
      >
        Ver agenda completa →
      </Link>
    </div>
  );
}

export default function HoyDashboard({
  barberoNombre,
  fechaLabel,
  totalCobrado,
  atencionesCount,
  turnosOperativos,
  turnosPendientesConAcciones,
  proximoTurno,
  servicios,
  mediosPago,
  registrarAction,
  marcianosTurnos,
}: Props) {
  const [showCobrar, setShowCobrar] = useState(false);
  const [showTurnos, setShowTurnos] = useState(false);

  const pendientesCount = turnosPendientesConAcciones.length;
  const operativosCount = turnosOperativos.length;

  return (
    <>
      <div className="flex h-[calc(100svh-9rem)] min-h-[480px] flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#8cff59]">A51</span>
            <span className="text-zinc-600">·</span>
            <span className="text-sm text-zinc-400">{fechaLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/8 px-2.5 py-1 text-xs font-semibold text-[#8cff59]">
              {totalCobrado > 0 ? formatARS(totalCobrado) : "--"}
            </span>
            <span className="rounded-full border border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-xs font-semibold text-zinc-300">
              {atencionesCount} {atencionesCount === 1 ? "atención" : "atenciones"}
            </span>
          </div>
        </div>

        {/* Central zone */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
          {/* COBRAR button — dominant */}
          <button
            type="button"
            onClick={() => setShowCobrar(true)}
            className="neon-button flex flex-[2] flex-col items-center justify-center gap-2 rounded-[28px] transition active:scale-[0.98]"
          >
            <BoltIcon />
            <span className="font-display text-3xl font-bold">COBRAR</span>
            <span className="text-sm opacity-70">Atención express</span>
          </button>

          {/* Secondary grid */}
          <div className="grid flex-1 grid-cols-2 gap-3">
            {/* TURNOS */}
            <button
              type="button"
              onClick={() => setShowTurnos(true)}
              className="panel-card flex flex-col items-center justify-center gap-2 rounded-[28px] p-4 transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <CalendarIcon />
              <span className="font-display text-base font-bold text-white">TURNOS</span>
              <div className="flex flex-wrap justify-center gap-1">
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                  {operativosCount} hoy
                </span>
                {pendientesCount > 0 ? (
                  <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    {pendientesCount} pend.
                  </span>
                ) : null}
              </div>
            </button>

            {/* MÚSICA */}
            <Link
              href="/musica"
              className="panel-card flex flex-col items-center justify-center gap-2 rounded-[28px] p-4 transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <MusicIcon />
              <span className="font-display text-base font-bold text-white">MÚSICA</span>
              <span className="text-xs text-zinc-500">Studio</span>
            </Link>
          </div>
        </div>

        {/* Footer — próximo turno */}
        <div className="shrink-0 border-t border-zinc-800/60 px-4 py-3">
          {proximoTurno ? (
            <Link href="/turnos" className="flex items-center gap-2 transition hover:opacity-80">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <p className="truncate text-sm text-zinc-300">
                <span className="font-semibold text-white">
                  {proximoTurno.horaInicio.slice(0, 5)}
                </span>
                {" · "}
                {proximoTurno.clienteNombre}
                {proximoTurno.servicioNombre ? ` · ${proximoTurno.servicioNombre}` : ""}
              </p>
            </Link>
          ) : (
            <p className="text-sm text-zinc-500">Agenda libre hoy</p>
          )}
        </div>
      </div>

      {/* Overlay COBRAR */}
      <FullScreenOverlay
        isOpen={showCobrar}
        onClose={() => setShowCobrar(false)}
        title="Cobro express"
      >
        <QuickCheckoutPanel
          servicios={servicios}
          mediosPago={mediosPago}
          action={registrarAction}
          returnTo="/hoy"
        />
      </FullScreenOverlay>

      {/* Overlay TURNOS */}
      <FullScreenOverlay
        isOpen={showTurnos}
        onClose={() => setShowTurnos(false)}
        title={`Turnos de hoy${operativosCount > 0 ? ` · ${operativosCount}` : ""}`}
      >
        <TurnosOverlayContent
          turnosOperativos={turnosOperativos}
          turnosPendientesConAcciones={turnosPendientesConAcciones}
          marcianosTurnos={marcianosTurnos}
        />
      </FullScreenOverlay>
    </>
  );
}
