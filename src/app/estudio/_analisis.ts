// Análisis del tema para la nave: se baja el MP3 aparte y se decodifica sin reproducirlo.
// La reproducción NO pasa por Web Audio a propósito: en iOS un AudioContext se suspende con la
// pantalla bloqueada y el tema se callaría. Así el <audio> queda intacto y la nave lee
// `currentTime` contra estas curvas.

export const CUADROS_POR_SEG = 30;
/** Bandas del espectro, de los graves (izquierda) a los agudos (derecha), espaciadas en escala log. */
export const BANDAS = 32;

export type Analisis = {
  /** Volumen general por cuadro, 0..1. */
  energia: Float32Array;
  /** Bombo y 808 por cuadro, 0..1. */
  graves: Float32Array;
  /** Voces y melodía por cuadro, 0..1. */
  medios: Float32Array;
  /** Hi-hats, redoblante y brillo por cuadro, 0..1. */
  agudos: Float32Array;
  /** cuadros × BANDAS, cada banda normalizada a 0..1. */
  espectro: Float32Array;
  /** Segundos donde pega el bombo. */
  golpes: number[];
  /** Segundos de redoblante / hi-hats. */
  chasquidos: number[];
  /** Segundos donde el tema explota después de una parte tranquila. */
  drops: number[];
};

const TAMANO_FFT = 1024;
const FRECUENCIA_MIN = 45;
const FRECUENCIA_MAX = 16000;
const CUADROS_POR_TANDA = 240;
const MAX_EN_CACHE = 4;

const cache = new Map<string, Promise<Analisis | null>>();

// ——— FFT radix-2 en el lugar (re/im) ———

const reversos = (() => {
  const bits = Math.log2(TAMANO_FFT);
  const r = new Uint16Array(TAMANO_FFT);
  for (let i = 0; i < TAMANO_FFT; i++) {
    let x = i;
    let y = 0;
    for (let b = 0; b < bits; b++) {
      y = (y << 1) | (x & 1);
      x >>= 1;
    }
    r[i] = y;
  }
  return r;
})();
const cosenos = Float32Array.from({ length: TAMANO_FFT / 2 }, (_, i) => Math.cos((-2 * Math.PI * i) / TAMANO_FFT));
const senos = Float32Array.from({ length: TAMANO_FFT / 2 }, (_, i) => Math.sin((-2 * Math.PI * i) / TAMANO_FFT));
const hann = Float32Array.from({ length: TAMANO_FFT }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (TAMANO_FFT - 1)));

function fft(re: Float32Array, im: Float32Array) {
  for (let i = 0; i < TAMANO_FFT; i++) {
    const j = reversos[i];
    if (j > i) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let tamano = 2; tamano <= TAMANO_FFT; tamano <<= 1) {
    const mitad = tamano >> 1;
    const paso = TAMANO_FFT / tamano;
    for (let inicio = 0; inicio < TAMANO_FFT; inicio += tamano) {
      for (let k = 0; k < mitad; k++) {
        const c = cosenos[k * paso];
        const s = senos[k * paso];
        const a = inicio + k;
        const b = a + mitad;
        const tr = re[b] * c - im[b] * s;
        const ti = re[b] * s + im[b] * c;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

/** Para cada banda, el rango de bins de la FFT [desde, hasta). */
function rangosDeBandas(tasa: number): [number, number][] {
  const anchoBin = tasa / TAMANO_FFT;
  const rangos: [number, number][] = [];
  for (let b = 0; b < BANDAS; b++) {
    const f0 = FRECUENCIA_MIN * Math.pow(FRECUENCIA_MAX / FRECUENCIA_MIN, b / BANDAS);
    const f1 = FRECUENCIA_MIN * Math.pow(FRECUENCIA_MAX / FRECUENCIA_MIN, (b + 1) / BANDAS);
    const desde = Math.max(1, Math.floor(f0 / anchoBin));
    const hasta = Math.max(desde + 1, Math.min(TAMANO_FFT / 2, Math.ceil(f1 / anchoBin)));
    rangos.push([desde, hasta]);
  }
  return rangos;
}

function centroDeBanda(b: number) {
  return FRECUENCIA_MIN * Math.pow(FRECUENCIA_MAX / FRECUENCIA_MIN, (b + 0.5) / BANDAS);
}

/** Techo = percentil 95: un pico suelto no aplasta el resto. */
function percentil95(valores: Float32Array): number {
  const ordenados = Float32Array.from(valores).sort();
  return ordenados[Math.floor(ordenados.length * 0.95)] || 1;
}

function normalizar(valores: Float32Array) {
  const techo = percentil95(valores);
  for (let i = 0; i < valores.length; i++) valores[i] = Math.min(1, valores[i] / techo);
}

function promedioDeBandas(espectro: Float32Array, cuadros: number, hzMin: number, hzMax: number): Float32Array {
  const elegidas = Array.from({ length: BANDAS }, (_, b) => b).filter((b) => {
    const centro = centroDeBanda(b);
    return centro >= hzMin && centro < hzMax;
  });
  const salida = new Float32Array(cuadros);
  for (let f = 0; f < cuadros; f++) {
    let suma = 0;
    for (const b of elegidas) suma += espectro[f * BANDAS + b];
    salida[f] = suma / Math.max(1, elegidas.length);
  }
  normalizar(salida);
  return salida;
}

/** Picos del aumento de una curva: cada golpe es un salto por encima del promedio local. */
function detectarPicos(serie: Float32Array, sensibilidad: number, separacionSeg: number): number[] {
  const flujo = new Float32Array(serie.length);
  for (let i = 1; i < serie.length; i++) flujo[i] = Math.max(0, serie[i] - serie[i - 1]);

  const picos: number[] = [];
  const ventana = 15;
  const separacion = Math.round(separacionSeg * CUADROS_POR_SEG);
  let ultimo = -Infinity;
  let suma = 0;
  // Promedio móvil de ±ventana cuadros, en una sola pasada.
  for (let j = 0; j <= Math.min(ventana, flujo.length - 1); j++) suma += flujo[j];
  for (let i = 0; i < flujo.length; i++) {
    const n = Math.min(flujo.length - 1, i + ventana) - Math.max(0, i - ventana) + 1;
    const umbral = (suma / n) * sensibilidad + 0.04;
    const esPico = i > 0 && i < flujo.length - 1 && flujo[i] > umbral && flujo[i] >= flujo[i - 1] && flujo[i] >= flujo[i + 1];
    if (esPico && i - ultimo >= separacion) {
      picos.push(i / CUADROS_POR_SEG);
      ultimo = i;
    }
    const entra = i + ventana + 1;
    const sale = i - ventana;
    if (entra < flujo.length) suma += flujo[entra];
    if (sale >= 0) suma -= flujo[sale];
  }
  return picos;
}

/** Drop: el último segundo suena fuerte y los 4 anteriores venían tranquilos. */
function detectarDrops(energia: Float32Array): number[] {
  const promedio = (desde: number, hasta: number) => {
    let s = 0;
    const a = Math.max(0, desde);
    const b = Math.min(energia.length, hasta);
    for (let i = a; i < b; i++) s += energia[i];
    return b > a ? s / (b - a) : 0;
  };
  const drops: number[] = [];
  const unSeg = CUADROS_POR_SEG;
  let ultimo = -Infinity;
  for (let i = 4 * unSeg; i < energia.length - unSeg; i += 3) {
    const ahora = promedio(i, i + unSeg);
    const antes = promedio(i - 4 * unSeg, i);
    if (ahora > 0.62 && antes < 0.42 && ahora - antes > 0.25 && i - ultimo > 8 * unSeg) {
      drops.push(i / unSeg);
      ultimo = i;
    }
  }
  return drops;
}

const respirar = () => new Promise((resolve) => setTimeout(resolve, 0));

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
    const cuadros = Math.floor((buffer.length - TAMANO_FFT) / salto);
    if (cuadros <= 0) return null;
    const canales = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
    const rangos = rangosDeBandas(tasa);

    const energia = new Float32Array(cuadros);
    const espectro = new Float32Array(cuadros * BANDAS);
    const re = new Float32Array(TAMANO_FFT);
    const im = new Float32Array(TAMANO_FFT);

    for (let f = 0; f < cuadros; f++) {
      // Por tandas: la página sigue respondiendo mientras se analiza.
      if (f % CUADROS_POR_TANDA === 0 && f > 0) await respirar();
      const inicio = f * salto;

      let sumaE = 0;
      for (let i = inicio; i < inicio + salto; i++) {
        let mono = 0;
        for (const canal of canales) mono += canal[i];
        mono /= canales.length;
        sumaE += mono * mono;
      }
      energia[f] = Math.sqrt(sumaE / salto);

      for (let i = 0; i < TAMANO_FFT; i++) {
        let mono = 0;
        for (const canal of canales) mono += canal[inicio + i];
        re[i] = (mono / canales.length) * hann[i];
        im[i] = 0;
      }
      fft(re, im);
      for (let b = 0; b < BANDAS; b++) {
        const [desde, hasta] = rangos[b];
        let suma = 0;
        for (let k = desde; k < hasta; k++) suma += Math.sqrt(re[k] * re[k] + im[k] * im[k]);
        espectro[f * BANDAS + b] = suma / (hasta - desde);
      }
    }

    // Cada banda contra su propio techo: así los agudos (que tienen menos energía) también se ven.
    const banda = new Float32Array(cuadros);
    for (let b = 0; b < BANDAS; b++) {
      for (let f = 0; f < cuadros; f++) banda[f] = espectro[f * BANDAS + b];
      const techo = percentil95(banda);
      for (let f = 0; f < cuadros; f++) espectro[f * BANDAS + b] = Math.min(1, Math.sqrt(espectro[f * BANDAS + b] / techo));
    }
    normalizar(energia);

    const graves = promedioDeBandas(espectro, cuadros, 0, 160);
    const medios = promedioDeBandas(espectro, cuadros, 300, 2500);
    const agudos = promedioDeBandas(espectro, cuadros, 4000, 13000);

    return {
      energia,
      graves,
      medios,
      agudos,
      espectro,
      golpes: detectarPicos(graves, 2.1, 0.24),
      chasquidos: detectarPicos(agudos, 2.2, 0.14),
      drops: detectarDrops(energia),
    };
  } catch {
    // Sin análisis la nave igual anda, con un pulso inventado.
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

/** Índice del primer evento posterior a t (para retomar después de adelantar). */
export function primerEventoDesde(eventos: number[], t: number): number {
  let bajo = 0;
  let alto = eventos.length;
  while (bajo < alto) {
    const medio = (bajo + alto) >> 1;
    if (eventos[medio] <= t) bajo = medio + 1;
    else alto = medio;
  }
  return bajo;
}
