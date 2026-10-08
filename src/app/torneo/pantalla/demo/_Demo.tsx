"use client";

import { useMemo, useState } from "react";
import {
  avanzarGanador,
  calcularPodio,
  CRUCES_POR_PASO,
  sortearTorneo,
  torneoTerminado,
  type Marcador,
  type PartidoCuadro,
} from "@/lib/torneo";
import { CATALOGO_CLUBES } from "@/lib/torneo-escudos";
import type { DatosPantalla, TableroPublico } from "@/lib/torneo-juego";
import { PantallaVista } from "../_Pantalla";

// Ensayo para probar la tele y el reveal: alias inventados, sin tocar la base de datos.
// Uno de 20 caracteres (el máximo) para ver que los nombres largos entran en todas las escenas.
const NOMBRES = [
  "Santi", "Mati10", "ElTurco", "Nico_GOL", "Lucho", "Gonzo", "LaPulgaDeVillaCrespo", "Maxi.D",
  "Fede", "Agus", "Joaco", "Dami", "Bauti", "Pipe", "Lean", "Cris",
];
// Los 24 del catálogo más uno sin PNG: a veces sale y así se ensaya también el escudo genérico.
const EQUIPOS = [...CATALOGO_CLUBES.map((c) => c.nombre), "River Plate"];

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

/** Un resultado de FIFA creíble: casi siempre 1 a 4 goles del que gana, y a veces empate y penales. */
function marcadorDeMentira(ganaA: boolean): Marcador {
  const azar = (max: number) => Math.floor(Math.random() * (max + 1));
  if (Math.random() < 0.2) {
    const goles = azar(3);
    return { a: goles, b: goles };
  }
  const ganador = 1 + azar(3);
  const perdedor = azar(ganador - 1);
  return ganaA ? { a: ganador, b: perdedor } : { a: perdedor, b: ganador };
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
    const ganaA = Math.random() < 0.5;
    const gana = ganaA ? siguientePartido.jugadorAId : siguientePartido.jugadorBId;
    // Si salió empate, gana por penales el que ya habíamos elegido.
    const marcador = marcadorDeMentira(ganaA);
    setCuadro(avanzarGanador(cuadro, siguientePartido.ronda, siguientePartido.posicion, gana, marcador));
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
              onClick={() => setRevealPaso((p) => Math.min(total, p + CRUCES_POR_PASO))}
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
