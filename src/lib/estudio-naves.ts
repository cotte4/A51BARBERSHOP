// La flota del Estudio: qué naves hay, qué hace cada una en el juego y con qué récord se destraba.
// Puro (sin three ni base): lo usan el server (récords, hangar) y el cliente (la nave, el hangar).

/** En el orden en que se destraban. */
export const MODELOS = ["platillo", "trompo", "anillo", "cigarro", "triangulo", "enjambre"] as const;

export type ModeloNave = (typeof MODELOS)[number];

/** Lo que trae cada nave en el juego, fijo (las ayudas que se agarran son otra cosa). */
export type Habilidad = "pareja" | "escudo" | "iman" | "finita" | "laser" | "drones";

export type FichaNave = {
  /** Como se lee en pantalla, con tildes. */
  nombre: string;
  habilidad: Habilidad;
  /** Una frase llana: qué hace en el juego. */
  descripcion: string;
  /** El mejor récord de la persona (en cualquier tema) que la destraba. */
  recordParaDesbloquear: number;
};

/** Escalones tentativos (plan de la flota): se ajustan jugando. */
export const FICHAS: Record<ModeloNave, FichaNave> = {
  platillo: {
    nombre: "Platillo",
    habilidad: "pareja",
    descripcion: "La de siempre: pareja, sin trucos.",
    recordParaDesbloquear: 0,
  },
  trompo: {
    nombre: "Trompo",
    habilidad: "escudo",
    descripcion: "Un escudo aguanta un choque y se recarga solo.",
    recordParaDesbloquear: 150,
  },
  anillo: {
    nombre: "Anillo",
    habilidad: "iman",
    descripcion: "Un imán acerca los cristales que pasan cerca.",
    recordParaDesbloquear: 300,
  },
  cigarro: {
    nombre: "Cigarro",
    habilidad: "finita",
    descripcion: "Es más finita: entra por huecos más angostos.",
    recordParaDesbloquear: 500,
  },
  triangulo: {
    nombre: "Triángulo",
    habilidad: "laser",
    descripcion: "Cada 4 bombos rompe a tiros el meteorito de adelante.",
    recordParaDesbloquear: 800,
  },
  enjambre: {
    nombre: "Enjambre",
    habilidad: "drones",
    descripcion: "Dos drones a los costados aguantan un golpe cada uno.",
    recordParaDesbloquear: 1200,
  },
};

/** Con la que arranca todo el mundo. */
export const NAVE_INICIAL: ModeloNave = "platillo";

export function esModeloNave(x: unknown): x is ModeloNave {
  return typeof x === "string" && (MODELOS as readonly string[]).includes(x);
}

/** Un récord que no es un número válido (null de la base, NaN) cuenta como 0: el platillo siempre está. */
function recordValido(record: number): number {
  return Number.isFinite(record) ? Math.max(0, record) : 0;
}

/** Las naves que destraba ese récord, en el orden de MODELOS. */
export function navesDesbloqueadas(mejorRecord: number): ModeloNave[] {
  const record = recordValido(mejorRecord);
  return MODELOS.filter((modelo) => FICHAS[modelo].recordParaDesbloquear <= record);
}

/** Las que se destrabaron al pasar de un récord a otro (para el cartel de "nueva nave"). */
export function nuevasDesbloqueadas(antes: number, despues: number): ModeloNave[] {
  const ya = new Set(navesDesbloqueadas(antes));
  return navesDesbloqueadas(despues).filter((modelo) => !ya.has(modelo));
}

/** La próxima nave por destrabar y cuántos puntos le faltan; null si ya están todas. */
export function siguienteDesbloqueo(mejorRecord: number): { modelo: ModeloNave; faltan: number } | null {
  const record = recordValido(mejorRecord);
  const modelo = MODELOS.find((m) => FICHAS[m].recordParaDesbloquear > record);
  return modelo ? { modelo, faltan: FICHAS[modelo].recordParaDesbloquear - record } : null;
}

/** "con el triángulo": para el récord ("340 · con el triángulo"). Todas son masculinas. */
export function conLaNave(modelo: ModeloNave): string {
  return `con el ${FICHAS[modelo].nombre.toLowerCase()}`;
}
