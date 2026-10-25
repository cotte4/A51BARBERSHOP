import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MODELOS, type ModeloNave } from "@/lib/estudio-naves";
import { anguloHacia, crearCabezaAlien, crearMaterialRayo, elegir, PANZA_Y, type Kit } from "./_naveKit";

// La flota: seis naves de la misma familia (caricatura neón: casco cromado, panza oscura con el
// motor, aro de neón, cúpula de vidrio con el piloto y 14 luces). Cada modelo tiene su silueta, su
// color y su forma de volar (vaivenDe). Las geometrías de un modelo se arman la primera vez que hace
// falta y quedan en el kit: todas las naves de ese modelo comparten las mismas.
//
// _naveKit importa crearNave de acá y acá se importa del kit: nada de este archivo puede usar lo del
// kit al cargarse (en constantes de arriba), solo adentro de funciones.

export const LUCES_NAVE = 14;
/** El enjambre: 6 drones, y las últimas 6 luces son las de los drones. */
const DRONES = 6;
const LUCES_MADRE = LUCES_NAVE - DRONES;

/**
 * Color del aro y de las luces de cada modelo. El platillo, sin color pedido, usa kit.aroRosa (sigue
 * al color B de la paleta, como siempre) y kit.luz.
 */
export const COLOR_NAVE: Record<ModeloNave, number> = {
  platillo: 0xff4fd8,
  trompo: 0xff9a3c,
  anillo: 0xa05bff,
  cigarro: 0x7dff6a,
  triangulo: 0x2de2ff,
  enjambre: 0xffd23f,
};

/**
 * Medidas en unidades de la nave (sin su escala). `radio`: hasta dónde llega el casco desde el centro
 * hacia los costados (el platillo, 1,62). En el cigarro es medio largo (de alto mide 0,47 para cada
 * lado); el anillo está parado, así que mide 1,62 también para arriba y para abajo. `alcance`: hasta
 * dónde llega algo de la nave (drones, aros). `bajo`: la y de donde sale el rayo.
 */
export type MedidasNave = { radio: number; alcance: number; bajo: number };

export const MEDIDAS_NAVE: Record<ModeloNave, MedidasNave> = {
  platillo: { radio: 1.62, alcance: 1.66, bajo: -0.34 },
  trompo: { radio: 1.26, alcance: 1.32, bajo: -1.24 },
  anillo: { radio: 1.62, alcance: 1.64, bajo: -1.72 },
  cigarro: { radio: 1.85, alcance: 1.85, bajo: -0.47 },
  triangulo: { radio: 1.64, alcance: 1.69, bajo: -0.2 },
  enjambre: { radio: 0.8, alcance: 2.15, bajo: -0.62 },
};

export type OpcionesNave = {
  /** Otro color para el aro y las luces (el jefe del juego, en rojo). */
  color?: number;
  /** false = cúpula vacía. */
  piloto?: boolean;
};

export type Nave = {
  modelo: ModeloNave;
  grupo: THREE.Group;
  rayo: THREE.Mesh;
  matRayo: THREE.ShaderMaterial;
  radio: number;
  alcance: number;
  bajo: number;
  /** Suelta lo propio de esta nave (luces, drones, el material del rayo); lo del kit queda. */
  liberar: () => void;
  /** Dónde están las luces en el mundo (de ahí salen los láseres de la nodriza). */
  posicionesLuces: () => THREE.Vector3[];
  /**
   * Con `espectro` (0..1 por banda) cada luz sigue una banda, como un ecualizador; sin él, la ronda
   * de siempre. También el piloto que mira, los drones y las franjas del rayo.
   */
  animar: (t: number, espectro?: Float32Array) => void;
};

/** Aro y luces de un color: se crean una vez por color y los comparten todas las naves (kit.tintes). */
export type TinteNave = { aro: THREE.MeshStandardMaterial; luz: THREE.MeshBasicMaterial };

type Pieza = "casco" | "panza" | "aro" | "motor";
type Parte = { geo: THREE.BufferGeometry; pieza: Pieza; /** Gira con las luces (los rayos del anillo). */ gira?: boolean };
type LugarLuz = { lugar: THREE.Vector3; tam: number; /** 0 = graves, 1 = agudos. */ banda: number };

/** Lo que comparten todas las naves de un modelo. Vive en kit.moldes. */
export type MoldeNave = {
  partes: Parte[];
  cupula: { geo: THREE.BufferGeometry; piloto: THREE.Vector3; escalaPiloto: number } | null;
  luces: LugarLuz[];
  /** Radianes por segundo que dan la vuelta las luces (y las partes que giran). */
  vueltas: number;
  /** Alrededor de qué eje dan la vuelta: y (acostadas) o z (el anillo, parado de frente). */
  eje: "y" | "z";
  /** Cuánto suben las luces con su banda (el cigarro no: son ojos de buey). */
  subida: number;
  /** Solo el enjambre: el dron que se repite. */
  dron: { casco: THREE.BufferGeometry; aro: THREE.BufferGeometry } | null;
  /** Geometrías de este molde (las del platillo son del kit y no van acá). */
  propias: THREE.BufferGeometry[];
};

// ————————————————————————————— Piezas —————————————————————————————

type Perfil = readonly (readonly [number, number])[];

/** Torno como el del platillo: el perfil (radio, y) se recorre de abajo hacia arriba por afuera. */
function torno(perfil: Perfil, segmentos = 64): THREE.BufferGeometry {
  return new THREE.LatheGeometry(
    perfil.map(([r, y]) => new THREE.Vector2(r, y)),
    segmentos
  );
}

/** Aro acostado (alrededor del eje y) a la altura y. */
function aro(radio: number, tubo: number, y: number, segmentos = 96): THREE.BufferGeometry {
  return new THREE.TorusGeometry(radio, tubo, 10, segmentos).rotateX(Math.PI / 2).translate(0, y, 0);
}

/** Disco que mira para abajo (el núcleo del motor). */
function disco(radio: number, y: number): THREE.BufferGeometry {
  return new THREE.CircleGeometry(radio, 32).rotateX(Math.PI / 2).translate(0, y, 0);
}

function cupulaDe(radio: number, y: number): THREE.BufferGeometry {
  return new THREE.SphereGeometry(radio, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, y, 0);
}

/** El piloto entra justo en una cúpula de ese radio (como en el platillo: 0,24 en una de 0,6). */
function pilotoEn(radio: number, x: number, base: number) {
  return { piloto: new THREE.Vector3(x, base + radio * 0.383, 0), escalaPiloto: radio * 0.4 };
}

/** Une piezas del mismo material en una sola malla: una llamada de dibujo en vez de varias. */
function unir(partes: THREE.BufferGeometry[]): THREE.BufferGeometry {
  partes.forEach((p) => p.deleteAttribute("uv"));
  const unida = mergeGeometries(partes);
  partes.forEach((p) => p.dispose());
  return unida;
}

/** Luces en ronda. La banda va en espejo (graves en la 0, agudos enfrente): sin salto entre la última y la primera. */
function lucesEnRonda(cantidad: number, radio: number, y: number, tam = 1, bandaMax = 1): LugarLuz[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const a = (i / cantidad) * Math.PI * 2;
    const banda = (Math.min(i, cantidad - i) / (cantidad / 2)) * bandaMax;
    return { lugar: new THREE.Vector3(Math.cos(a) * radio, y, Math.sin(a) * radio), tam, banda };
  });
}

// ————————————————————————————— Triángulo: torno sobre un contorno —————————————————————————————

/** Triángulo de esquinas redondeadas en el plano (x, z), con una esquina mirando a +x (la nariz). */
function contornoTriangulo(centro: number, radio: number): THREE.Vector2[] {
  const PASOS_ESQUINA = 12;
  const PASOS_LADO = 6;
  const puntos: THREE.Vector2[] = [];
  for (let k = 0; k < 3; k++) {
    const angulo = (k / 3) * Math.PI * 2;
    const cx = Math.cos(angulo) * centro;
    const cz = Math.sin(angulo) * centro;
    for (let p = 0; p <= PASOS_ESQUINA; p++) {
      const a = angulo - Math.PI / 3 + (p / PASOS_ESQUINA) * ((Math.PI * 2) / 3);
      puntos.push(new THREE.Vector2(cx + Math.cos(a) * radio, cz + Math.sin(a) * radio));
    }
    // El lado recto con puntos en el medio: así el sombreado del lado queda parejo.
    const siguiente = ((k + 1) / 3) * Math.PI * 2;
    const desde = puntos[puntos.length - 1];
    const hasta = new THREE.Vector2(
      Math.cos(siguiente) * centro + Math.cos(siguiente - Math.PI / 3) * radio,
      Math.sin(siguiente) * centro + Math.sin(siguiente - Math.PI / 3) * radio
    );
    for (let p = 1; p < PASOS_LADO; p++) puntos.push(desde.clone().lerp(hasta, p / PASOS_LADO));
  }
  // El torno de three da la vuelta de +z hacia +x: el contorno va en ese sentido para que las caras miren afuera.
  return puntos.reverse();
}

/**
 * Como LatheGeometry, pero en vez de dar la vuelta en círculo sigue un contorno: cada punto del perfil
 * (s, y) es el contorno escalado por s a la altura y. El perfil se recorre igual que en el torno.
 */
function tornoContorno(contorno: THREE.Vector2[], perfil: Perfil): THREE.BufferGeometry {
  const n = contorno.length;
  const m = perfil.length;
  const posiciones = new Float32Array(n * m * 3);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const [s, y] = perfil[j];
      posiciones.set([contorno[i].x * s, y, contorno[i].y * s], (i * m + j) * 3);
    }
  }
  // Sin costura: la última columna se une con la primera (una costura duplicada se vería en el cromo).
  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const sig = (i + 1) % n;
    for (let j = 0; j < m - 1; j++) {
      const a = i * m + j;
      const b = sig * m + j;
      const c = sig * m + j + 1;
      const d = i * m + j + 1;
      indices.push(a, b, d, c, d, b);
    }
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
  geometria.setIndex(indices);
  geometria.computeVertexNormals();
  return geometria;
}

/** Dónde corta el contorno un rayo desde el centro con ese ángulo (en el plano x, z). */
function puntoEnContorno(contorno: THREE.Vector2[], angulo: number): THREE.Vector2 {
  const dx = Math.cos(angulo);
  const dz = Math.sin(angulo);
  let mejor = Infinity;
  for (let i = 0; i < contorno.length; i++) {
    const p = contorno[i];
    const q = contorno[(i + 1) % contorno.length];
    const ex = q.x - p.x;
    const ez = q.y - p.y;
    const det = dx * -ez - dz * -ex;
    if (Math.abs(det) < 1e-9) continue;
    const t = (p.x * -ez - p.y * -ex) / det;
    const u = (dx * p.y - dz * p.x) / det;
    if (t > 0 && u >= 0 && u <= 1) mejor = Math.min(mejor, t);
  }
  return new THREE.Vector2(dx * mejor, dz * mejor);
}

/** La y de un perfil (s, y) en una s dada (interpolando entre puntos). */
function alturaEn(perfil: Perfil, s: number): number {
  for (let j = 0; j < perfil.length - 1; j++) {
    const [s0, y0] = perfil[j];
    const [s1, y1] = perfil[j + 1];
    if ((s - s0) * (s - s1) <= 0 && s0 !== s1) return y0 + ((s - s0) / (s1 - s0)) * (y1 - y0);
  }
  return perfil[perfil.length - 1][1];
}

// ————————————————————————————— Moldes —————————————————————————————

/** El de siempre: usa las geometrías del kit (kit.geo), que ya estaban. */
function moldePlatillo(kit: Kit): MoldeNave {
  const g = kit.geo;
  return {
    partes: [
      { geo: g.panza, pieza: "panza" },
      { geo: g.casco, pieza: "casco" },
      { geo: g.banda, pieza: "aro" },
      { geo: g.motor, pieza: "motor" },
      { geo: g.nucleo, pieza: "motor" },
    ],
    cupula: { geo: g.cupula, ...pilotoEn(0.6, 0, 0.27) },
    luces: lucesEnRonda(LUCES_NAVE, 1.47, 0.09),
    vueltas: 0.6,
    eje: "y",
    subida: 0.14,
    dron: null,
    propias: [],
  };
}

/** Trompo de juguete: cono que se infla hasta el ecuador, púa abajo, dos franjas y cúpula arriba. */
function moldeTrompo(): MoldeNave {
  // El cono: mitad recto, mitad seno, así se infla hacia el ecuador sin volverse una bocha.
  const cono = (y: number): [number, number] => {
    const lineal = (y + 1.1) / 1.1;
    return [1.26 * 0.5 * (lineal + Math.sin((lineal * Math.PI) / 2)), y];
  };
  // Lo oscuro es solo la punta: el cromo baja casi hasta la púa y la silueta de trompo se lee de lejos.
  const CORTE = -0.78;
  const panza = torno([[0, -1.24], [0.03, -1.215], [0.05, -1.16], [0.075, -1.1], ...[-1, -0.9, -0.84, CORTE].map(cono)], 64);
  const casco = torno(
    [
      ...[CORTE, -0.7, -0.6, -0.5, -0.4, -0.3, -0.2, -0.1, 0].map(cono),
      [1.255, 0.04],
      [1.22, 0.09],
      [1.14, 0.15],
      [1.0, 0.21],
      [0.82, 0.26],
      [0.66, 0.29],
      [0.56, 0.305],
      [0.545, 0.33],
      [0.52, 0.35],
    ],
    64
  );
  const franjas = unir([aro(1.262, 0.055, 0, 96), aro(cono(-0.42)[0] + 0.004, 0.032, -0.42, 72), aro(cono(CORTE)[0] + 0.004, 0.028, CORTE, 64)]);
  const motor = aro(0.16, 0.025, -1.0, 32);
  const cupula = cupulaDe(0.5, 0.35);
  return {
    partes: [
      { geo: panza, pieza: "panza" },
      { geo: casco, pieza: "casco" },
      { geo: franjas, pieza: "aro" },
      { geo: motor, pieza: "motor" },
    ],
    cupula: { geo: cupula, ...pilotoEn(0.5, 0, 0.35) },
    luces: lucesEnRonda(LUCES_NAVE, 1.15, 0.15),
    // Gira como un trompo: las luces corren rápido alrededor.
    vueltas: 3.2,
    eje: "y",
    subida: 0.14,
    dron: null,
    propias: [panza, casco, franjas, motor, cupula],
  };
}

/**
 * Una rueda parada, de frente a la cámara: aro grueso con el neón por dentro, rayos que giran con sus
 * luces y la burbuja del piloto quieta al medio. El motor es una bombita abajo del aro (de ahí el rayo).
 */
function moldeAnillo(): MoldeNave {
  // Los tornos se arman acostados y se paran: el eje queda mirando a la cámara (+z), el cromo adelante.
  const parar = (g: THREE.BufferGeometry) => g.rotateX(Math.PI / 2);
  const panza = unir([
    parar(torno([[0.98, -0.07], [1.03, -0.15], [1.12, -0.2], [1.3, -0.225], [1.46, -0.2], [1.56, -0.13], [1.61, -0.06], [1.62, 0]], 96)),
    // La copa de atrás de la burbuja: oscura, así el piloto se recorta.
    parar(torno([[0, -0.44], [0.14, -0.43], [0.27, -0.38], [0.37, -0.28], [0.42, -0.15], [0.44, 0]], 48)),
  ]);
  const casco = unir([
    parar(torno([[1.62, 0], [1.61, 0.06], [1.56, 0.13], [1.46, 0.2], [1.3, 0.225], [1.12, 0.2], [1.03, 0.15], [0.98, 0.07]], 96)),
    new THREE.TorusGeometry(0.45, 0.045, 10, 48),
  ]);
  const rayos = unir(
    [0, 1, 2].map((k) =>
      new THREE.CapsuleGeometry(0.04, 0.48, 4, 8)
        .translate(0, 0.72, 0)
        .rotateZ((k / 3) * Math.PI * 2)
    )
  );
  const neon = new THREE.TorusGeometry(0.985, 0.085, 10, 96);
  const motor = new THREE.SphereGeometry(0.11, 16, 10).translate(0, -1.62, 0);
  const cupula = new THREE.SphereGeometry(0.42, 32, 20);
  const luces: LugarLuz[] = Array.from({ length: LUCES_NAVE }, (_, i) => {
    const a = -Math.PI / 2 + (i / LUCES_NAVE) * Math.PI * 2;
    // Graves abajo, agudos arriba, en espejo.
    const banda = Math.min(i, LUCES_NAVE - i) / (LUCES_NAVE / 2);
    return { lugar: new THREE.Vector3(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0.235), tam: 1.15, banda };
  });
  return {
    partes: [
      { geo: panza, pieza: "panza" },
      { geo: casco, pieza: "casco" },
      { geo: rayos, pieza: "casco", gira: true },
      { geo: neon, pieza: "aro" },
      { geo: motor, pieza: "motor" },
    ],
    cupula: { geo: cupula, piloto: new THREE.Vector3(0, 0, 0.02), escalaPiloto: 0.19 },
    luces,
    // Rueda hacia la derecha (en el sentido del reloj, visto de frente).
    vueltas: -1.6,
    eje: "z",
    subida: 0,
    dron: null,
    propias: [panza, casco, rayos, neon, motor, cupula],
  };
}

/** Cigarro: cuerpo largo acostado (la nariz en +x), dos franjas, aletas atrás, tobera y ojos de buey. */
function moldeCigarro(): MoldeNave {
  // El torno se arma parado y se acuesta: lo que era +y queda en +x.
  const acostar = (g: THREE.BufferGeometry) => g.rotateZ(-Math.PI / 2);
  const cuerpo = acostar(
    torno(
      [[0.4, -1.32], [0.44, -1.15], [0.46, -0.9], [0.47, -0.5], [0.47, 0.5], [0.46, 0.9], [0.43, 1.2], [0.37, 1.45], [0.28, 1.65], [0.16, 1.79], [0.06, 1.84], [0, 1.85]],
      48
    )
  );
  // Aletas de cohete, tiradas para atrás, con la raíz metida en el cuerpo.
  const aletas = [0, 1, 2].map((k) =>
    new THREE.SphereGeometry(1, 20, 12)
      .scale(0.34, 0.24, 0.035)
      .rotateZ(-0.55)
      .translate(-1.3, 0.5, 0)
      .rotateX((k / 3) * Math.PI * 2)
  );
  // La cabina, un poco adelantada: un pedestal y el collar donde apoya la cúpula.
  const CABINA_X = 0.25;
  const CABINA = { radio: 0.36, y: 0.44 };
  const pedestal = torno([[0.36, 0.24], [0.365, 0.42], [0.36, CABINA.y]], 32).translate(CABINA_X, 0, 0);
  const collar = aro(0.37, 0.035, CABINA.y, 48).translate(CABINA_X, 0, 0);
  const casco = unir([cuerpo, ...aletas, pedestal, collar]);
  const cola = acostar(torno([[0, -1.56], [0.18, -1.56], [0.22, -1.6], [0.25, -1.63], [0.3, -1.6], [0.36, -1.5], [0.4, -1.32]], 48));
  const franjas = unir([acostar(aro(0.468, 0.04, -1.08, 64)), acostar(aro(0.468, 0.04, 1.08, 64))]);
  const motor = unir([acostar(aro(0.235, 0.025, -1.615, 32)), acostar(disco(0.18, -1.565))]);
  const cupula = cupulaDe(CABINA.radio, CABINA.y).translate(CABINA_X, 0, 0);
  const luces: LugarLuz[] = [];
  for (const lado of [1, -1]) {
    for (let k = 0; k < 7; k++) luces.push({ lugar: new THREE.Vector3(-0.84 + k * 0.28, 0, lado * 0.475), tam: 1.3, banda: k / 6 });
  }
  return {
    partes: [
      { geo: cola, pieza: "panza" },
      { geo: casco, pieza: "casco" },
      { geo: franjas, pieza: "aro" },
      { geo: motor, pieza: "motor" },
    ],
    cupula: { geo: cupula, ...pilotoEn(CABINA.radio, CABINA_X, CABINA.y) },
    luces,
    vueltas: 0,
    eje: "y",
    subida: 0,
    dron: null,
    propias: [cola, casco, franjas, motor, cupula],
  };
}

/** Triángulo furtivo: losa de esquinas redondeadas con el borde de neón, balizas grandes en las puntas. */
function moldeTriangulo(): MoldeNave {
  const contorno = contornoTriangulo(1.32, 0.32);
  // La cubierta de arriba (donde apoya la cúpula) está en y = CUBIERTA.
  const CUBIERTA = 0.29;
  const ARRIBA: Perfil = [[1, 0], [0.995, 0.045], [0.975, 0.085], [0.93, 0.115], [0.75, 0.18], [0.58, 0.235], [0.54, 0.255], [0.51, 0.278], [0.49, CUBIERTA], [0, CUBIERTA]];
  const ABAJO: Perfil = [[0, -0.2], [0.3, -0.2], [0.34, -0.195], [0.5, -0.162], [0.75, -0.1], [0.93, -0.05], [0.98, -0.02], [1, 0]];
  const casco = unir([tornoContorno(contorno, ARRIBA), aro(0.41, 0.03, CUBIERTA, 48)]);
  const panza = tornoContorno(contorno, ABAJO);
  const curva = new THREE.CatmullRomCurve3(
    contorno.map((p) => new THREE.Vector3(p.x, 0, p.y)),
    true,
    "centripetal"
  );
  const borde = new THREE.TubeGeometry(curva, 240, 0.045, 8, true);
  const motor = unir([aro(0.2, 0.03, -0.2, 32), disco(0.17, -0.202)]);
  const cupula = cupulaDe(0.4, CUBIERTA);

  const grados = (g: number) => (g * Math.PI) / 180;
  /** Sobre la cara de arriba, a una fracción s del contorno en esa dirección. */
  const sobre = (angulo: number, s: number) => {
    const p = puntoEnContorno(contorno, angulo).multiplyScalar(s);
    return new THREE.Vector3(p.x, alturaEn(ARRIBA, s) + 0.02, p.y);
  };
  /** Sobre la cara de arriba, a una distancia fija del centro (la corona alrededor de la cúpula). */
  const enCorona = (angulo: number, radio: number) => sobre(angulo, radio / puntoEnContorno(contorno, angulo).length());
  // En espejo respecto de la nariz: las bandas también, así el ecualizador se ve armado a propósito.
  const luces: LugarLuz[] = [
    // Balizas grandes en las tres puntas, sobre el neón: los graves.
    ...[0, 120, 240].map((g, i) => {
      const p = puntoEnContorno(contorno, grados(g)).multiplyScalar(1.015);
      return { lugar: new THREE.Vector3(p.x, 0, p.y), tam: 2.1, banda: i === 0 ? 0 : 0.08 };
    }),
    // Dos por lado, cerca del borde.
    ...(
      [
        [40, 0.25],
        [320, 0.25],
        [80, 0.38],
        [280, 0.38],
        [160, 0.5],
        [200, 0.5],
      ] as const
    ).map(([g, banda]) => ({ lugar: sobre(grados(g), 0.87), tam: 1, banda })),
    // Corona de cinco alrededor de la cúpula: los agudos.
    ...(
      [
        [0, 0.62],
        [72, 0.76],
        [288, 0.76],
        [144, 0.9],
        [216, 0.9],
      ] as const
    ).map(([g, banda]) => ({ lugar: enCorona(grados(g), 0.5), tam: 0.9, banda })),
  ];
  return {
    partes: [
      { geo: panza, pieza: "panza" },
      { geo: casco, pieza: "casco" },
      { geo: borde, pieza: "aro" },
      { geo: motor, pieza: "motor" },
    ],
    cupula: { geo: cupula, ...pilotoEn(0.4, 0, CUBIERTA) },
    luces,
    vueltas: 0,
    eje: "y",
    subida: 0.12,
    dron: null,
    propias: [panza, casco, borde, motor, cupula],
  };
}

/** Enjambre: una madre chica y redonda, con franjas como de abeja, y seis drones que la rondan. */
function moldeEnjambre(): MoldeNave {
  const panza = torno([[0, -0.62], [0.16, -0.62], [0.3, -0.58], [0.46, -0.5], [0.6, -0.38], [0.7, -0.24], [0.76, -0.11], [0.78, 0]], 64);
  const casco = torno([[0.78, 0], [0.775, 0.08], [0.74, 0.17], [0.66, 0.26], [0.55, 0.33], [0.47, 0.36], [0.44, 0.38], [0.42, 0.39]], 64);
  const franjas = unir([aro(0.785, 0.05, 0, 72), aro(0.605, 0.03, -0.38, 64)]);
  const motor = unir([aro(0.13, 0.022, -0.6, 32), disco(0.12, -0.622)]);
  const cupula = cupulaDe(0.4, 0.39);
  const dronCasco = unir([
    torno([[0, -0.075], [0.1, -0.07], [0.2, -0.04], [0.26, 0]], 24),
    torno([[0.26, 0], [0.24, 0.045], [0.16, 0.085], [0.1, 0.1], [0.06, 0.125], [0, 0.135]], 24),
  ]);
  const dronAro = aro(0.262, 0.022, 0, 40);
  const luces: LugarLuz[] = [
    ...lucesEnRonda(LUCES_MADRE, 0.74, 0.15, 0.85, 0.45),
    // Las de los drones: su lugar lo pone animar. Cada dron sigue una banda de los agudos.
    ...Array.from({ length: DRONES }, (_, k) => ({ lugar: new THREE.Vector3(), tam: 1.1, banda: 0.55 + (k / (DRONES - 1)) * 0.45 })),
  ];
  return {
    partes: [
      { geo: panza, pieza: "panza" },
      { geo: casco, pieza: "casco" },
      { geo: franjas, pieza: "aro" },
      { geo: motor, pieza: "motor" },
    ],
    cupula: { geo: cupula, ...pilotoEn(0.4, 0, 0.39) },
    luces,
    vueltas: 0.8,
    eje: "y",
    subida: 0.1,
    dron: { casco: dronCasco, aro: dronAro },
    propias: [panza, casco, franjas, motor, cupula, dronCasco, dronAro],
  };
}

const ARMAR: Record<ModeloNave, (kit: Kit) => MoldeNave> = {
  platillo: moldePlatillo,
  trompo: moldeTrompo,
  anillo: moldeAnillo,
  cigarro: moldeCigarro,
  triangulo: moldeTriangulo,
  enjambre: moldeEnjambre,
};

function moldeDe(kit: Kit, modelo: ModeloNave): MoldeNave {
  let molde = kit.moldes.get(modelo);
  if (!molde) {
    molde = ARMAR[modelo](kit);
    kit.moldes.set(modelo, molde);
  }
  return molde;
}

function tinteDe(kit: Kit, color: number): TinteNave {
  let tinte = kit.tintes.get(color);
  if (!tinte) {
    const neon = new THREE.Color(color);
    tinte = {
      // Como el aro rosa del platillo: casi negro de base y el color como luz propia.
      aro: new THREE.MeshStandardMaterial({ color: neon.clone().multiplyScalar(0.03), emissive: color, emissiveIntensity: 1.2 }),
      // Luces casi blancas con un toque del color: se leen como luces, no como pintura.
      luz: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).lerp(neon, 0.42) }),
    };
    kit.tintes.set(color, tinte);
  }
  return tinte;
}

/** Arma de antemano las geometrías de esos modelos (por ejemplo, la flota del tema al cargarlo). */
export function prepararFlota(kit: Kit, modelos: readonly ModeloNave[] = MODELOS) {
  for (const modelo of modelos) moldeDe(kit, modelo);
}

/** ~70% sale de la flota dominante del tema (kit.flota); el resto, cualquiera. */
export function elegirModelo(kit: Kit): ModeloNave {
  return kit.flota.length > 0 && Math.random() < 0.7 ? elegir(kit.flota) : elegir(MODELOS);
}

// ————————————————————————————— La nave —————————————————————————————

const aux = new THREE.Object3D();

function promedio(valores: Float32Array, desde: number, hasta: number): number {
  let suma = 0;
  for (let i = desde; i < hasta; i++) suma += valores[i] ?? 0;
  const p = suma / (hasta - desde);
  return Number.isFinite(p) ? p : 0;
}

export function crearNave(kit: Kit, modelo: ModeloNave, opciones: OpcionesNave = {}): Nave {
  const molde = moldeDe(kit, modelo);
  const medidas = MEDIDAS_NAVE[modelo];
  const color = opciones.color ?? (modelo === "platillo" ? null : COLOR_NAVE[modelo]);
  const tinte: TinteNave = color === null ? { aro: kit.aroRosa, luz: kit.luz } : tinteDe(kit, color);
  const materiales: Record<Pieza, THREE.Material> = { casco: kit.casco, panza: kit.panza, aro: tinte.aro, motor: kit.motor };

  const grupo = new THREE.Group();
  const rueda = new THREE.Group();
  grupo.add(rueda);
  for (const parte of molde.partes) (parte.gira ? rueda : grupo).add(new THREE.Mesh(parte.geo, materiales[parte.pieza]));

  // El piloto: una cabecita mirando para todos lados adentro de la cúpula.
  let piloto: ReturnType<typeof crearCabezaAlien> | null = null;
  if (molde.cupula) {
    if (opciones.piloto !== false) {
      piloto = crearCabezaAlien(kit, kit.pielVerde);
      piloto.grupo.scale.setScalar(molde.cupula.escalaPiloto);
      piloto.grupo.position.copy(molde.cupula.piloto);
      grupo.add(piloto.grupo);
    }
    const cupula = new THREE.Mesh(molde.cupula.geo, kit.cupula);
    cupula.renderOrder = 1;
    grupo.add(cupula);
  }

  // Las 14 luces son una sola instancia: una llamada de dibujo por nave, no 14. Se mueven adentro del
  // alcance: con la esfera fija three no las recorta mal cuando cambian de lugar.
  const esfera = new THREE.Sphere(new THREE.Vector3(), medidas.alcance + 0.4);
  const luces = new THREE.InstancedMesh(kit.geo.luz, tinte.luz, LUCES_NAVE);
  luces.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  luces.boundingSphere = esfera;
  grupo.add(luces);

  const drones = molde.dron
    ? { casco: new THREE.InstancedMesh(molde.dron.casco, kit.casco, DRONES), aro: new THREE.InstancedMesh(molde.dron.aro, tinte.aro, DRONES) }
    : null;
  if (drones) {
    for (const malla of [drones.casco, drones.aro]) {
      malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      malla.boundingSphere = esfera;
      grupo.add(malla);
    }
  }

  const matRayo = crearMaterialRayo();
  const rayo = new THREE.Mesh(kit.geo.rayo, matRayo);
  // La geometría del rayo tiene la punta en la panza del platillo: se corre a la de este modelo.
  rayo.position.y = medidas.bajo - PANZA_Y;
  grupo.add(rayo);

  // Dónde está cada luz ahora (en el grupo), para los láseres.
  const actuales = molde.luces.map((l) => l.lugar.clone());
  const lucesDron = Array.from({ length: DRONES }, () => new THREE.Vector3());
  // Nivel de cada luz en el ecualizador, suavizado: sube rápido pero no de un cuadro al otro.
  const nivel = new Float32Array(LUCES_NAVE);
  let apertura = 0.5;
  let tPrevio: number | null = null;
  // El piloto gira la cabeza hacia el dedo con un poco de retraso, como si lo siguiera con la vista.
  let giroPiloto = 0;

  const animar = (t: number, espectro?: Float32Array) => {
    const dt = tPrevio === null ? 0 : THREE.MathUtils.clamp(t - tPrevio, 0, 0.1);
    tPrevio = t;
    const giro = molde.vueltas * t;
    if (molde.eje === "y") rueda.rotation.y = giro;
    else rueda.rotation.z = giro;
    const coseno = Math.cos(giro);
    const seno = Math.sin(giro);
    const bandas = espectro && espectro.length > 0 ? espectro : null;

    if (drones) {
      // La ronda de drones se abre con los graves (sin música, sola y despacio) y se cierra al bajar.
      const meta = bandas ? promedio(bandas, 0, Math.min(4, bandas.length)) : 0.5 + 0.5 * Math.sin(t * 0.7);
      apertura += (meta - apertura) * Math.min(1, dt * 2.5);
      const radio = 1.2 + apertura * 0.65;
      for (let k = 0; k < DRONES; k++) {
        const a = t * 1.1 + (k / DRONES) * Math.PI * 2;
        const r = radio * (1 + 0.05 * Math.sin(t * 2.3 + k * 1.7));
        aux.position.set(Math.cos(a) * r, Math.sin(a + 0.6) * r * 0.2 + Math.sin(t * 3.1 + k) * 0.05, Math.sin(a) * r);
        aux.rotation.set(Math.sin(t * 1.7 + k) * 0.15, t * 2.6 + k, Math.cos(a) * 0.2);
        aux.scale.setScalar(1);
        aux.updateMatrix();
        drones.casco.setMatrixAt(k, aux.matrix);
        drones.aro.setMatrixAt(k, aux.matrix);
        lucesDron[k].set(aux.position.x, aux.position.y + 0.15, aux.position.z);
      }
      drones.casco.instanceMatrix.needsUpdate = true;
      drones.aro.instanceMatrix.needsUpdate = true;
    }

    for (let i = 0; i < LUCES_NAVE; i++) {
      const luz = molde.luces[i];
      const enDron = drones !== null && i >= LUCES_MADRE;
      let escala: number;
      if (bandas) {
        const banda = Math.min(bandas.length - 1, Math.floor(luz.banda * bandas.length));
        const valor = bandas[banda];
        const meta = Number.isFinite(valor) ? THREE.MathUtils.clamp(valor, 0, 1) : 0;
        nivel[i] += (meta - nivel[i]) * Math.min(1, dt * (meta > nivel[i] ? 9 : 3.5));
        escala = luz.tam * (0.5 + 1.1 * nivel[i]);
      } else {
        // La ronda de siempre: una onda que corre por las luces. El nivel la acompaña para que pasar
        // al ecualizador no dé un salto.
        const onda = 0.5 + 0.5 * Math.sin(t * 5 - i * 0.9);
        escala = luz.tam * (0.75 + 0.5 * onda);
        nivel[i] = (0.25 + 0.5 * onda) / 1.1;
      }
      const sube = bandas && !enDron ? nivel[i] * molde.subida : 0;
      const p = actuales[i];
      if (enDron) {
        p.copy(lucesDron[i - LUCES_MADRE]);
      } else {
        // Igual que girar todo el grupo de luces (como hacía el platillo), pero luz por luz.
        const { x, y, z } = luz.lugar;
        if (molde.eje === "y") p.set(x * coseno + z * seno, y + sube, -x * seno + z * coseno);
        else p.set(x * coseno - y * seno, x * seno + y * coseno + sube, z);
      }
      aux.position.copy(p);
      aux.rotation.set(0, 0, 0);
      aux.scale.setScalar(escala);
      aux.updateMatrix();
      luces.setMatrixAt(i, aux.matrix);
    }
    luces.instanceMatrix.needsUpdate = true;

    if (piloto) {
      const meta = kit.mirada.activa ? anguloHacia(grupo, kit.mirada, 1.4)[0] : Math.sin(t * 1.3) * 0.6;
      giroPiloto += (meta - giroPiloto) * 0.12;
      piloto.grupo.rotation.y = giroPiloto;
      piloto.animar(t);
    }
    matRayo.uniforms.uTiempo.value = t;
  };

  // Las luces quedan en su lugar desde el primer cuadro (si no, nacen todas juntas en el centro).
  animar(0);
  tPrevio = null;

  return {
    modelo,
    grupo,
    rayo,
    matRayo,
    radio: medidas.radio,
    alcance: medidas.alcance,
    bajo: medidas.bajo,
    liberar: () => {
      luces.dispose();
      drones?.casco.dispose();
      drones?.aro.dispose();
      matRayo.dispose();
    },
    posicionesLuces: () => actuales.map((p) => p.clone().applyMatrix4(luces.matrixWorld)),
    animar,
  };
}

// ————————————————————————————— Cómo vuela cada una —————————————————————————————

/**
 * Desvío del vuelo de cada modelo, para sumarle a su movimiento: `x` e `y` en unidades de la nave
 * (multiplicar por su escala), los giros en radianes (sumar a rotation.y / rotation.z). `fase`
 * separa a dos naves iguales. `salida` evita crear un objeto por cuadro.
 * El cigarro y el triángulo tienen la nariz en +x: para que vayan hacia -x, girarlos media vuelta en y.
 */
export type Vaiven = { x: number; y: number; giroY: number; giroZ: number };

export function vaivenDe(modelo: ModeloNave, t: number, fase: number, salida: Vaiven = { x: 0, y: 0, giroY: 0, giroZ: 0 }): Vaiven {
  switch (modelo) {
    case "platillo":
      // Flota: sube y baja suave, se mece apenas.
      salida.x = 0.1 * Math.sin(t * 0.9 + fase * 1.3);
      salida.y = 0.18 * Math.sin(t * 1.6 + fase);
      salida.giroY = 0;
      salida.giroZ = 0.08 * Math.sin(t * 1.3 + fase);
      break;
    case "trompo": {
      // Gira sobre su eje y cabecea como un trompo que pierde fuerza; el eje describe un círculo chico.
      const u = t * 1.9 + fase;
      salida.x = 0.12 * Math.sin(u);
      salida.y = 0.08 * Math.sin(t * 3.8 + fase);
      salida.giroY = t * 1.5 + fase;
      salida.giroZ = 0.2 * Math.cos(u);
      break;
    }
    case "anillo": {
      // Rueda de canto: va y viene de costado y a veces se pone de perfil (se ve finita), meciéndose.
      salida.x = 0.45 * Math.sin(t * 0.55 + fase);
      salida.y = 0.1 * Math.sin(t * 1.1 + fase);
      salida.giroY = 0.6 * Math.sin(t * 0.37 + fase);
      salida.giroZ = 0.1 * Math.sin(t * 0.9 + fase);
      break;
    }
    case "cigarro": {
      // Zigzag: sube y baja en diagonales rectas, con la nariz apuntando a donde va.
      const u = t * 0.9 + fase;
      salida.x = 0.12 * Math.sin(t * 0.45 + fase);
      salida.y = 0.4 * ((2 / Math.PI) * Math.asin(0.97 * Math.sin(u)));
      salida.giroY = 0.12 * Math.sin(t * 0.7 + fase);
      salida.giroZ = 0.28 * Math.tanh(4 * Math.cos(u));
      break;
    }
    case "triangulo": {
      // Frena en seco y acelera: va de un lado al otro de golpe y se queda quieto; baja la nariz al arrancar.
      const u = t * 1.1 + fase;
      const k = 3.2;
      const sk = Math.sin(u) * k;
      const sech = 1 / Math.cosh(sk);
      salida.x = (0.55 * Math.tanh(sk)) / Math.tanh(k);
      salida.y = 0.06 * Math.sin(t * 2.1 + fase);
      salida.giroY = 0;
      salida.giroZ = -0.32 * Math.cos(u) * sech * sech;
      break;
    }
    case "enjambre":
      // La madre casi quieta, girando perezosa: lo que se mueve son los drones (en animar).
      salida.x = 0.08 * Math.sin(t * 1.3 + fase);
      salida.y = 0.14 * Math.sin(t * 1.9 + fase);
      salida.giroY = 0.35 * Math.sin(t * 0.4 + fase);
      salida.giroZ = 0.06 * Math.sin(t * 1.7 + fase);
      break;
  }
  return salida;
}
