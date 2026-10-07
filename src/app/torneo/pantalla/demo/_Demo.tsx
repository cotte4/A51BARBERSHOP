"use client";

import { useMemo, useState } from "react";
import {
  avanzarGanador,
  calcularPodio,
  sortearTorneo,
  torneoTerminado,
  type PartidoCuadro,
} from "@/lib/torneo";
import type { DatosPantalla, TableroPublico } from "@/lib/torneo-juego";
import { PantallaVista } from "../_Pantalla";

// Ensayo para probar la tele y el reveal: jugadores inventados, sin tocar la base de datos.
const NOMBRES = [
  "Santi P.", "Mati R.", "Facu L.", "Nico G.", "Lucho M.", "Gonza S.", "Tomi A.", "Maxi D.",
  "Fede C.", "Agus B.", "Joaco V.", "Dami F.", "Bauti H.", "Pipe T.", "Lean O.", "Cris N.",
];
const EQUIPOS = [
  "Real Madrid", "Barcelona", "Manchester City", "Liverpool", "Bayern Múnich", "PSG", "Juventus",
  "Inter", "Milan", "Chelsea", "Arsenal", "Manchester United", "Atlético de Madrid",
  "Borussia Dortmund", "Napoli", "Benfica", "Ajax", "River Plate", "Boca Juniors", "Flamengo",
];

function armarTablero(
  cuadro: PartidoCuadro[],
  asignaciones: { jugadorId: string; equipoId: string }[],
  revealPaso: number,
): TableroPublico {
  const equipoDe = new Map(asignaciones.map((a) => [a.jugadorId, a.equipoId] as const));
  const terminado = torneoTerminado(cuadro);
  return {
    torneo: {
      nombre: "Torneo FIFA A51 (ensayo)",
      estado: terminado ? "finalizado" : revealPaso >= cuadro.filter((p) => p.ronda === 1).length ? "en_juego" : "sorteado",
      fecha: null,
      premiosTexto: null,
      revealPaso,
    },
    jugadores: NOMBRES.map((nombre, i) => ({ id: `j${i + 1}`, nombre, equipo: equipoDe.get(`j${i + 1}`) ?? null })),
    partidos: cuadro.map((p) => ({
      id: `p-${p.ronda}-${p.posicion}`,
      ronda: p.ronda,
      posicion: p.posicion,
      jugadorAId: p.jugadorAId,
      jugadorBId: p.jugadorBId,
      ganadorId: p.ganadorId,
      marcadorA: p.marcadorA,
      marcadorB: p.marcadorB,
      esBye: p.esBye,
      estado: p.estado,
    })),
    podio: calcularPodio(cuadro),
  };
}

function nuevoSorteo() {
  const semilla = String(Math.random());
  const r = sortearTorneo({
    jugadorIds: NOMBRES.map((_, i) => `j${i + 1}`),
    equipoIds: EQUIPOS,
    semilla,
  });
  return r;
}

export default function Demo() {
  const [sorteo, setSorteo] = useState(nuevoSorteo);
  const [cuadro, setCuadro] = useState<PartidoCuadro[]>(sorteo.partidos);
  const [revealPaso, setRevealPaso] = useState(0);
  const [empezo, setEmpezo] = useState(false);

  const datos: DatosPantalla = useMemo(
    () => ({
      previa: { nombre: "Torneo FIFA A51 (ensayo)", pagados: 16, cupo: 16 },
      tablero: empezo
        ? armarTablero(
            cuadro,
            sorteo.asignaciones.map((a) => ({ jugadorId: a.jugadorId, equipoId: a.equipoId })),
            revealPaso,
          )
        : null,
    }),
    [cuadro, empezo, revealPaso, sorteo],
  );

  const total = cuadro.filter((p) => p.ronda === 1).length;
  const siguientePartido = cuadro.find((p) => p.estado === "listo");

  function simularResultado() {
    if (!siguientePartido?.jugadorAId || !siguientePartido.jugadorBId) return;
    const gana = Math.random() < 0.5 ? siguientePartido.jugadorAId : siguientePartido.jugadorBId;
    setCuadro(avanzarGanador(cuadro, siguientePartido.ronda, siguientePartido.posicion, gana));
  }

  function reiniciar() {
    const otro = nuevoSorteo();
    setSorteo(otro);
    setCuadro(otro.partidos);
    setRevealPaso(0);
    setEmpezo(false);
  }

  const boton =
    "torneo-hud border border-[#8cff59]/50 bg-black/80 px-3 py-2 text-[11px] text-[#8cff59] hover:bg-[#8cff59]/15 disabled:opacity-30";

  return (
    <>
      <PantallaVista datos={datos} />
      <div className="fixed bottom-3 left-3 z-50 flex flex-wrap gap-2 opacity-30 transition-opacity hover:opacity-100 focus-within:opacity-100">
        {!empezo ? (
          <button type="button" className={boton} onClick={() => setEmpezo(true)}>
            Hacer el sorteo
          </button>
        ) : (
          <>
            <button
              type="button"
              className={boton}
              disabled={revealPaso >= total}
              onClick={() => setRevealPaso((p) => Math.min(total, p + 2))}
            >
              Siguiente
            </button>
            <button
              type="button"
              className={boton}
              disabled={revealPaso < total || !siguientePartido}
              onClick={simularResultado}
            >
              Simular resultado
            </button>
          </>
        )}
        <button type="button" className={boton} onClick={reiniciar}>
          Reiniciar ensayo
        </button>
      </div>
    </>
  );
}
