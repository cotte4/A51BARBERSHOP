// Reglas de la lista del Estudio, sin base ni navegador: buscar, filtrar, armar la cola de
// reproducción (con o sin aleatorio), reordenar el ranking y cuándo una escucha cuenta.

export type TemaDeLista = { id: string; titulo: string; genero: string | null };

/** Minúsculas y sin tildes: "canción" y "CANCION" son lo mismo. */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/** `genero` null = todos. La búsqueda mira el nombre del tema. */
export function filtrarTemas<T extends TemaDeLista>(temas: T[], busqueda: string, genero: string | null): T[] {
  const buscado = normalizar(busqueda);
  return temas.filter((tema) => (genero === null || tema.genero === genero) && (!buscado || normalizar(tema.titulo).includes(buscado)));
}

/** Mezcla Fisher-Yates; el azar se pasa de afuera para poder testearla. */
export function mezclar<T>(lista: readonly T[], azar: () => number = Math.random): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * En qué orden suenan los temas del contexto (la lista que se veía al dar play, con su filtro).
 * Sin aleatorio, el de la lista. Con aleatorio, el que suena queda primero y el resto se mezcla.
 */
export function armarCola(contexto: readonly string[], actualId: string | null, aleatorio: boolean, azar: () => number = Math.random): string[] {
  if (!aleatorio) return [...contexto];
  const resto = mezclar(
    contexto.filter((id) => id !== actualId),
    azar
  );
  return actualId && contexto.includes(actualId) ? [actualId, ...resto] : resto;
}

/**
 * El ranking nuevo: los ids en el orden pedido y, si falta alguno (se subió un tema mientras se
 * ordenaba), atrás y en su orden de antes. Los ids que ya no existen se ignoran.
 */
export function ordenarRanking(actuales: readonly string[], pedido: readonly string[]): string[] {
  const existen = new Set(actuales);
  const vistos = new Set<string>();
  const primero = pedido.filter((id) => existen.has(id) && !vistos.has(id) && vistos.add(id));
  return [...primero, ...actuales.filter((id) => !vistos.has(id))];
}

export const SEGUNDOS_PARA_ESCUCHA = 30;

/** Segundos sonando de verdad para contar una escucha: 30, o la mitad si el tema dura menos de un minuto. */
export function segundosParaEscucha(duracion: number): number {
  return duracion > 0 && duracion < SEGUNDOS_PARA_ESCUCHA * 2 ? duracion / 2 : SEGUNDOS_PARA_ESCUCHA;
}
