"use client";

import { FICHAS, type ModeloNave } from "@/lib/estudio-naves";
import { colorAyudaCss, NOMBRE_AYUDA, type TipoAyuda } from "./_naveAyudas";
import type { EstadoJuego, RecordJuego, RivalJuego } from "./_naveJuego";

// El marcador del jueguito de la nave: vidas, puntos, multiplicador y racha arriba; abajo de eso,
// chiquito, el récord a batir, la ayuda que tenés y la vida del jefe. Al perder, el cartel con el
// récord del tema, lo que se destrabó y el hangar. Lo demás de la pantalla queda libre para la nave.

const VIDAS = 3;
/** El escudo del trompo, del color del trompo (como su burbuja en la nave). */
const COLOR_ESCUDO_TROMPO = "#ff9a3c";

/** "con el Anillo": el nombre de la nave como se lee en el hangar. */
const conNave = (modelo: ModeloNave) => `con el ${FICHAS[modelo].nombre}`;
const lineaRecord = (r: RecordJuego) => `${r.puntos} · ${conNave(r.modelo)}`;

/** "el Anillo", "el Anillo y el Cigarro", "el Anillo, el Cigarro y el Triángulo". */
function listaNaves(modelos: ModeloNave[]) {
  const nombres = modelos.map((m) => `el ${FICHAS[m].nombre}`);
  return nombres.length > 1 ? `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}` : (nombres[0] ?? "");
}

function VidaIcon({ llena }: { llena: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-6 w-6 ${llena ? "text-[#8cff59]" : "text-zinc-600"}`} fill="none" stroke="currentColor" strokeWidth="1.9">
      <ellipse cx="12" cy="13" rx="9" ry="3" fill={llena ? "currentColor" : "none"} fillOpacity={0.25} />
      <path d="M8 11.5a4 4 0 0 1 8 0" strokeLinecap="round" />
    </svg>
  );
}

function CerrarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function EscudoIcon({ className = "h-5 w-5", lleno = false }: { className?: string; lleno?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 3.5 19 6v5.2c0 4.4-2.9 7.9-7 9.3-4.1-1.4-7-4.9-7-9.3V6l7-2.5Z" fill={lleno ? "currentColor" : "none"} fillOpacity={0.2} strokeLinejoin="round" />
    </svg>
  );
}

function ImanIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M5 4h4.5v8a2.5 2.5 0 0 0 5 0V4H19v8a7 7 0 0 1-14 0V4Z" strokeLinejoin="round" />
      <path d="M5 8h4.5M14.5 8H19" />
    </svg>
  );
}

function LaserIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 20 14 10" strokeLinecap="round" />
      <path d="M17.5 3.5 18.6 6l2.4 1.1-2.4 1.1-1.1 2.4-1.1-2.4L14 7.1 16.4 6l1.1-2.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function AyudaIcon({ tipo, className }: { tipo: TipoAyuda; className?: string }) {
  if (tipo === "escudo") return <EscudoIcon className={className} lleno />;
  if (tipo === "iman") return <ImanIcon className={className} />;
  return <LaserIcon className={className} />;
}

function HangarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M3 20V9.5L12 4l9 5.5V20" strokeLinejoin="round" />
      <path d="M7 20v-6.5h10V20M7 16.5h10" strokeLinecap="round" />
    </svg>
  );
}

function NaveNuevaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9">
      <ellipse cx="12" cy="15" rx="9" ry="3" />
      <path d="M8 13.5a4 4 0 0 1 8 0" strokeLinecap="round" />
      <path d="M19 3.5v3M17.5 5h3M5 4v2M4 5h2" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  estado: EstadoJuego;
  sonando: boolean;
  /** El récord del otro en este tema. Sin pasarlo, usa el del estado del juego. */
  rival?: RivalJuego | null;
  /** Las naves que se destrabaron con esta partida (las calcula la integración con `nuevasDesbloqueadas`). */
  desbloqueos: ModeloNave[];
  onSalir: () => void;
  onOtraVez: () => void;
  onHangar: () => void;
};

export default function Marcador({ estado, sonando, rival: rivalProp, desbloqueos, onSalir, onOtraVez, onHangar }: Props) {
  const { puntos, vidas, multiplicador, racha, record, termino, recordNuevo, modelo, ayuda, escudoListo, jefe } = estado;
  const rival = rivalProp === undefined ? estado.rival : rivalProp;
  // La consigna se ve hasta el primer punto de la partida.
  const consigna = puntos === 0 && vidas === VIDAS && !termino;
  const ficha = FICHAS[modelo];
  const leGana = rival !== null && puntos > rival.puntos;
  const hayNaveNueva = desbloqueos.length > 0;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 px-4 pt-[max(env(safe-area-inset-top),16px)]">
        <div className="mx-auto grid max-w-xl grid-cols-[1fr_auto_1fr] items-start">
          <div className="flex items-center gap-1 pt-2">
            <div className="flex gap-1" role="img" aria-label={`${vidas} ${vidas === 1 ? "vida" : "vidas"}`}>
              {Array.from({ length: VIDAS }, (_, i) => (
                <VidaIcon key={i} llena={i < vidas} />
              ))}
            </div>
            {escudoListo !== null ? (
              <span
                role="img"
                aria-label={escudoListo ? "Escudo listo" : "Escudo cargando"}
                className={`ml-1 transition-colors duration-500 ${escudoListo ? "" : "text-zinc-600"}`}
                style={escudoListo ? { color: COLOR_ESCUDO_TROMPO } : undefined}
              >
                <EscudoIcon className="h-6 w-6" lleno={escudoListo} />
              </span>
            ) : null}
          </div>
          <div className="flex flex-col items-center" aria-live="polite">
            <p className="font-display text-5xl font-bold leading-none tabular-nums text-white drop-shadow-[0_0_18px_rgba(140,255,89,0.5)]">{puntos}</p>
            {racha > 0 ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                {multiplicador > 1 ? (
                  <span className="rounded-full bg-[#8cff59] px-2 py-0.5 text-xs font-bold tabular-nums text-[#07130a]">×{multiplicador}</span>
                ) : null}
                <span className="text-xs font-semibold tabular-nums text-zinc-300 drop-shadow">Racha {racha}</span>
              </div>
            ) : null}
            {!sonando && !termino ? <span className="mt-2 rounded-full bg-zinc-950/70 px-3 py-1 text-xs text-zinc-300">En pausa</span> : null}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSalir}
              aria-label="Salir del juego"
              className="pointer-events-auto rounded-full border border-white/15 bg-zinc-950/60 p-2.5 text-zinc-200 backdrop-blur hover:text-[#8cff59]"
            >
              <CerrarIcon />
            </button>
          </div>
        </div>

        {!termino ? (
          <div className="mx-auto mt-2 flex max-w-xl flex-col items-center gap-2 text-center">
            {/* El récord a batir: el del otro; si no hay, el tuyo. */}
            {rival ? (
              <p className={`text-[11px] leading-tight drop-shadow ${leGana ? "font-semibold text-[#8cff59]" : "text-zinc-400"}`}>
                {leGana ? `¡Pasaste a ${rival.nombre}!` : `Récord de ${rival.nombre}: ${lineaRecord(rival)}`}
              </p>
            ) : record ? (
              <p className="text-[11px] leading-tight text-zinc-400 drop-shadow">Tu récord: {lineaRecord(record)}</p>
            ) : null}

            {ayuda ? (
              <div
                role="status"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/60 py-1 pl-2 pr-3 backdrop-blur"
                style={{ color: colorAyudaCss(ayuda.tipo) }}
              >
                <AyudaIcon tipo={ayuda.tipo} className="h-4 w-4" />
                <span className="text-xs font-semibold text-zinc-100">{NOMBRE_AYUDA[ayuda.tipo]}</span>
                <span className="h-1.5 w-14 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                  <span
                    className="block h-full origin-left rounded-full transition-transform duration-300 ease-linear"
                    style={{ transform: `scaleX(${Math.max(0, Math.min(1, ayuda.resta))})`, background: "currentColor" }}
                  />
                </span>
              </div>
            ) : null}

            {jefe ? (
              <div className="w-full max-w-[16rem]" role="status" aria-label={`Jefe: ${Math.round(jefe.vida * 100)}% de vida`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-300">Jefe</span>
                  <span className="text-[11px] text-zinc-300 drop-shadow">{jefe.rompible ? "¡Rompelo a tiros!" : "Aguantá, se va solo"}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full border border-red-500/35 bg-red-500/10">
                  <div className="h-full origin-left rounded-full bg-[#ff3b3b] transition-transform duration-300" style={{ transform: `scaleX(${Math.max(0, Math.min(1, jefe.vida))})` }} />
                </div>
              </div>
            ) : null}

            {consigna ? (
              <div className="mt-3 space-y-1">
                <p className="text-sm text-zinc-300 drop-shadow">Esquivá los meteoritos y agarrá los cristales</p>
                {ficha.habilidad !== "pareja" ? (
                  <p className="text-xs text-zinc-400 drop-shadow">
                    <span className="font-semibold text-zinc-200">{ficha.nombre}:</span> {ficha.descripcion}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {termino ? (
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center p-6">
          <div className="pointer-events-auto w-full max-w-xs rounded-[28px] border border-white/10 bg-zinc-950/80 p-6 text-center backdrop-blur">
            <p className="eyebrow text-xs font-semibold">Fin del juego</p>
            <p className="mt-2 font-display text-6xl font-bold leading-none tabular-nums text-white">{puntos}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {puntos === 1 ? "punto" : "puntos"} {conNave(modelo)}
            </p>

            <div className="mt-3 space-y-1">
              {recordNuevo ? (
                <p className="font-semibold text-[#8cff59]">¡Récord nuevo!</p>
              ) : record ? (
                <p className="text-sm text-zinc-400">Tu récord: {lineaRecord(record)}</p>
              ) : null}
              {rival ? (
                <p className={leGana ? "text-sm font-semibold text-[#8cff59]" : "text-sm text-zinc-400"}>
                  {leGana ? `¡Le ganaste a ${rival.nombre}!` : `Récord de ${rival.nombre}: ${lineaRecord(rival)}`}
                </p>
              ) : null}
            </div>

            {hayNaveNueva ? (
              <div className="mt-4 flex items-start gap-3 rounded-[22px] border border-[#8cff59]/25 bg-[#8cff59]/10 p-3 text-left text-[#8cff59]">
                <NaveNuevaIcon />
                <div>
                  <p className="text-sm font-semibold">¡Desbloqueaste {listaNaves(desbloqueos)}!</p>
                  {desbloqueos.length === 1 ? <p className="mt-0.5 text-xs text-zinc-300">{FICHAS[desbloqueos[0]].descripcion}</p> : null}
                </div>
              </div>
            ) : null}

            {/* La acción principal va abajo y llena: Otra vez, o el hangar si hay nave nueva para probar. */}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={onSalir} className="ghost-button rounded-[20px] px-4 py-3 font-semibold">
                Salir
              </button>
              {hayNaveNueva ? (
                <button type="button" onClick={onOtraVez} className="ghost-button rounded-[20px] px-4 py-3 font-semibold">
                  Otra vez
                </button>
              ) : (
                <button type="button" onClick={onHangar} className="ghost-button flex items-center justify-center gap-1.5 rounded-[20px] px-4 py-3 font-semibold">
                  <HangarIcon />
                  Hangar
                </button>
              )}
              {hayNaveNueva ? (
                <button type="button" onClick={onHangar} className="neon-button col-span-2 flex items-center justify-center gap-2 rounded-[20px] px-4 py-3 font-semibold">
                  <HangarIcon />
                  {desbloqueos.length > 1 ? "Probalas" : "Probala"} en el hangar
                </button>
              ) : (
                <button type="button" onClick={onOtraVez} className="neon-button col-span-2 rounded-[20px] px-4 py-3 font-semibold">
                  Otra vez
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
