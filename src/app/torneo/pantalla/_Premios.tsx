"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Escudo from "@/components/torneo/Escudo";
import { coloresDeEquipo } from "@/lib/torneo-escudos";
import type { TableroPublico } from "@/lib/torneo-juego";
import { usarMovimientoReducido } from "../_movimiento";
import { conAlfa, cuerpoPorLargo, VERDE, type Jugador } from "./_comun";

gsap.registerPlugin(useGSAP);

function nombreRonda(ronda: number, rondas: number, posicion: number): string {
  if (ronda === rondas && posicion === 2) return "Tercer puesto";
  const faltan = rondas - ronda;
  if (faltan === 0) return "la final";
  if (faltan === 1) return "semis";
  if (faltan === 2) return "cuartos";
  if (faltan === 3) return "octavos";
  return `ronda ${ronda}`;
}

/**
 * La pantalla final de premios: 1.º, 2.º, 3.º, 4.º y el mejor gol. Se alterna con la del campeón.
 * Entran de abajo hacia arriba (del 4.º al campeón) para que el último en aparecer sea el que ganó.
 */
export function Premios({ tablero, jugadores }: { tablero: TableroPublico; jugadores: Map<string, Jugador> }) {
  const raiz = useRef<HTMLDivElement>(null);
  const quieto = usarMovimientoReducido();

  const { campeonId, subcampeonId, tercerosIds, tercerJugado } = tablero.podio;
  const rondas = Math.max(...tablero.partidos.map((p) => p.ronda));
  const puestos = [
    { rotulo: "Campeón", id: campeonId, grande: true },
    { rotulo: "Subcampeón", id: subcampeonId, grande: false },
    ...(tercerJugado
      ? [
          { rotulo: "3.º puesto", id: tercerosIds[0] ?? null, grande: false },
          { rotulo: "4.º puesto", id: tercerosIds[1] ?? null, grande: false },
        ]
      : tercerosIds.map((id) => ({ rotulo: "Semifinalista", id, grande: false }))),
  ].filter((p): p is { rotulo: string; id: string; grande: boolean } => p.id !== null);

  const gol = tablero.torneo.mejorGol;
  const autorGol = gol ? jugadores.get(gol.jugadorId) : undefined;
  const partidoGol = gol ? tablero.partidos.find((p) => p.id === gol.partidoId) : undefined;
  const rivalGol = partidoGol
    ? jugadores.get((partidoGol.jugadorAId === gol?.jugadorId ? partidoGol.jugadorBId : partidoGol.jugadorAId) ?? "")
    : undefined;

  useGSAP(
    () => {
      const el = raiz.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      if (quieto) {
        gsap.set(q(".entra"), { opacity: 1 });
        return;
      }
      const t = gsap.timeline();
      t.fromTo(q(".nombre-torneo"), { opacity: 0 }, { opacity: 1, duration: 0.5 })
        .fromTo(q(".titulo"), { opacity: 0, y: -40, letterSpacing: "0.4em" }, { opacity: 1, y: 0, letterSpacing: "0em", duration: 0.8, ease: "expo.out" }, "<0.1")
        // Del último puesto al campeón: el campeón cae al final con más peso.
        .fromTo(
          [...q(".puesto")].reverse(),
          { opacity: 0, y: 80, scale: 0.9 },
          { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.35, ease: "back.out(1.7)" },
          "-=0.3",
        )
        .fromTo(q(".gol"), { opacity: 0, x: 120 }, { opacity: 1, x: 0, duration: 0.6, ease: "power3.out" }, "+=0.2")
        .fromTo(q(".gol-brillo"), { xPercent: -120, opacity: 1 }, { xPercent: 340, duration: 1.2, ease: "power2.inOut" }, "<0.2")
        .set(q(".gol-brillo"), { opacity: 0 });
      // Vivo mientras está a la vista: el campeón respira.
      gsap.to(q(".puesto-grande"), { scale: 1.03, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 3 });
    },
    { scope: raiz, dependencies: [quieto], revertOnUpdate: true },
  );

  return (
    <div ref={raiz} className="absolute inset-0 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: `radial-gradient(70% 60% at 50% 0%, ${conAlfa(VERDE, 0.16)}, transparent 70%)` }}
      />
      <div className="relative flex h-full flex-col items-center px-24 pt-16">
        <p className="nombre-torneo entra torneo-hud text-[24px] text-[#8cff59] opacity-0">{tablero.torneo.nombre}</p>
        <h1 className="titulo entra torneo-titulo mt-2 text-[120px] font-extrabold italic leading-none text-white opacity-0">
          Premios
        </h1>

        <div className="mt-12 flex w-full items-end justify-center gap-8">
          {puestos.map((p) => {
            const j = jugadores.get(p.id);
            const colores = coloresDeEquipo(j?.equipo ?? null);
            const nombre = j?.nombre ?? "—";
            return (
              <div
                key={p.rotulo}
                className={`puesto entra flex flex-col items-center border px-6 opacity-0 ${
                  p.grande ? "puesto-grande w-[460px] py-8" : "w-[330px] py-6"
                }`}
                style={{
                  borderColor: p.grande ? VERDE : conAlfa(colores.vivo, 0.5),
                  background: `linear-gradient(180deg, ${conAlfa(colores.primario, p.grande ? 0.4 : 0.25)}, rgba(0,0,0,0.6))`,
                  boxShadow: p.grande ? `0 0 60px ${conAlfa(VERDE, 0.35)}` : undefined,
                }}
              >
                <p className={`torneo-hud ${p.grande ? "text-[30px]" : "text-[22px]"}`} style={{ color: p.grande ? VERDE : colores.vivo }}>
                  {p.rotulo}
                </p>
                <div className="mt-4">
                  <Escudo equipo={j?.equipo ?? null} tamano={p.grande ? 180 : 110} cargaInmediata />
                </div>
                <p
                  className="torneo-titulo mt-4 max-w-full truncate font-extrabold italic text-white"
                  style={{ fontSize: cuerpoPorLargo(nombre.length, p.grande ? [[10, 76], [14, 60]] : [[10, 50], [14, 40]], p.grande ? 48 : 32) }}
                >
                  {nombre}
                </p>
                {j?.equipo && <p className="torneo-hud mt-1 max-w-full truncate text-[16px] text-white/70">{j.equipo}</p>}
              </div>
            );
          })}
        </div>

        {autorGol && (
          <div className="gol entra relative mt-12 flex items-center gap-8 overflow-hidden border border-[#8cff59]/60 bg-black/60 px-10 py-6 opacity-0">
            <span
              aria-hidden="true"
              className="gol-brillo pointer-events-none absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            />
            <p className="torneo-hud text-[30px] text-[#8cff59]">Mejor gol</p>
            <Escudo equipo={autorGol.equipo ?? null} tamano={84} cargaInmediata />
            <div>
              <p className="torneo-titulo text-[60px] font-extrabold italic leading-none text-white">{autorGol.nombre}</p>
              {partidoGol && (
                <p className="torneo-hud mt-2 text-[20px] text-white/70">
                  En {nombreRonda(partidoGol.ronda, rondas, partidoGol.posicion)}
                  {rivalGol ? ` contra ${rivalGol.nombre}` : ""}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
