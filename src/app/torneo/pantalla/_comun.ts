import type { TableroPublico } from "@/lib/torneo-juego";

// Piezas compartidas por la tele (_Pantalla) y las escenas del reveal (_Reveal).

export type Partido = TableroPublico["partidos"][number];
export type Jugador = TableroPublico["jugadores"][number];

export const VERDE = "#8cff59";

/**
 * Cuerpo de letra según el largo del alias (hasta 20 caracteres): el nombre se achica antes que cortarse.
 * `escalones` va de corto a largo: [hasta tantos caracteres, px].
 */
export function cuerpoPorLargo(largo: number, escalones: readonly [number, number][], minimo: number): number {
  for (const [hasta, px] of escalones) if (largo <= hasta) return px;
  return minimo;
}

/** "#rrggbb" + opacidad 0..1 -> "rgba(...)", para degradados con el color del club. */
export function conAlfa(hex: string, alfa: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
}
