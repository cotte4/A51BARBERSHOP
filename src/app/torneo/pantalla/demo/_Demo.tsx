"use client";

import { useMemo, useState } from "react";
import {
  avanzarGanador,
  calcularPodio,
  ordenRuleta,
  revealDesdePaso,
  sortearTorneo,
  torneoTerminado,
  type Marcador,
  type PartidoCuadro,
} from "@/lib/torneo";
import { CATALOGO_CLUBES, esTocho, PROBABILIDAD_TOCHO } from "@/lib/torneo-escudos";
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

/** El reveal del ensayo en dos fases, igual que el de verdad: un paso por jugador y uno por cruce. */
function pasosDelEnsayo(cuadro: PartidoCuadro[], paso: number) {
  return revealDesdePaso(paso, ordenRuleta(cuadro).length, cuadro.filter((p) => p.ronda === 1).length);
}

type Premium = { abierta: boolean; ultimoCambio: TableroPublico["ultimoCambio"] };

function armarTablero(
  cuadro: PartidoCuadro[],
  asignaciones: { jugadorId: string; equipoId: string }[],
  revealPaso: number,
  premium: Premium,
): TableroPublico {
  const equipoDe = new Map(asignaciones.map((a) => [a.jugadorId, a.equipoId] as const));
  const terminado = torneoTerminado(cuadro);
  const reveal = pasosDelEnsayo(cuadro, revealPaso);
  return {
    torneo: {
      nombre: "Torneo FIFA A51 (ensayo)",
      estado: terminado ? "finalizado" : reveal.completo ? "en_juego" : "sorteado",
      fecha: null,
      premiosTexto: null,
      revealPaso: reveal.paso,
      revealTotal: reveal.total,
      ventanaPremium: premium.abierta ? "abierta" : null,
    },
    ultimoCambio: premium.ultimoCambio,
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
    // Igual que el de verdad: los tochos salen 1,5% por giro.
    tochos: { esTocho, probabilidad: PROBABILIDAD_TOCHO },
  });
  return r;
}

export default function Demo() {
  const [sorteo, setSorteo] = useState(nuevoSorteo);
  const [cuadro, setCuadro] = useState<PartidoCuadro[]>(sorteo.partidos);
  const [revealPaso, setRevealPaso] = useState(0);
  const [empezo, setEmpezo] = useState(false);
  const [premium, setPremium] = useState<Premium>({ abierta: false, ultimoCambio: null });

  const datos: DatosPantalla = useMemo(
    () => ({
      previa: { nombre: "Torneo FIFA A51 (ensayo)", pagados: 16, cupo: 16 },
      tablero: empezo
        ? armarTablero(
            cuadro,
            sorteo.asignaciones.map((a) => ({ jugadorId: a.jugadorId, equipoId: a.equipoId })),
            revealPaso,
            premium,
          )
        : null,
    }),
    [cuadro, empezo, revealPaso, sorteo, premium],
  );

  const reveal = pasosDelEnsayo(cuadro, revealPaso);
  const total = reveal.total;
  const siguientePartido = cuadro.find((p) => p.estado === "listo");

  function simularResultado() {
    if (!siguientePartido?.jugadorAId || !siguientePartido.jugadorBId) return;
    const ganaA = Math.random() < 0.5;
    const gana = ganaA ? siguientePartido.jugadorAId : siguientePartido.jugadorBId;
    // Si salió empate, gana por penales el que ya habíamos elegido.
    const marcador = marcadorDeMentira(ganaA);
    setCuadro(avanzarGanador(cuadro, siguientePartido.ronda, siguientePartido.posicion, gana, marcador));
  }

  // Ensayo de la ventana premium: a un jugador al azar le toca un equipo libre (en el de verdad lo elige Pinky).
  const momentoPremium = reveal.equiposVistos === reveal.jugadores && reveal.crucesVistos === 0;
  function cambioDeEnsayo() {
    const usados = new Set(sorteo.asignaciones.map((a) => a.equipoId));
    const libres = EQUIPOS.filter((e) => !usados.has(e));
    if (libres.length === 0) return;
    const a = sorteo.asignaciones[Math.floor(Math.random() * sorteo.asignaciones.length)];
    const nuevo = libres[Math.floor(Math.random() * libres.length)];
    setSorteo({ ...sorteo, asignaciones: sorteo.asignaciones.map((x) => (x === a ? { ...x, equipoId: nuevo } : x)) });
    setPremium((p) => ({
      ...p,
      ultimoCambio: { id: String(Math.random()), jugadorId: a.jugadorId, tipo: Math.random() < 0.5 ? "reroll" : "elegir" },
    }));
  }

  function reiniciar() {
    const otro = nuevoSorteo();
    setSorteo(otro);
    setCuadro(otro.partidos);
    setRevealPaso(0);
    setEmpezo(false);
    setPremium({ abierta: false, ultimoCambio: null });
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
            {momentoPremium ? (
              premium.abierta ? (
                <>
                  <button type="button" className={boton} onClick={cambioDeEnsayo}>
                    Cambio premium
                  </button>
                  <button type="button" className={boton} onClick={() => setPremium((p) => ({ ...p, abierta: false }))}>
                    Cerrar ventana
                  </button>
                </>
              ) : (
                <button type="button" className={boton} onClick={() => setPremium((p) => ({ ...p, abierta: true }))}>
                  Abrir ventana premium
                </button>
              )
            ) : null}
            <button
              type="button"
              className={boton}
              disabled={revealPaso >= total || premium.abierta}
              onClick={() => setRevealPaso((p) => Math.min(total, p + 1))}
            >
              {reveal.completo
                ? "Sorteo completo"
                : reveal.fase === "equipos"
                  ? `Siguiente equipo (${reveal.equiposVistos + 1} de ${reveal.jugadores})`
                  : `Siguiente cruce (${reveal.crucesVistos + 1} de ${reveal.cruces})`}
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
