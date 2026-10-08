"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

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

// Suscripciones a media queries para useSyncExternalStore (sin setState en efectos).
function suscribirA(query: string) {
  return (avisar: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", avisar);
    return () => mq.removeEventListener("change", avisar);
  };
}
const MOVIMIENTO_REDUCIDO = "(prefers-reduced-motion: reduce)";
const PANTALLA_SM = "(min-width: 640px)";
const PANTALLA_LG = "(min-width: 1024px)";
const suscribirMovimiento = suscribirA(MOVIMIENTO_REDUCIDO);
const suscribirSm = suscribirA(PANTALLA_SM);
const suscribirLg = suscribirA(PANTALLA_LG);
const enServidor = () => false;

function delay(ms: number): CSSProperties {
  return { "--revela-delay": `${ms}ms` } as CSSProperties;
}

/** Pelota quieta para quien pidió menos movimiento: sin WebGL ni loop de render. */
function PelotaQuieta() {
  return (
    <svg viewBox="0 0 120 120" className="h-40 w-40" aria-hidden="true">
      <defs>
        <radialGradient id="pelota-quieta-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8cff59" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8cff59" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#pelota-quieta-halo)" />
      <circle cx="60" cy="60" r="34" fill="#0d160c" stroke="#8cff59" strokeOpacity="0.6" strokeWidth="1.5" />
      <path d="M60 46l13 9.5-5 15.5H52l-5-15.5z" fill="#8cff59" />
      <path
        d="M60 46V27M73 55.5l17-6M68 71l11 14M52 71l-11 14M47 55.5l-17-6"
        stroke="#8cff59"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      <ellipse cx="60" cy="60" rx="50" ry="13" fill="none" stroke="#8cff59" strokeOpacity="0.7" strokeWidth="1.2" transform="rotate(-8 60 60)" />
    </svg>
  );
}

/** Tarjeta del hero cuando la reserva está cerrada: el torneo es lo único que se vende. */
export default function TorneoHeroCard({ datos: torneo }: { datos?: TorneoDatosLanding }) {
  const datos = filas(torneo);
  const raiz = useRef<HTMLDivElement>(null);
  // "visto": la entrada se dispara una vez. "cerca": la pelota 3D solo renderiza cuando está a la vista.
  const [visto, setVisto] = useState(false);
  const [cerca, setCerca] = useState(false);
  const quieto = useSyncExternalStore(suscribirMovimiento, () => window.matchMedia(MOVIMIENTO_REDUCIDO).matches, enServidor);
  const sm = useSyncExternalStore(suscribirSm, () => window.matchMedia(PANTALLA_SM).matches, enServidor);
  const lg = useSyncExternalStore(suscribirLg, () => window.matchMedia(PANTALLA_LG).matches, enServidor);
  // El canvas se pide del tamaño que se ve (antes: 400px escalado a 0.72 en el celular = píxeles de más).
  const tamano = lg ? 400 : sm ? 360 : 300;

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisto(true);
      setCerca(true);
      return;
    }
    const entrada = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setVisto(true);
          entrada.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    // Monta/desmonta el WebGL según esté cerca de la pantalla: fuera de vista no gasta batería.
    const vista = new IntersectionObserver(([e]) => setCerca(Boolean(e?.isIntersecting)), {
      rootMargin: "200px 0px",
    });
    entrada.observe(el);
    vista.observe(el);
    return () => {
      entrada.disconnect();
      vista.disconnect();
    };
  }, []);

  return (
    <div
      ref={raiz}
      data-visto={visto ? "si" : "no"}
      data-cta-torneo=""
      className="animate-scale-in-landing panel-card relative overflow-hidden rounded-[36px] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:p-5 lg:p-6"
      style={{ animationDelay: "0.15s" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(140,255,89,0.2),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(255,59,78,0.08),transparent_35%)]" />
      <div className="relative">
        <div className="revela flex items-center gap-3">
          <div className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8cff59]">
            A51 // torneo
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-[#8cff59]/50 via-[#8cff59]/20 to-transparent" />
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Señal interceptada</div>
        </div>

        {/* Alto fijo por breakpoint: la pelota entra sin mover el layout. */}
        <div className="revela relative mx-auto flex h-[260px] items-center justify-center sm:h-[330px] lg:h-[370px]" style={delay(120)}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8cff59]/10 blur-3xl"
          />
          {quieto ? (
            <PelotaQuieta />
          ) : cerca ? (
            <div className="pop-in">
              <PelotaAlien key={tamano} tamano={tamano} />
            </div>
          ) : null}
        </div>

        <div className="revela rounded-[28px] border border-white/10 bg-white/5 p-4" style={delay(220)}>
          <dl className="space-y-3">
            {datos.map((row, i) => (
              <div key={row.label} className="revela flex items-center justify-between gap-3" style={delay(280 + i * 60)}>
                <dt className="text-sm text-zinc-400">{row.label}</dt>
                <dd
                  className={`text-sm font-semibold ${"accent" in row && row.accent ? "text-[#8cff59]" : "text-zinc-100"}`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="revela mt-4" style={delay(620)}>
          <Link
            href="/torneo"
            className="cta-torneo neon-button group flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold"
          >
            Anotarme al torneo
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <p className="mt-2.5 text-center text-xs text-zinc-400">
            Te anotás online · el cupo va por orden de pago
          </p>
        </div>
      </div>
    </div>
  );
}
