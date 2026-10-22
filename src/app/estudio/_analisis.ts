// Análisis del tema para la visual: se baja el MP3 aparte y se decodifica sin reproducirlo.
// La reproducción NO pasa por Web Audio a propósito: en iOS un AudioContext se suspende con la
// pantalla bloqueada y el tema se callaría. Así el <audio> queda intacto y la visual lee
// `currentTime` contra estas curvas.

export const CUADROS_POR_SEG = 30;

export type Analisis = {
  /** Volumen general por cuadro, 0..1. */
  energia: Float32Array;
  /** Graves (bombo, 808) por cuadro, 0..1. */
  graves: Float32Array;
  /** Segundos donde pega el bombo, ordenados. */
  golpes: number[];
};

const CORTE_GRAVES_HZ = 150;
const SEPARACION_MIN_GOLPES_SEG = 0.18;
const MAX_EN_CACHE = 4;

const cache = new Map<string, Promise<Analisis | null>>();

function normalizar(valores: Float32Array) {
  // Se normaliza al percentil 95 para que un pico suelto no aplaste el resto.
  const ordenados = Float32Array.from(valores).sort();
  const techo = ordenados[Math.floor(ordenados.length * 0.95)] || 1;
  for (let i = 0; i < valores.length; i++) valores[i] = Math.min(1, valores[i] / techo);
}

function detectarGolpes(graves: Float32Array): number[] {
  const flujo = new Float32Array(graves.length);
  for (let i = 1; i < graves.length; i++) flujo[i] = Math.max(0, graves[i] - graves[i - 1]);

  const golpes: number[] = [];
  const ventana = 15;
  const separacion = Math.round(SEPARACION_MIN_GOLPES_SEG * CUADROS_POR_SEG);
  let ultimo = -Infinity;
  for (let i = 1; i < flujo.length - 1; i++) {
    let suma = 0;
    let n = 0;
    for (let j = Math.max(0, i - ventana); j <= Math.min(flujo.length - 1, i + ventana); j++) {
      suma += flujo[j];
      n++;
    }
    const umbral = (suma / n) * 1.6 + 0.04;
    const esPico = flujo[i] > umbral && flujo[i] >= flujo[i - 1] && flujo[i] >= flujo[i + 1];
    if (esPico && i - ultimo >= separacion) {
      golpes.push(i / CUADROS_POR_SEG);
      ultimo = i;
    }
  }
  return golpes;
}

async function analizar(url: string): Promise<Analisis | null> {
  try {
    const respuesta = await fetch(url);
    if (!respuesta.ok) return null;
    const datos = await respuesta.arrayBuffer();
    // Un OfflineAudioContext no suena ni toma el audio del sistema: solo decodifica.
    const contexto = new OfflineAudioContext(1, 1, 44100);
    const buffer = await contexto.decodeAudioData(datos);

    const tasa = buffer.sampleRate;
    const salto = Math.floor(tasa / CUADROS_POR_SEG);
    const cuadros = Math.floor(buffer.length / salto);
    const canales = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
    const alfa = 1 - Math.exp((-2 * Math.PI * CORTE_GRAVES_HZ) / tasa);

    const energia = new Float32Array(cuadros);
    const graves = new Float32Array(cuadros);
    let filtro = 0;
    for (let f = 0; f < cuadros; f++) {
      let sumaE = 0;
      let sumaG = 0;
      const inicio = f * salto;
      for (let i = inicio; i < inicio + salto; i++) {
        let mono = 0;
        for (const canal of canales) mono += canal[i];
        mono /= canales.length;
        filtro += alfa * (mono - filtro);
        sumaE += mono * mono;
        sumaG += filtro * filtro;
      }
      energia[f] = Math.sqrt(sumaE / salto);
      graves[f] = Math.sqrt(sumaG / salto);
    }
    normalizar(energia);
    normalizar(graves);

    return { energia, graves, golpes: detectarGolpes(graves) };
  } catch {
    // Sin análisis la visual igual anda, con un pulso inventado.
    return null;
  }
}

export function analizarTema(id: string): Promise<Analisis | null> {
  const enCache = cache.get(id);
  if (enCache) return enCache;
  if (cache.size >= MAX_EN_CACHE) {
    const masViejo = cache.keys().next().value;
    if (masViejo !== undefined) cache.delete(masViejo);
  }
  const promesa = analizar(`/api/estudio/temas/${id}/audio`);
  cache.set(id, promesa);
  return promesa;
}
