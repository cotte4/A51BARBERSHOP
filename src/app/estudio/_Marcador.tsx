"use client";

import { FICHAS, type ModeloNave } from "@/lib/estudio-naves";
import { colorAyudaCss, NOMBRE_AYUDA, type TipoAyuda } from "./_naveAyudas";
import type { EstadoJuego, RecordJuego, RivalJuego } from "./_naveJuego";

// El marcador del jueguito de la nave: vidas, puntos, multiplicador y racha arriba; abajo de eso,
// chiquito, el récord a batir, la ayuda que tenés y la vida del jefe. Al arrancar, la leyenda con lo
// que se esquiva y lo que se agarra. La pausa abre un cartel con Seguir, el hangar y Salir; al perder,
// el cartel con el récord del tema, lo que se destrabó y el hangar. Lo demás queda libre para la nave.

const VIDAS = 3;
/** El escudo del trompo, del color del trompo (como su burbuja en la nave). */
const COLOR_ESCUDO_TROMPO = "#ff9a3c";

/** "con el Anillo": el nombre de la nave como se lee en el hangar. */
const conNave = (modelo: ModeloNave) => `con el ${FICHAS[modelo].nombre}`;
const enTemas = (temas: number) => (temas > 1 ? ` · ${temas} temas` : "");
const lineaRecord = (r: RecordJuego) => `${r.puntos} · ${conNave(r.modelo)}${enTemas(r.temas)}`;

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

function PausaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <rect x="6.5" y="5" width="3.6" height="14" rx="1.2" />
      <rect x="13.9" y="5" width="3.6" height="14" rx="1.2" />
    </svg>
  );
}

// ————— La leyenda: dibujitos de lo que se ve en el juego, con los colores que tienen ahora —————

/** La piedra oscura con brasa y su halo redondo. */
function MeteoritoIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill={color} fillOpacity="0.22" />
      <path d="M7 8.5 10.5 5.5l5 .8 3 4-1 5.2-4 3-5-.7-2.7-4.3Z" fill="#3f3934" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 10.5l1.6 1.2M13.8 13.5l1.4-.6" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** La estrella de cinco puntas con su destello en cruz. */
function EstrellaIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" aria-hidden="true">
      <path d="M12 0.5v5M12 18.5v5M0.5 12h5M18.5 12h5" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
      <path d="m12 4.6 2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.5-4.5 2.5 1-5L4.8 9.8l5-.6Z" fill={color} strokeLinejoin="round" />
      <path d="m12 9.4.9 1.8 2 .3-1.5 1.3.4 2-1.8-1-1.8 1 .4-2-1.5-1.3 2-.3Z" fill="#fff" />
    </svg>
  );
}

/** Las marcas en el plano de la nave: la del meteorito es un prohibido, la de la estrella un blanco. */
function MarcaIcon({ tipo, color }: { tipo: "peligro" | "estrella"; color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke={color} strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      {tipo === "peligro" ? <path d="m7.5 7.5 9 9M16.5 7.5l-9 9" strokeLinecap="round" /> : <circle cx="12" cy="12" r="2.6" fill={color} stroke="none" />}
    </svg>
  );
}

function CapsulaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="none" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="8" width="18" height="8" rx="4" stroke="#e4e4e7" />
      <path d="M8.5 8v8" stroke={colorAyudaCss("escudo")} />
      <path d="M12 8v8" stroke={colorAyudaCss("iman")} />
      <path d="M15.5 8v8" stroke={colorAyudaCss("laser")} />
    </svg>
  );
}

function Leyenda({ estrella, peligro }: { estrella: string; peligro: string }) {
  return (
    <ul className="mt-3 flex flex-col gap-1.5 rounded-[18px] border border-white/10 bg-zinc-950/60 px-3 py-2.5 text-left backdrop-blur">
      <li className="flex items-center gap-2.5">
        <MeteoritoIcon color={peligro} />
        <MarcaIcon tipo="peligro" color={peligro} />
        <span className="text-sm text-zinc-200">
          <span className="font-semibold text-white">Meteorito:</span> esquivalo
        </span>
      </li>
      <li className="flex items-center gap-2.5">
        <EstrellaIcon color={estrella} />
        <MarcaIcon tipo="estrella" color={estrella} />
        <span className="text-sm text-zinc-200">
          <span className="font-semibold text-white">Estrella:</span> agarrala, +5
        </span>
      </li>
      <li className="flex items-center gap-2.5">
        <CapsulaIcon />
        <span className="w-5 shrink-0" aria-hidden="true" />
        <span className="text-sm text-zinc-200">
          <span className="font-semibold text-white">Cápsula:</span> escudo, imán o láser
        </span>
      </li>
    </ul>
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
  /** Pausa (true) o sigue (false) la partida. */
  onPausa: (pausa: boolean) => void;
};

export default function Marcador({ estado, sonando, rival: rivalProp, desbloqueos, onSalir, onOtraVez, onHangar, onPausa }: Props) {
  const { puntos, vidas, multiplicador, racha, temas, pausa, leyenda, record, termino, recordNuevo, modelo, ayuda, escudoListo, jefe } = estado;
  const rival = rivalProp === undefined ? estado.rival : rivalProp;
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
            {racha > 0 || temas > 1 ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                {multiplicador > 1 ? (
                  <span className="rounded-full bg-[#8cff59] px-2 py-0.5 text-xs font-bold tabular-nums text-[#07130a]">×{multiplicador}</span>
                ) : null}
                <span className="text-xs font-semibold tabular-nums text-zinc-300 drop-shadow">
                  {[racha > 0 ? `Racha ${racha}` : null, temas > 1 ? `Tema ${temas}` : null].filter(Boolean).join(" · ")}
                </span>
              </div>
            ) : null}
            {!sonando && !termino && !pausa ? <span className="mt-2 rounded-full bg-zinc-950/70 px-3 py-1 text-xs text-zinc-300">En pausa</span> : null}
          </div>
          <div className="flex justify-end">
            {termino || pausa ? null : (
              <button
                type="button"
                onClick={() => onPausa(true)}
                aria-label="Pausar el juego"
                className="pointer-events-auto rounded-full border border-white/15 bg-zinc-950/60 p-2.5 text-zinc-200 backdrop-blur hover:text-[#8cff59]"
              >
                <PausaIcon />
              </button>
            )}
          </div>
        </div>

        {!termino && !pausa ? (
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

            {leyenda ? (
              <div className="space-y-1.5">
                <Leyenda estrella={leyenda.estrella} peligro={leyenda.peligro} />
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

      {pausa && !termino ? (
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center p-6">
          <div role="dialog" aria-label="Juego en pausa" className="pointer-events-auto w-full max-w-xs rounded-[28px] border border-white/10 bg-zinc-950/80 p-6 text-center backdrop-blur">
            <p className="eyebrow text-xs font-semibold">Pausa</p>
            <p className="mt-2 font-display text-6xl font-bold leading-none tabular-nums text-white">{puntos}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {puntos === 1 ? "punto" : "puntos"} {conNave(modelo)}
              {temas > 1 ? ` · tema ${temas}` : ""}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={onSalir} className="ghost-button rounded-[20px] px-4 py-3 font-semibold">
                Salir
              </button>
              <button type="button" onClick={onHangar} className="ghost-button flex items-center justify-center gap-1.5 rounded-[20px] px-4 py-3 font-semibold">
                <HangarIcon />
                Hangar
              </button>
              <button type="button" onClick={() => onPausa(false)} className="neon-button col-span-2 rounded-[20px] px-4 py-3 font-semibold">
                Seguir
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {termino ? (
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center p-6">
          <div className="pointer-events-auto w-full max-w-xs rounded-[28px] border border-white/10 bg-zinc-950/80 p-6 text-center backdrop-blur">
            <p className="eyebrow text-xs font-semibold">Fin del juego</p>
            <p className="mt-2 font-display text-6xl font-bold leading-none tabular-nums text-white">{puntos}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {puntos === 1 ? "punto" : "puntos"} {conNave(modelo)}
              {temas > 1 ? ` · en ${temas} temas` : ""}
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
