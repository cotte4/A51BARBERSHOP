// Qué hacer con la cola de la jukebox mirando lo que suena en Spotify. Sin DB ni red: lo testea
// jukebox-decidir.test.ts. Lo usa el "latido" de jukebox-spotify.ts, que después lo aplica.
//
// La idea: la cola vive en nuestra base (ahí se puede quitar y reordenar) y a Spotify se le pasa de a un
// tema, justo antes de que toque. Spotify no deja borrar de su propia cola, así que lo que ya se mandó
// queda fijo: por eso se manda lo más tarde posible.

export type ItemVivo = {
  id: string;
  estado: "queued" | "playing";
  /** Sin uri no se puede mandar a Spotify (un tema que entró en modo YouTube y no se encontró). */
  uri: string | null;
  posicion: number;
  enviadoEn: Date | null;
  empezoEn: Date | null;
  duracionSegundos: number | null;
  creadoEn: Date;
};

/** Lo que tiene cargado Spotify. null = nada (sin dispositivo activo o sin nada puesto). */
export type Reproduccion = {
  uri: string | null;
  sonando: boolean;
  progresoMs: number;
  duracionMs: number;
} | null;

export type Envio = { id: string; uri: string; modo: "cola" | "arrancar" };

export type Decision = {
  /** El que se mandó y ya está sonando: pasa a "playing". */
  empieza: string | null;
  /** Terminaron (o los cortaron desde Spotify): pasan a "played". */
  terminan: string[];
  /** Esperaron de más (una cola de ayer): pasan a "skipped". */
  descartan: string[];
  /** El próximo que hay que pasarle a Spotify. "arrancar" = no hay nada puesto: se le da play directo. */
  enviar: Envio | null;
  /** Se dan por terminados solo si el "arrancar" salió bien (si falla, siguen como estaban). */
  terminanSiArranca: string[];
};

/** Con nuestro tema sonando, el siguiente se manda cuando a éste le falta esto. Antes, se puede quitar. */
export const VENTANA_ENVIO_MS = 45_000;
/** Una cola que esperó más que esto es de otro día: no se pasa. */
export const VIDA_MAXIMA_MS = 12 * 60 * 60 * 1000;
/** Margen sobre la duración: si nadie miró mientras sonaba, después de esto se da por terminado. */
const MARGEN_TERMINADO_MS = 3 * 60 * 1000;
/** Un tema mandado que no se vio sonar en este tiempo se da por pasado (sonó sin que nadie mirara). */
const ENVIADO_SIN_VER_MS = 12 * 60 * 1000;
/** A esta distancia del final, un tema en pausa se considera terminado (Spotify se frena al acabar uno suelto). */
const FIN_MS = 3_000;

/**
 * ¿Spotify se quedó parado porque el tema terminó (y no porque alguien puso pausa)? Pasa con un tema
 * arrancado suelto: al acabar, Spotify queda en pausa con el mismo tema, al final o vuelto a cero.
 * `esNuestroYaPasado`: el tema cargado es uno de la cola que ya debería haber terminado.
 */
export function seQuedoAlFinal(reproduccion: Reproduccion, esNuestroYaPasado = false): boolean {
  if (!reproduccion || reproduccion.sonando || !reproduccion.uri) return false;
  const alFinal = reproduccion.duracionMs > 0 && reproduccion.duracionMs - reproduccion.progresoMs <= FIN_MS;
  return alFinal || (esNuestroYaPasado && reproduccion.progresoMs === 0);
}

export function decidirJukebox({
  items,
  reproduccion,
  hayDispositivo,
  ahora,
  anteriorVacia = false,
}: {
  items: ItemVivo[];
  reproduccion: Reproduccion;
  hayDispositivo: boolean;
  ahora: Date;
  /** El latido anterior también vio a Spotify sin nada: dos lecturas vacías seguidas no son un parpadeo. */
  anteriorVacia?: boolean;
}): Decision {
  const t = ahora.getTime();
  const terminan = new Set<string>();
  const descartan = new Set<string>();
  let empieza: string | null = null;

  const actual = reproduccion?.uri ?? null;
  const sonando = items.find((i) => i.estado === "playing") ?? null;
  const enviados = items
    .filter((i) => i.estado === "queued" && i.enviadoEn)
    .sort((a, b) => a.enviadoEn!.getTime() - b.enviadoEn!.getTime());

  for (const i of items) {
    if (i.estado === "queued" && !i.enviadoEn && t - i.creadoEn.getTime() > VIDA_MAXIMA_MS) descartan.add(i.id);
  }

  // 1. ¿Arrancó alguno de los que mandamos?
  const arranco = enviados.find((e) => e.uri !== null && e.uri === actual);
  if (arranco) {
    empieza = arranco.id;
    // Los mandados antes que él ya pasaron (Spotify los toca en orden).
    for (const e of enviados) {
      if (e === arranco) break;
      terminan.add(e.id);
    }
    if (sonando) terminan.add(sonando.id);
  } else if (sonando) {
    // 2. ¿Terminó el nuestro? Si Spotify ya está en otro tema (no vacío: eso puede ser un parpadeo), sí.
    // Si se quedó parado al final, también. Si no se sabe nada, por tiempo.
    const otroTema = actual !== null && actual !== sonando.uri;
    const yaPaso = pasado(sonando.empezoEn ?? sonando.creadoEn, sonando.duracionSegundos, t);
    const quieto = actual === sonando.uri && seQuedoAlFinal(reproduccion, yaPaso);
    if (otroTema || quieto || yaPaso) terminan.add(sonando.id);
  }

  for (const e of enviados) {
    if (e.id !== empieza && !terminan.has(e.id) && t - e.enviadoEn!.getTime() > ENVIADO_SIN_VER_MS) {
      terminan.add(e.id);
    }
  }

  const nuestroSuena = empieza ?? (sonando && !terminan.has(sonando.id) ? sonando.id : null);
  const pendiente = enviados.some((e) => e.id !== empieza && !terminan.has(e.id));

  // 3. ¿Hay que pasarle el próximo?
  let enviar: Envio | null = null;
  const terminanSiArranca: string[] = [];
  // Parado al final de un tema (nuestro o de la lista): da lo mismo que si no hubiera nada puesto.
  const cargadoYaTermino = sonando !== null && actual === sonando.uri && terminan.has(sonando.id);
  const nadaPuesto = !actual || seQuedoAlFinal(reproduccion, cargadoYaTermino);
  const proximo = pendiente
    ? null
    : items
        .filter((i) => i.estado === "queued" && !i.enviadoEn && i.uri && !descartan.has(i.id))
        .sort((a, b) => a.posicion - b.posicion)[0];

  if (proximo?.uri) {
    if (nadaPuesto) {
      // Nada puesto: se arranca directo en el dispositivo que haya. Si figuraba uno nuestro sonando, se
      // espera a una segunda lectura vacía (una sola puede ser un parpadeo de Spotify y cortaría el tema).
      const nuestroVivo = nuestroSuena !== null && !terminan.has(nuestroSuena);
      if (hayDispositivo && (!nuestroVivo || anteriorVacia)) {
        enviar = { id: proximo.id, uri: proximo.uri, modo: "arrancar" };
        if (nuestroVivo) terminanSiArranca.push(nuestroSuena);
      }
    } else if (reproduccion?.sonando) {
      // Con la lista del local sonando, lo del público va enseguida (después del tema actual).
      // Con uno nuestro sonando, se espera al final para que se pueda seguir quitando.
      const restante = reproduccion.duracionMs - reproduccion.progresoMs;
      if (!nuestroSuena || restante <= VENTANA_ENVIO_MS) {
        enviar = { id: proximo.id, uri: proximo.uri, modo: "cola" };
      }
    }
    // En pausa no se toca nada: la pausa la puso alguien a propósito.
  }

  return { empieza, terminan: [...terminan], descartan: [...descartan], enviar, terminanSiArranca };
}

function pasado(desde: Date, duracionSegundos: number | null, ahora: number): boolean {
  const duracionMs = (duracionSegundos ?? 6 * 60) * 1000;
  return ahora - desde.getTime() > duracionMs + MARGEN_TERMINADO_MS;
}
