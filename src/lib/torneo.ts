// Lógica pura del torneo de eliminación directa (sin DB, sin fechas, sin red).
// La DB guarda lo que esto devuelve; la UI solo lo muestra.

export type EstadoPartido = "pendiente" | "listo" | "jugado";

export type PartidoCuadro = {
  ronda: number;
  posicion: number;
  jugadorAId: string | null;
  jugadorBId: string | null;
  ganadorId: string | null;
  marcadorA: number | null;
  marcadorB: number | null;
  esBye: boolean;
  estado: EstadoPartido;
};

export type AsignacionSorteo = {
  jugadorId: string;
  equipoId: string;
  /** 1..n, orden en que salió en el sorteo. */
  posicionSorteo: number;
};

export type ResultadoSorteo = {
  partidos: PartidoCuadro[];
  asignaciones: AsignacionSorteo[];
  /** Cantidad de rondas del cuadro (16 jugadores = 4, la final es la ronda 4). */
  rondas: number;
};

export type Marcador = { a: number; b: number };

// ————————————————————————————
// Azar reproducible: misma semilla => mismo sorteo
// ————————————————————————————
function crearAzar(semilla: string): () => number {
  // xmur3: string -> semilla numérica de 32 bits
  let h = 1779033703 ^ semilla.length;
  for (let i = 0; i < semilla.length; i++) {
    h = Math.imul(h ^ semilla.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let estado = (() => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  })();

  // mulberry32
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mezclar<T>(items: readonly T[], azar: () => number): T[] {
  const copia = [...items];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Menor potencia de 2 que alcanza para n jugadores (mínimo 2). */
export function tamanoCuadro(n: number): number {
  let tamano = 2;
  while (tamano < n) tamano *= 2;
  return tamano;
}

function vacio(ronda: number, posicion: number): PartidoCuadro {
  return {
    ronda,
    posicion,
    jugadorAId: null,
    jugadorBId: null,
    ganadorId: null,
    marcadorA: null,
    marcadorB: null,
    esBye: false,
    estado: "pendiente",
  };
}

function buscar(partidos: PartidoCuadro[], ronda: number, posicion: number): PartidoCuadro | undefined {
  return partidos.find((p) => p.ronda === ronda && p.posicion === posicion);
}

function actualizarEstado(partido: PartidoCuadro): void {
  if (partido.ganadorId) {
    partido.estado = "jugado";
  } else if (partido.jugadorAId && partido.jugadorBId) {
    partido.estado = "listo";
  } else {
    partido.estado = "pendiente";
  }
}

/** Pone al ganador en el partido de la ronda siguiente. Devuelve false si era la final. */
function colocarEnSiguiente(
  partidos: PartidoCuadro[],
  desde: PartidoCuadro,
  jugadorId: string | null,
): boolean {
  const siguiente = buscar(partidos, desde.ronda + 1, Math.ceil(desde.posicion / 2));
  if (!siguiente) return false;
  if (desde.posicion % 2 === 1) siguiente.jugadorAId = jugadorId;
  else siguiente.jugadorBId = jugadorId;
  actualizarEstado(siguiente);
  return true;
}

// ————————————————————————————
// Sorteo
// ————————————————————————————
export type EntradaSorteo = {
  jugadorIds: readonly string[];
  equipoIds: readonly string[];
  semilla: string;
};

/**
 * Sortea equipos (uno único por jugador) y arma el cuadro completo.
 * Con menos jugadores que el tamaño del cuadro, los "byes" (pase directo) caen en
 * cruces distintos, elegidos al azar; el jugador con bye ya avanza a la ronda 2.
 */
export function sortearTorneo({ jugadorIds, equipoIds, semilla }: EntradaSorteo): ResultadoSorteo {
  const n = jugadorIds.length;
  if (n < 2) throw new Error("Hacen falta al menos 2 jugadores para sortear.");
  if (new Set(jugadorIds).size !== n) throw new Error("Hay jugadores repetidos.");
  if (new Set(equipoIds).size !== equipoIds.length) throw new Error("Hay equipos repetidos.");
  if (equipoIds.length < n) {
    throw new Error(`Hay ${n} jugadores pero solo ${equipoIds.length} equipos.`);
  }

  const azar = crearAzar(semilla);
  const jugadores = mezclar(jugadorIds, azar);
  const equipos = mezclar(equipoIds, azar).slice(0, n);

  const asignaciones: AsignacionSorteo[] = jugadores.map((jugadorId, i) => ({
    jugadorId,
    equipoId: equipos[i],
    posicionSorteo: i + 1,
  }));

  const tamano = tamanoCuadro(n);
  const cruces = tamano / 2;
  const rondas = Math.log2(tamano);
  const byes = tamano - n; // siempre < cruces, porque n > tamano / 2

  const posicionesConBye = new Set(
    mezclar(
      Array.from({ length: cruces }, (_, i) => i + 1),
      azar,
    ).slice(0, byes),
  );

  const partidos: PartidoCuadro[] = [];
  for (let ronda = 1; ronda <= rondas; ronda++) {
    const cantidad = tamano / 2 ** ronda;
    for (let posicion = 1; posicion <= cantidad; posicion++) {
      partidos.push(vacio(ronda, posicion));
    }
  }

  let siguiente = 0;
  for (let posicion = 1; posicion <= cruces; posicion++) {
    const partido = buscar(partidos, 1, posicion)!;
    partido.jugadorAId = jugadores[siguiente++];
    if (posicionesConBye.has(posicion)) {
      partido.esBye = true;
      partido.ganadorId = partido.jugadorAId;
    } else {
      partido.jugadorBId = jugadores[siguiente++];
    }
    actualizarEstado(partido);
  }

  for (const partido of partidos) {
    if (partido.ronda === 1 && partido.esBye) colocarEnSiguiente(partidos, partido, partido.ganadorId);
  }

  return { partidos, asignaciones, rondas };
}

// ————————————————————————————
// Resultados
// ————————————————————————————
/**
 * Registra (o corrige) el ganador de un partido y lo propaga a la ronda siguiente.
 * Devuelve una copia nueva; no modifica el cuadro recibido.
 * Corregir es posible solo mientras el partido siguiente no se haya jugado.
 */
export function avanzarGanador(
  cuadro: readonly PartidoCuadro[],
  ronda: number,
  posicion: number,
  ganadorId: string,
  marcador?: Marcador,
): PartidoCuadro[] {
  const partidos = cuadro.map((p) => ({ ...p }));
  const partido = buscar(partidos, ronda, posicion);
  if (!partido) throw new Error("Ese partido no existe.");
  if (partido.esBye) throw new Error("Ese cruce es un pase directo, no se juega.");
  if (!partido.jugadorAId || !partido.jugadorBId) {
    throw new Error("Todavía no están definidos los dos jugadores de este partido.");
  }
  if (ganadorId !== partido.jugadorAId && ganadorId !== partido.jugadorBId) {
    throw new Error("El ganador tiene que ser uno de los dos jugadores del partido.");
  }
  // El marcador puede quedar empatado (se definió por penales): no se valida contra el ganador.

  const siguiente = buscar(partidos, ronda + 1, Math.ceil(posicion / 2));
  if (siguiente && siguiente.estado === "jugado") {
    throw new Error("No se puede corregir: el partido siguiente ya se jugó.");
  }

  partido.ganadorId = ganadorId;
  partido.marcadorA = marcador ? marcador.a : null;
  partido.marcadorB = marcador ? marcador.b : null;
  actualizarEstado(partido);
  colocarEnSiguiente(partidos, partido, ganadorId);
  return partidos;
}

export type Podio = {
  campeonId: string | null;
  subcampeonId: string | null;
  /** Los perdedores de las semifinales (3.º y 4.º, sin partido por el tercer puesto). */
  tercerosIds: string[];
};

export function calcularPodio(cuadro: readonly PartidoCuadro[]): Podio {
  const rondas = Math.max(...cuadro.map((p) => p.ronda));
  const final = cuadro.find((p) => p.ronda === rondas);
  const campeonId = final?.ganadorId ?? null;
  const subcampeonId =
    final && final.ganadorId
      ? final.jugadorAId === final.ganadorId
        ? final.jugadorBId
        : final.jugadorAId
      : null;

  const tercerosIds: string[] = [];
  if (campeonId && rondas >= 2) {
    for (const p of cuadro) {
      if (p.ronda !== rondas - 1 || p.esBye || !p.ganadorId) continue;
      const perdedor = p.jugadorAId === p.ganadorId ? p.jugadorBId : p.jugadorAId;
      if (perdedor) tercerosIds.push(perdedor);
    }
  }
  return { campeonId, subcampeonId, tercerosIds };
}

export function torneoTerminado(cuadro: readonly PartidoCuadro[]): boolean {
  return calcularPodio(cuadro).campeonId !== null;
}

// ————————————————————————————
// Cupo (el cupo lo ocupa quien Pinky marcó como pagado)
// ————————————————————————————
export type JugadorCupo = {
  estadoPago: "pendiente" | "pagado" | "baja";
  ordenPago: number | null;
};

export type ResumenCupo = {
  pagados: number;
  cupo: number;
  lugaresLibres: number;
  lleno: boolean;
  /** Anotados sin pagar cuando el cupo ya está lleno: la lista de espera. */
  enEspera: number;
};

export function resumenCupo(jugadores: readonly JugadorCupo[], cupo: number): ResumenCupo {
  const pagados = jugadores.filter((j) => j.estadoPago === "pagado").length;
  const lleno = pagados >= cupo;
  const enEspera = lleno ? jugadores.filter((j) => j.estadoPago === "pendiente").length : 0;
  return { pagados, cupo, lugaresLibres: Math.max(0, cupo - pagados), lleno, enEspera };
}

/** Número de orden para el próximo "Pagó". null si el cupo ya está lleno. */
export function siguienteOrdenPago(jugadores: readonly JugadorCupo[], cupo: number): number | null {
  const { lleno } = resumenCupo(jugadores, cupo);
  if (lleno) return null;
  const maximo = jugadores.reduce((m, j) => (j.ordenPago !== null && j.ordenPago > m ? j.ordenPago : m), 0);
  return maximo + 1;
}

/** "Juan Pérez" -> "Juan P." para no mostrar nombres completos en una pantalla pública. */
export function nombreCorto(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length < 2) return partes[0] ?? "";
  return `${partes[0]} ${partes[1].charAt(0).toUpperCase()}.`;
}

/** "Juan Pérez" con más letras del apellido: 1 = "Juan P.", 2 = "Juan Pé.". */
function conLetras(nombre: string, letras: number): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length < 2) return partes[0] ?? "";
  const apellido = partes[1];
  const visible = apellido.slice(0, letras);
  return `${partes[0]} ${visible.charAt(0).toUpperCase()}${visible.slice(1)}${apellido.length > letras ? "." : ""}`;
}

/** Nombres cortos para toda la lista; si dos coinciden, suma letras del apellido y, al final, un número. */
export function nombresCortosUnicos(nombres: readonly string[]): string[] {
  const resultado = nombres.map((n) => conLetras(n, 1));
  for (let letras = 2; letras <= 6; letras++) {
    const cuenta = new Map<string, number>();
    for (const r of resultado) cuenta.set(r, (cuenta.get(r) ?? 0) + 1);
    nombres.forEach((n, i) => {
      if ((cuenta.get(resultado[i]) ?? 0) > 1) resultado[i] = conLetras(n, letras);
    });
  }
  const cuenta = new Map<string, number>();
  for (const r of resultado) cuenta.set(r, (cuenta.get(r) ?? 0) + 1);
  const vistos = new Map<string, number>();
  return resultado.map((r) => {
    if ((cuenta.get(r) ?? 0) < 2) return r;
    const k = (vistos.get(r) ?? 0) + 1;
    vistos.set(r, k);
    return `${r} (${k})`;
  });
}
