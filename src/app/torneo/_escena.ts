/**
 * Piezas compartidas de la escena de abducción. La geometría está en unidades del ANCHO de la
 * escena (1 = 1cqw), así el CSS y el shader dibujan exactamente lo mismo a cualquier tamaño.
 */
export const GEO = {
  /** Borde de abajo de la nave, donde nace el rayo (cqw desde arriba). */
  yEmisor: 16.5,
  /** Distancia del piso de luz al borde inferior de la escena (cqw). */
  margenPiso: 10,
  /** Medio ancho del rayo en la nave y en el piso, como fracción del ancho de la escena. */
  anchoEmisor: 0.05,
  anchoPiso: 0.36,
} as const;

/** Lo que la línea de tiempo de GSAP anima y los lienzos leen en cada cuadro. */
export type Energia = {
  /** Intensidad del rayo (0 apagado, 1 normal, >1 pico). */
  haz: number;
  /** Cuánto bajó el rayo desde la nave (0 nada, 1 llegó al piso). */
  alcance: number;
};

/**
 * Curva cubic-bezier como función de easing para GSAP, sin plugins. Resuelve x→t con
 * Newton-Raphson y cae a bisección si la pendiente es plana.
 */
export function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const curvaX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const curvaY = (t: number) => ((ay * t + by) * t + cy) * t;
  const pendienteX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 6; i++) {
      const error = curvaX(t) - x;
      if (Math.abs(error) < 1e-5) return curvaY(t);
      const d = pendienteX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= error / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 20; i++) {
      const valor = curvaX(t);
      if (Math.abs(valor - x) < 1e-5) break;
      if (valor < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return curvaY(t);
  };
}

/** Pseudoaleatorio determinístico (mismo valor en servidor y cliente). */
export function azar(i: number, semilla = 1): number {
  const x = Math.sin(i * 12.9898 + semilla * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
