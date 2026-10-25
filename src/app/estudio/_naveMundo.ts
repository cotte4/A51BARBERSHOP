import { MODELOS, type ModeloNave } from "@/lib/estudio-naves";
import { ROSA_3D, VERDE_3D } from "./_naveKit";
import { BIOMAS, type NombreBioma } from "./_naveTerreno";

// Un mundo por tema: cada tema arranca siempre con la misma paleta, el mismo bioma y las mismas
// naves dominantes, así se lo reconoce. Sale solo del id del tema (sin base ni UI). Lo que pasa
// después (eventos, escenas, cambios de paleta en los drops) sigue al azar.

/** Pares [color A, color B] del show. El A pinta bordes y motores; el B, el aro del platillo. */
export const PALETAS: [number, number][] = [
  [VERDE_3D, ROSA_3D],
  [0x2de2ff, 0xa05bff],
  [ROSA_3D, 0xffd23f],
  [VERDE_3D, 0x2de2ff],
  // Sin rojos saturados: son los que más riesgo tienen en destellos.
  [0x7dffb2, 0x5b8cff],
];

export type MundoTema = {
  /** Para sortear otras cosas fijas del tema con `crearAzar(semilla)`. */
  semilla: number;
  /** Índice en PALETAS. */
  paleta: number;
  bioma: NombreBioma;
  /** 2 o 3 modelos, sin repetir: los que más se ven en el show de ese tema (va a kit.flota). */
  flota: ModeloNave[];
};

/** FNV-1a de 32 bits: el mismo texto da siempre el mismo número, y textos parecidos dan muy distintos. */
function hashTexto(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Azar con semilla (mulberry32): misma semilla, misma secuencia. Devuelve 0..1 como Math.random. */
export function crearAzar(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mundoDeTema(temaId: string): MundoTema {
  const semilla = hashTexto(temaId);
  const azar = crearAzar(semilla);
  const paleta = Math.floor(azar() * PALETAS.length);
  const bioma = BIOMAS[Math.floor(azar() * BIOMAS.length)];
  // Fisher-Yates con la semilla y se quedan las primeras 2 o 3.
  const mezcla: ModeloNave[] = [...MODELOS];
  for (let i = mezcla.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [mezcla[i], mezcla[j]] = [mezcla[j], mezcla[i]];
  }
  const cuantas = azar() < 0.5 ? 2 : 3;
  return { semilla, paleta, bioma, flota: mezcla.slice(0, cuantas) };
}
