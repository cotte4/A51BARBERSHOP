import "server-only";

import { getResumenPublico, getTorneoVigente, listarPartidos } from "@/lib/torneo-data";

/** Lo que la pantalla Hoy necesita para mostrarle a Pinky el torneo en curso. */
export type TorneoActivoHoy = {
  nombre: string;
  /** Una línea en castellano llano con la etapa: "Inscripción abierta · 12 de 16 pagaron". */
  etapa: string;
};

/** "Final", "semifinales", "cuartos de final"... según cuántas rondas faltan hasta la final. */
function nombreRondaEnJuego(ronda: number, maxRonda: number): string {
  const faltan = maxRonda - ronda;
  if (faltan === 0) return "la final";
  if (faltan === 1) return "semifinales";
  if (faltan === 2) return "cuartos de final";
  if (faltan === 3) return "octavos de final";
  return `ronda ${ronda}`;
}

/**
 * El torneo sin terminar (el vigente, salvo que ya esté finalizado) con su etapa.
 * null si no hay torneo o ya terminó: en ese caso Hoy no muestra nada.
 * Nunca tira: si la lectura falla, Hoy sigue funcionando sin la tarjeta.
 */
export async function getTorneoActivoParaHoy(): Promise<TorneoActivoHoy | null> {
  try {
    const torneo = await getTorneoVigente();
    if (!torneo || torneo.estado === "finalizado") return null;

    if (torneo.estado === "inscripcion") {
      const { pagados, cupo, lleno } = await getResumenPublico(torneo.id, torneo.cupo);
      return {
        nombre: torneo.nombre,
        etapa: lleno
          ? "Cupo completo · listo para sortear"
          : `Inscripción abierta · ${pagados} de ${cupo} pagaron`,
      };
    }

    if (torneo.estado === "sorteado") {
      return { nombre: torneo.nombre, etapa: "Sorteo en curso" };
    }

    // en_juego: la ronda actual es la primera que todavía tiene un partido sin jugar (los pases directos no cuentan).
    const partidos = await listarPartidos(torneo.id);
    const maxRonda = partidos.reduce((m, p) => Math.max(m, p.ronda), 0);
    const pendientes = partidos.filter((p) => !p.esBye && p.estado !== "jugado");
    if (pendientes.length === 0) return { nombre: torneo.nombre, etapa: "Jugando" };
    const rondaActual = Math.min(...pendientes.map((p) => p.ronda));
    return {
      nombre: torneo.nombre,
      etapa: `Jugando · ${nombreRondaEnJuego(rondaActual, maxRonda)}`,
    };
  } catch (error) {
    console.error("[hoy] no se pudo leer el torneo", error);
    return null;
  }
}
