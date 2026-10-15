"use client";

import { useState, useTransition } from "react";
import {
  abrirVentanaPremiumAction,
  cerrarVentanaPremiumAction,
  reiniciarRevealAction,
  siguienteRevealAction,
  type TorneoAdminState,
} from "./actions";
import type { RevealPanel } from "./_Panel";
import VentanaPremium from "./_VentanaPremium";

type Etapa = "ruleta" | "premium" | "cruces" | "listo";

const ETAPAS: { id: Exclude<Etapa, "listo">; titulo: string }[] = [
  { id: "ruleta", titulo: "Ruleta" },
  { id: "premium", titulo: "Premium" },
  { id: "cruces", titulo: "Cruces" },
];

export default function Pantalla({ reveal }: { reveal: RevealPanel }) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { paso, total, pasosEquipos, proximo, momentoPremium: momento } = reveal;
  const completo = paso >= total;
  const cruces = total - pasosEquipos;
  const crucesVistos = Math.max(0, paso - pasosEquipos);
  const etapa: Etapa = completo
    ? "listo"
    : momento === "todavia"
      ? "ruleta"
      : momento === "disponible" || momento === "abierta"
        ? "premium"
        : "cruces";

  function correr(accion: () => Promise<TorneoAdminState>) {
    setError(null);
    startTransition(async () => {
      const resultado = await accion();
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  function repetir() {
    if (!window.confirm("¿Repetir el sorteo en la pantalla desde el principio?")) return;
    correr(reiniciarRevealAction);
  }

  // Lo que hace el botón grande, dicho con lo que va a pasar en la tele.
  const accion =
    etapa === "ruleta"
      ? { texto: proximo ? `Girar la ruleta de ${proximo}` : "Girar la ruleta", detalle: `Jugador ${paso + 1} de ${pasosEquipos}` }
      : etapa === "premium"
        ? { texto: "Mostrar los cruces", detalle: `Cruce 1 de ${cruces}` }
        : etapa === "cruces"
          ? { texto: `Mostrar el cruce ${crucesVistos + 1}`, detalle: `${crucesVistos} de ${cruces} a la vista` }
          : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Dónde estamos: solo la etapa de ahora se ve fuerte; lo que pasó queda tildado. */}
      {pasosEquipos > 0 ? <LineaEtapas etapa={etapa} /> : null}

      {etapa === "ruleta" ? <Puntos hechos={paso} total={pasosEquipos} /> : null}
      {etapa === "cruces" ? <Puntos hechos={crucesVistos} total={cruces} /> : null}

      {momento === "disponible" ? (
        <div className="rounded-[22px] border border-[#8cff59]/30 bg-[#8cff59]/[0.06] p-4">
          <p className="font-semibold text-white">Todos tienen equipo.</p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            Preguntá en voz alta si alguien quiere cambiar el suyo:{" "}
            <span className="font-semibold text-[#8cff59]">$5.000</span> vuelve a girar,{" "}
            <span className="font-semibold text-[#8cff59]">$10.000</span> elige el que quiere.
          </p>
          <button
            type="button"
            disabled={pendiente}
            onClick={() => correr(abrirVentanaPremiumAction)}
            className="ghost-button mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] px-4 text-base font-semibold disabled:opacity-60"
          >
            <IconoEstrella />
            Alguien quiere: abrir ventana premium
          </button>
        </div>
      ) : null}

      {momento === "abierta" ? (
        <VentanaPremium
          sorteados={reveal.sorteados}
          libres={reveal.libres}
          ocupado={pendiente}
          alCerrar={() => correr(cerrarVentanaPremiumAction)}
        />
      ) : null}

      {/* Con la ventana abierta el botón grande no está: los cruces esperan a que Pinky la cierre. */}
      {momento !== "abierta" ? (
        <button
          type="button"
          disabled={completo || pendiente}
          onClick={() => correr(siguienteRevealAction)}
          className={`relative flex min-h-[72px] w-full items-center justify-center gap-3 overflow-hidden rounded-[22px] px-5 py-3 font-bold tracking-tight transition-transform duration-150 ease-out active:scale-[0.97] disabled:cursor-default ${
            completo ? "border border-[#8cff59]/30 bg-[#8cff59]/10 text-[#8cff59]" : "neon-button disabled:opacity-60"
          }`}
        >
          {pendiente ? (
            <span
              aria-hidden="true"
              className="h-5 w-5 shrink-0 rounded-full border-2 border-[#07130a]/30 border-t-[#07130a] motion-safe:animate-[a51-spin_0.7s_linear_infinite]"
            />
          ) : null}
          {accion ? (
            <span className="flex min-w-0 flex-col items-center leading-tight">
              <span className="max-w-full truncate text-xl">{accion.texto}</span>
              <span className="mt-0.5 text-xs font-semibold opacity-70">{accion.detalle}</span>
            </span>
          ) : (
            <span className="text-xl">Sorteo completo ✓</span>
          )}
          {accion && !pendiente ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <a
          href="/torneo/pantalla"
          target="_blank"
          rel="noopener noreferrer"
          className="ghost-button flex min-h-12 items-center justify-center gap-1.5 rounded-[18px] px-3 text-sm font-semibold"
        >
          Abrir la tele
          <IconoAfuera />
        </a>
        <a
          href="/torneo/pantalla/demo"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center gap-1.5 rounded-[18px] border border-zinc-700 px-3 text-sm font-semibold text-zinc-300 hover:border-zinc-500"
        >
          Ensayar
          <IconoAfuera />
        </a>
      </div>

      <button
        type="button"
        disabled={pendiente}
        onClick={repetir}
        className="min-h-11 self-start px-1 text-sm font-medium text-zinc-500 hover:text-amber-300 disabled:opacity-60"
      >
        Repetir el sorteo en pantalla
      </button>
    </div>
  );
}

function LineaEtapas({ etapa }: { etapa: Etapa }) {
  const actual = etapa === "listo" ? ETAPAS.length : ETAPAS.findIndex((e) => e.id === etapa);
  return (
    <ol className="flex items-center gap-2" aria-label="Etapas del sorteo">
      {ETAPAS.map((e, i) => {
        const hecha = i < actual;
        const ahora = i === actual;
        return (
          <li key={e.id} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                hecha
                  ? "bg-[#8cff59] text-[#07130a]"
                  : ahora
                    ? "border-2 border-[#8cff59] text-[#8cff59] shadow-[0_0_12px_rgba(140,255,89,0.5)]"
                    : "border border-zinc-700 text-zinc-500"
              }`}
              aria-hidden="true"
            >
              {hecha ? "✓" : i + 1}
            </span>
            <span
              className={`truncate text-sm ${ahora ? "font-semibold text-white" : hecha ? "text-zinc-400" : "text-zinc-500"}`}
            >
              {e.titulo}
              {ahora ? <span className="sr-only"> (ahora)</span> : null}
            </span>
            {i < ETAPAS.length - 1 ? <span className="h-px min-w-3 flex-1 bg-zinc-800" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Un punto por paso de la etapa actual: los mostrados prenden, el próximo late. */
function Puntos({ hechos, total }: { hechos: number; total: number }) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${Math.max(total, 1)}, minmax(0, 1fr))` }}
      aria-hidden="true"
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 rounded-full transition-[background-color,box-shadow] duration-500 ${
            i < hechos
              ? "bg-[#8cff59] shadow-[0_0_10px_rgba(140,255,89,0.55)]"
              : i === hechos
                ? "bg-[#8cff59]/35 motion-safe:animate-pulse"
                : "bg-zinc-800"
          }`}
        />
      ))}
    </div>
  );
}

function IconoEstrella() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7L12 3z" strokeLinejoin="round" />
    </svg>
  );
}

function IconoAfuera() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
