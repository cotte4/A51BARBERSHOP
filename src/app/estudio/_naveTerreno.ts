import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { BANDAS } from "./_analisis";
import { azar, elegir, suave, type Kit } from "./_naveKit";
import { conBorde } from "./_naveMateriales";
import type { Musica, Pieza } from "./_naveShow";

// El piso de la nave: una grilla que se arma con el espectro y avanza hacia la cámara, con
// estructuras paradas encima que pasan por los costados.
//  - Biomas: montañas, ciudad, dunas, cañón y cráteres. Cada uno tiene su forma de piso, su mezcla
//    de estructuras, su tinte y su dibujo de grilla. El cambio entra desde el horizonte: las filas
//    nuevas ya salen con el bioma nuevo y la altura se funde en unas filas, nunca de golpe.
//  - Estructuras: pirámides, edificios, rascacielos, cristales, hongos, monolitos, antenas,
//    carteles de neón y algún arco raro. Una instancia por tipo y parte (pocas llamadas de dibujo),
//    pegadas a su fila: avanzan con el piso y se reciclan al pasar la cámara.

const COLUMNAS = 41;
const FILAS = 56;
const ANCHO_TERRENO = 46;
const LARGO_TERRENO = 84;
const TUNEL_HASTA = 9;
const SEP_X = ANCHO_TERRENO / (COLUMNAS - 1);
const SEP_Z = LARGO_TERRENO / (FILAS - 1);
const MITAD = (COLUMNAS - 1) / 2;
/** En cuántas filas se funde un bioma con el siguiente. */
const FILAS_TRANSICION = 8;
/** Lo mínimo entre dos cambios de bioma: que el anterior llegue a verse. */
const CAMBIO_MINIMO = 10;
/** Las estructuras se hunden un poco en el piso: así no quedan flotando en las laderas. */
const HUNDE = 0.25;

/** Factor para que el show entre en un celular parado sin cortarse a los costados. */
function escalaPorAspecto(aspecto: number) {
  return THREE.MathUtils.clamp(aspecto / 0.85, 0.5, 1);
}

/** Hasta dónde a los costados nacen estructuras: en un celu parado, más cerca del centro. */
function anchoUtil(aspecto: number) {
  return THREE.MathUtils.lerp(9.5, 21, THREE.MathUtils.clamp((aspecto - 0.55) / 0.9, 0, 1));
}

/** Azar fijo para un par de números: el mismo bloque de ciudad tiene siempre la misma altura. */
function hash(a: number, b: number) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// ————————————————————————————— Material del piso —————————————————————————————

/**
 * Piso y grilla en un solo shader: las líneas salen de las coordenadas de la malla (solo filas y
 * columnas, sin las diagonales de un wireframe), con antialiasing por derivadas y un halo suave.
 * Los valles toman el color A y las montañas van hacia el B. Cada vértice trae el tinte de su
 * bioma y cuánto pesan las columnas y las filas (las dunas, por ejemplo, son casi solo curvas de
 * nivel): como viaja con la fila, el cambio de bioma llega desde el horizonte.
 */
function crearMaterialTerreno() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uColorA: { value: new THREE.Color() },
        uColorB: { value: new THREE.Color() },
        uFondo: { value: new THREE.Color(0x030504) },
        uFuerza: { value: 0.5 },
        uCeldas: { value: new THREE.Vector2(COLUMNAS - 1, FILAS - 1) },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      attribute vec4 aTinte;
      attribute vec2 aEstilo;
      varying vec2 vUv;
      varying float vAltura;
      varying vec4 vTinte;
      varying vec2 vEstilo;
      void main() {
        vUv = uv;
        vAltura = position.y;
        vTinte = aTinte;
        vEstilo = aEstilo;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform vec3 uFondo;
      uniform float uFuerza;
      uniform vec2 uCeldas;
      varying vec2 vUv;
      varying float vAltura;
      varying vec4 vTinte;
      varying vec2 vEstilo;
      void main() {
        vec2 celda = vUv * uCeldas;
        // Con tope abajo: fwidth puede dar 0 (triángulo de canto) y 0/0 es NaN, que el bloom esparce.
        vec2 distancia = abs(fract(celda - 0.5) - 0.5) / max(fwidth(celda), vec2(1e-5));
        vec2 linea = 1.0 - min(distancia / 1.3, 1.0);
        vec2 halo = 1.0 - min(distancia / 7.0, 1.0);
        float l = max(linea.x * vEstilo.x, linea.y * vEstilo.y);
        float h = max(halo.x * vEstilo.x, halo.y * vEstilo.y);
        vec3 color = mix(uColorA, uColorB, clamp(vAltura / 3.5, 0.0, 1.0));
        color = mix(color, vTinte.rgb, vTinte.a);
        gl_FragColor = vec4(uFondo + color * uFuerza * (l + h * h * 0.3), 1.0);
        #include <fog_fragment>
      }`,
    fog: true,
  });
}

// ————————————————————————————— Geometrías de las estructuras —————————————————————————————
// Todas con la base en el origen y para arriba. Cada parte lleva un gris por vértice: en el cuerpo
// es el albedo (lineal: valores bajos = oscuro) y en los acentos, cuánto se prende. Así cada tipo
// es una sola geometría por material y todos los tipos comparten los mismos dos materiales.

const v2 = (x: number, y: number) => new THREE.Vector2(x, y);
const ARRIBA = new THREE.Vector3(0, 1, 0);

/**
 * Sin índice, sin uv y con color por vértice: así todas las partes de un tipo se pueden unir.
 * `plano` recalcula las normales por cara (pirámides y prismas facetados, no redondeados).
 */
function pintar(geometria: THREE.BufferGeometry, valor: number | ((y: number, cara: number) => number), plano = false): THREE.BufferGeometry {
  const suelta = geometria.index ? geometria.toNonIndexed() : geometria;
  if (suelta !== geometria) geometria.dispose();
  suelta.deleteAttribute("uv");
  if (plano) suelta.computeVertexNormals();
  const posiciones = suelta.getAttribute("position");
  const colores = new Float32Array(posiciones.count * 3);
  for (let i = 0; i < posiciones.count; i++) {
    const gris = typeof valor === "number" ? valor : valor(posiciones.getY(i), Math.floor(i / 3));
    colores.fill(gris, i * 3, i * 3 + 3);
  }
  suelta.setAttribute("color", new THREE.BufferAttribute(colores, 3));
  return suelta;
}

function unir(partes: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const unida = mergeGeometries(partes);
  partes.forEach((p) => p.dispose());
  return unida;
}

/** Un caño entre dos puntos (aristas de neón, brazos de antena). */
function tuboEntre(a: THREE.Vector3, b: THREE.Vector3, radio: number, lados = 5): THREE.BufferGeometry {
  const direccion = new THREE.Vector3().subVectors(b, a);
  const tubo = new THREE.CylinderGeometry(radio, radio, direccion.length(), lados, 1);
  const giro = new THREE.Quaternion().setFromUnitVectors(ARRIBA, direccion.normalize());
  tubo.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), giro, new THREE.Vector3(1, 1, 1)));
  return tubo;
}

/** Pirámide de obsidiana; la piedra que flota arriba va aparte porque gira. */
function geometriasPiramide() {
  const cuerpo = new THREE.ConeGeometry(1.3, 2.3, 4, 1);
  cuerpo.rotateY(Math.PI / 4);
  cuerpo.translate(0, 1.15 - HUNDE, 0);
  const zocalo = new THREE.BoxGeometry(2.05, 0.3, 2.05);
  zocalo.translate(0, 0.15 - HUNDE, 0);
  const piedra = new THREE.OctahedronGeometry(0.26, 0);
  piedra.scale(1, 1.55, 1);
  return {
    cuerpo: unir([pintar(cuerpo, 0.05, true), pintar(zocalo, 0.03)]),
    // Cada cara de la piedra con su brillo: se lee como una gema tallada aunque no tenga luz propia.
    piedra: pintar(piedra, (_, cara) => 0.7 + 0.3 * hash(cara, 3)),
  };
}

/** Edificio de bloque con tiras de ventanas, techo, mástil y una baliza fija (no titila). */
function geometriasTorre() {
  const bloque = new THREE.BoxGeometry(1.2, 4, 1.2);
  bloque.translate(0, 2 - HUNDE, 0);
  const techo = new THREE.BoxGeometry(0.8, 0.6, 0.8);
  techo.translate(0, 4.3 - HUNDE, 0);
  const mastil = new THREE.CylinderGeometry(0.035, 0.05, 1.2, 6);
  mastil.translate(0, 5.2 - HUNDE, 0);

  const ventanas: THREE.BufferGeometry[] = [];
  for (let piso = 0; piso < 6; piso++) {
    for (let cara = 0; cara < 4; cara++) {
      // Alguna oficina apagada: que no parezca un patrón.
      if (hash(piso, cara + 11) < 0.18) continue;
      const tira = new THREE.PlaneGeometry(0.92, 0.13);
      tira.translate(0, 0, 0.606);
      tira.rotateY((cara * Math.PI) / 2);
      tira.translate(0, 0.55 + piso * 0.6 - HUNDE, 0);
      ventanas.push(pintar(tira, 0.5 + 0.5 * hash(piso, cara)));
    }
  }
  const baliza = new THREE.SphereGeometry(0.075, 8, 6);
  baliza.translate(0, 5.82 - HUNDE, 0);
  ventanas.push(pintar(baliza, 1));
  return {
    cuerpo: unir([pintar(bloque, 0.035), pintar(techo, 0.05), pintar(mastil, 0.15)]),
    ventanas: unir(ventanas),
  };
}

/** Rascacielos hexagonal que se afina, con las aristas de neón y un aro arriba. */
function geometriasRascacielos() {
  const fuste = new THREE.CylinderGeometry(0.68, 0.85, 5.4, 6, 1);
  fuste.translate(0, 2.7 - HUNDE, 0);
  const corona = new THREE.CylinderGeometry(0.4, 0.68, 0.7, 6, 1);
  corona.translate(0, 5.75 - HUNDE, 0);
  const aguja = new THREE.ConeGeometry(0.1, 1.1, 6);
  aguja.translate(0, 6.65 - HUNDE, 0);

  const acentos: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 6; k++) {
    // Las esquinas del cilindro de 6 lados están cada 60°, con x = r·sen y z = r·cos.
    const a = (k * Math.PI) / 3;
    const abajo = new THREE.Vector3(Math.sin(a) * 0.88, 0.1 - HUNDE, Math.cos(a) * 0.88);
    const arriba = new THREE.Vector3(Math.sin(a) * 0.7, 5.3 - HUNDE, Math.cos(a) * 0.7);
    acentos.push(pintar(tuboEntre(abajo, arriba, 0.028, 4), 0.65));
  }
  const aro = new THREE.TorusGeometry(0.71, 0.035, 6, 24);
  aro.rotateX(Math.PI / 2);
  aro.translate(0, 5.38 - HUNDE, 0);
  acentos.push(pintar(aro, 1));
  return {
    cuerpo: unir([pintar(fuste, 0.03, true), pintar(corona, 0.05, true), pintar(aguja, 0.15, true)]),
    acento: unir(acentos),
  };
}

/** Racimo de cristales: prende más en las puntas que en la base, y cada cara a su manera. */
function geometriaCristales() {
  const piezas: [number, number, number, number][] = [
    // x, z, tamaño, inclinación
    [0, 0, 1, 0],
    [0.38, 0.18, 0.7, 0.38],
    [-0.32, 0.24, 0.62, -0.42],
    [0.12, -0.36, 0.55, 0.18],
    [-0.2, -0.16, 0.42, -0.22],
  ];
  return unir(
    piezas.map(([x, z, tamano, inclinacion], i) => {
      const cristal = new THREE.OctahedronGeometry(1, 0);
      cristal.scale(0.26 * tamano, 1.35 * tamano, 0.26 * tamano);
      cristal.rotateZ(inclinacion);
      cristal.rotateX(inclinacion * 0.6);
      cristal.translate(x, 1.35 * tamano * 0.55 - HUNDE, z);
      return pintar(cristal, (y, cara) => (0.55 + 0.45 * hash(cara, i + 7)) * (0.4 + 0.6 * THREE.MathUtils.clamp(y / 1.6, 0, 1)));
    })
  );
}

/** Altura del sombrero del hongo a una distancia r del eje (sigue su perfil). */
function alturaSombrero(r: number) {
  if (r <= 0.45) return 1.95 - (r / 0.45) * 0.07;
  if (r <= 0.8) return 1.88 - ((r - 0.45) / 0.35) * 0.2;
  return 1.68 - ((r - 0.8) / 0.2) * 0.26;
}

/** Un hongo grande y dos chiquitos: el pie es cuerpo, el sombrero y las pintas brillan. */
function geometriasHongo() {
  const pies: THREE.BufferGeometry[] = [];
  const sombreros: THREE.BufferGeometry[] = [];
  const hongos: [number, number, number][] = [
    [1, 0, 0],
    [0.45, 0.95, 0.35],
    [0.3, -0.75, -0.5],
  ];
  hongos.forEach(([escala, x, z], h) => {
    const pie = new THREE.LatheGeometry([v2(0.2, 0), v2(0.16, 0.4), v2(0.13, 0.9), v2(0.15, 1.3), v2(0, 1.32)], 12);
    // El sombrero baja por el borde y vuelve por abajo (las laminillas, que brillan más).
    const sombrero = new THREE.LatheGeometry([v2(0, 1.95), v2(0.45, 1.88), v2(0.8, 1.68), v2(1, 1.42), v2(0.96, 1.33), v2(0.6, 1.3), v2(0.15, 1.3)], 24);
    const ubicar = (g: THREE.BufferGeometry) => g.scale(escala, escala, escala).translate(x, -HUNDE * 0.6, z);
    pies.push(pintar(ubicar(pie), 0.35));
    sombreros.push(pintar(ubicar(sombrero), (y) => (y < 1.36 * escala - HUNDE * 0.6 ? 0.7 : 0.32)));
    for (let k = 0; k < 8; k++) {
      const angulo = k * 2.4 + h;
      const r = [0.32, 0.6, 0.78][k % 3];
      const pinta = new THREE.SphereGeometry(0.06 + 0.04 * hash(k, h), 8, 6);
      pinta.translate(Math.cos(angulo) * r, alturaSombrero(r) + 0.02, Math.sin(angulo) * r);
      sombreros.push(pintar(ubicar(pinta), 1));
    }
  });
  return { pie: unir(pies), sombrero: unir(sombreros) };
}

/** Monolito negro brilloso; una costura de luz al ras del piso. */
function geometriasMonolito() {
  const bloque = new THREE.BoxGeometry(1, 3.3, 0.28);
  bloque.translate(0, 1.65 - HUNDE, 0);
  const costura: THREE.BufferGeometry[] = [];
  for (const lado of [-1, 1]) {
    const frente = new THREE.BoxGeometry(1.1, 0.045, 0.03);
    frente.translate(0, 0.03, lado * 0.155);
    const costado = new THREE.BoxGeometry(0.03, 0.045, 0.34);
    costado.translate(lado * 0.55, 0.03, 0);
    costura.push(pintar(frente, 0.85), pintar(costado, 0.85));
  }
  return { cuerpo: pintar(bloque, 0.006), costura: unir(costura) };
}

/** Altura de la rótula de la antena: el plato gira alrededor de este punto. */
const ROTULA_Y = 1.75 - HUNDE;

/** Antena parabólica: la base es fija; el plato (con su punta prendida) gira despacio. */
function geometriasAntena() {
  const base = new THREE.BoxGeometry(0.9, 0.35, 0.9);
  base.translate(0, 0.175 - HUNDE, 0);
  const poste = new THREE.CylinderGeometry(0.07, 0.09, 1.5, 8);
  poste.translate(0, 1 - HUNDE, 0);
  const rotula = new THREE.SphereGeometry(0.13, 10, 8);
  rotula.translate(0, ROTULA_Y, 0);

  // El plato, con el pivote en la rótula: un cuenco parabólico que mira para arriba y adelante.
  const perfil = Array.from({ length: 9 }, (_, k) => {
    const r = (k / 8) * 1.05;
    return v2(r, 0.42 * (r / 1.05) ** 2);
  });
  const inclinar = (g: THREE.BufferGeometry) => g.translate(0, 0.1, 0).rotateX(0.8);
  const cuenco = inclinar(new THREE.LatheGeometry(perfil, 24));
  const brazo = inclinar(tuboEntre(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.62, 0), 0.022));
  const punta = inclinar(new THREE.SphereGeometry(0.07, 10, 8).translate(0, 0.66, 0));
  return {
    cuerpo: unir([pintar(base, 0.05), pintar(poste, 0.15), pintar(rotula, 0.12)]),
    plato: unir([pintar(cuenco, 0.25), pintar(brazo, 0.15)]),
    punta: pintar(punta, 1),
  };
}

const CARTEL_Y = 2.35 - HUNDE;

/** Cartel de ruta: dos postes y un respaldo oscuro (el neón va en otra malla, con la textura). */
function geometriasCartel() {
  const partes: THREE.BufferGeometry[] = [];
  for (const lado of [-1, 1]) {
    const poste = new THREE.CylinderGeometry(0.05, 0.06, 2.1, 6);
    poste.translate(lado * 1.15, 1.05 - HUNDE, 0);
    partes.push(pintar(poste, 0.08));
  }
  const respaldo = new THREE.BoxGeometry(3.35, 0.95, 0.07);
  respaldo.translate(0, CARTEL_Y, -0.04);
  partes.push(pintar(respaldo, 0.02));
  /** Cada panel usa media textura: arriba "A51", abajo "WAS & PINKY". */
  const panel = (fila: 0 | 1) => {
    const plano = new THREE.PlaneGeometry(3.2, 0.8);
    const uv = plano.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 0.5 + (fila === 0 ? 0.5 : 0));
    plano.translate(0, CARTEL_Y, 0.01);
    return plano;
  };
  return { cuerpo: unir(partes), panelA51: panel(0), panelWas: panel(1) };
}

/** Arco de neón (raro): tres arcos uno adentro del otro sobre dos bases. */
function geometriasArco() {
  const bases = [-1, 1].map((lado) => pintar(new THREE.BoxGeometry(0.55, 0.5, 0.55).translate(lado * 3.2, 0.25 - HUNDE, 0), 0.04));
  const arcos = (
    [
      [3.2, 0.075, 1],
      [2.75, 0.055, 0.7],
      [2.3, 0.04, 0.45],
    ] as const
  ).map(([radio, grosor, prende]) => pintar(new THREE.TorusGeometry(radio, grosor, 8, 72, Math.PI).translate(0, 0.3 - HUNDE, 0), prende));
  return { cuerpo: unir(bases), arcos: unir(arcos) };
}

/** Neón de cartel pintado en canvas: tubos blancos con halo, que se tiñen con la paleta. */
function crearTexturaCartel(): THREE.CanvasTexture {
  const lienzo = document.createElement("canvas");
  lienzo.width = 1024;
  lienzo.height = 512;
  const ctx = lienzo.getContext("2d");
  if (ctx) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(255,255,255,0.9)";
    const fila = (texto: string, y0: number, tamano: number) => {
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(26, y0 + 26, 972, 204, 40);
      else ctx.rect(26, y0 + 26, 972, 204);
      ctx.lineWidth = 7;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.stroke();

      ctx.font = `800 ${tamano}px "Arial Black", "Segoe UI", Arial, sans-serif`;
      // Si no entra en el marco, se achica.
      const ancho = ctx.measureText(texto).width;
      if (ancho > 860) ctx.font = `800 ${Math.floor((tamano * 860) / ancho)}px "Arial Black", "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // El tubo: un trazo ancho con halo y el núcleo fino más prendido.
      ctx.lineWidth = 11;
      ctx.shadowBlur = 26;
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.strokeText(texto, 512, y0 + 132);
      ctx.lineWidth = 4;
      ctx.shadowBlur = 6;
      ctx.strokeStyle = "#ffffff";
      ctx.strokeText(texto, 512, y0 + 132);
    };
    fila("A51", 0, 170);
    fila("WAS & PINKY", 256, 118);
  }
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

// ————————————————————————————— Estructuras —————————————————————————————

type TipoEstructura = "piramide" | "torre" | "rascacielos" | "cristales" | "hongo" | "monolito" | "antena" | "cartel" | "arco";

type Estructura = {
  /** Fila del piso donde está parada (0 = la del fondo). */
  fila: number;
  x: number;
  y: number;
  giro: number;
  inclinaX: number;
  inclinaZ: number;
  escala: number;
  alto: number;
  /** 0 = color A, 1 = color B, en el medio, la mezcla. */
  tono: number;
  fase: number;
  variante: number;
};

type Parte = {
  malla: THREE.InstancedMesh;
  /** Usa la transformación animada (el plato de la antena, la piedra de la pirámide). */
  anima: boolean;
  /** Se tiñe con la paleta (los acentos); el cuerpo no. */
  colorea: boolean;
  /** Solo se dibuja en las estructuras de esta variante (los dos carteles). */
  variante: number | null;
};

type DefEstructura = {
  capacidad: number;
  /** Distancia mínima al centro, en unidades del mundo (en un celu parado, un cuarto menos). */
  desdeX: number;
  /** Lo que ocupa en el piso a escala 1: para no encimar dos estructuras. */
  radio: number;
  escala: readonly [number, number];
  /** Estiramiento vertical: solo en lo que no tiene partes que giran adentro. */
  alto: readonly [number, number];
  inclina: number;
  /** "camino": mira un poco hacia el centro (carteles, arcos, antenas); "azar": para cualquier lado. */
  mira: "camino" | "azar";
  /** Cuántas variantes hay (los carteles: A51 o WAS & PINKY) y cuánto sale la primera. */
  variantes?: { cuantas: number; primera: number };
  animar?: (e: Estructura, t: number, local: THREE.Object3D) => void;
  partes: { geometria: THREE.BufferGeometry; material: THREE.Material; anima?: boolean; colorea?: boolean; variante?: number }[];
};

type Pool = { def: DefEstructura; partes: Parte[]; activas: Estructura[]; libres: Estructura[] };

// ————————————————————————————— Biomas —————————————————————————————

export type NombreBioma = "montanas" | "ciudad" | "dunas" | "canon" | "crateres";
export const BIOMAS: readonly NombreBioma[] = ["montanas", "ciudad", "dunas", "canon", "crateres"];

type Bioma = {
  nombre: NombreBioma;
  /** Altura de la columna c en la fila nueva. xn = 0 en el centro, 1 en el borde. */
  altura: (c: number, xn: number, banda: number, m: Musica, fila: number) => number;
  /** Se llama una vez por fila nueva, antes de las alturas (los cráteres nacen y se van acá). */
  antesDeFila?: (fila: number) => void;
  tinte: THREE.Color;
  pesoTinte: number;
  /** Peso de las líneas de columnas y de filas en la grilla. */
  lineas: readonly [number, number];
  /** Estructuras por fila nueva (en promedio). */
  densidad: number;
  estructuras: readonly (readonly [TipoEstructura, number])[];
  pesoTotal: number;
};

type Crater = { activo: boolean; c: number; f: number; radio: number; hondo: number };

export function crearTerreno(kit: Kit): Pieza & { cambiarBioma: (nombre?: NombreBioma) => void } {
  const geometria = new THREE.PlaneGeometry(ANCHO_TERRENO, LARGO_TERRENO, COLUMNAS - 1, FILAS - 1);
  geometria.rotateX(-Math.PI / 2);
  const posiciones = geometria.attributes.position as THREE.BufferAttribute;
  posiciones.setUsage(THREE.DynamicDrawUsage);
  // Fila 0 = la del fondo; la última = la más cercana a la cámara. Vértice = fila * COLUMNAS + columna.
  const alturas = new Float32Array(COLUMNAS * FILAS);
  const tintes = new Float32Array(COLUMNAS * FILAS * 4);
  const estilos = new Float32Array(COLUMNAS * FILAS * 2);
  const atributoTinte = new THREE.BufferAttribute(tintes, 4).setUsage(THREE.DynamicDrawUsage);
  const atributoEstilo = new THREE.BufferAttribute(estilos, 2).setUsage(THREE.DynamicDrawUsage);
  geometria.setAttribute("aTinte", atributoTinte);
  geometria.setAttribute("aEstilo", atributoEstilo);

  const material = crearMaterialTerreno();
  const piso = new THREE.Mesh(geometria, material);
  // Las alturas cambian: la esfera que three calcula al principio no sirve para recortar.
  piso.frustumCulled = false;
  const grupo = new THREE.Group();
  grupo.add(piso);
  const zBase = TUNEL_HASTA - 1 - LARGO_TERRENO / 2;
  grupo.position.set(0, -4.4, zBase);

  // ——— Biomas ———

  const crateres: Crater[] = Array.from({ length: 6 }, () => ({ activo: false, c: 0, f: 0, radio: 0, hondo: 0 }));

  const armar = (b: Omit<Bioma, "pesoTotal">): Bioma => ({ ...b, pesoTotal: b.estructuras.reduce((suma, [, peso]) => suma + peso, 0) });
  const biomas: Record<NombreBioma, Bioma> = {
    // El de siempre: camino plano al medio y montañas que crecen con el espectro hacia los costados.
    montanas: armar({
      nombre: "montanas",
      altura: (_c, xn, banda, m) => m.espectro[banda] * (0.15 + xn * xn * 5) + (Math.random() - 0.5) * 0.08 * xn,
      tinte: new THREE.Color(0xffffff),
      pesoTinte: 0,
      lineas: [1, 1],
      densidad: 0.4,
      estructuras: [
        ["piramide", 3],
        ["cristales", 2],
        ["antena", 2],
        ["monolito", 1],
        ["hongo", 1],
        ["cartel", 0.7],
        ["arco", 0.3],
      ],
    }),
    // Calle al medio y manzanas en terrazas a los costados, llenas de edificios.
    ciudad: armar({
      nombre: "ciudad",
      altura: (c, xn, banda, m, fila) =>
        xn < 0.2 ? m.espectro[banda] * 0.06 : 0.15 + hash(Math.floor(c / 4), Math.floor(fila / 7)) * 0.9 + m.espectro[banda] * 0.25 * xn,
      tinte: new THREE.Color(0x2de2ff),
      pesoTinte: 0.28,
      lineas: [1, 1],
      densidad: 1.3,
      estructuras: [
        ["torre", 6],
        ["rascacielos", 4],
        ["antena", 1.5],
        ["cartel", 1.2],
        ["monolito", 0.4],
        ["arco", 0.4],
      ],
    }),
    // Ondas suaves cruzadas; las filas nuevas salen más altas cuando suben los medios.
    dunas: armar({
      nombre: "dunas",
      altura: (c, xn, banda, m, fila) => {
        const ola = Math.sin(fila * 0.32 + c * 0.21) * 0.5 + 0.5;
        const ola2 = Math.sin(fila * 0.13 - c * 0.37 + 1.7) * 0.5 + 0.5;
        return (ola * 0.7 + ola2 * 0.5) * (0.4 + xn * 2.2) * (0.75 + m.medios * 0.6) + m.espectro[banda] * 0.3 * xn;
      },
      tinte: new THREE.Color(0xffb85a),
      pesoTinte: 0.3,
      // Casi solo las filas: se leen como curvas de nivel sobre la arena.
      lineas: [0.25, 1],
      densidad: 0.35,
      estructuras: [
        ["piramide", 5],
        ["monolito", 1.2],
        ["cristales", 0.8],
        ["cartel", 0.5],
        ["arco", 0.5],
      ],
    }),
    // Camino hundido entre dos paredes altas y rugosas.
    canon: armar({
      nombre: "canon",
      altura: (c, xn, banda, m, fila) => {
        const pared = THREE.MathUtils.smoothstep(xn, 0.26, 0.5);
        return -0.45 * (1 - pared) + pared * (2.6 + hash(c, Math.floor(fila / 2)) * 1.5 + m.espectro[banda] * 1.3) + (Math.random() - 0.5) * 0.35 * pared;
      },
      tinte: new THREE.Color(0xff4fd8),
      pesoTinte: 0.22,
      lineas: [1, 0.55],
      densidad: 0.55,
      estructuras: [
        ["cristales", 4],
        ["hongo", 2.5],
        ["monolito", 1],
        ["antena", 1],
      ],
    }),
    // Piso apenas movido con pozos redondos de borde levantado.
    crateres: armar({
      nombre: "crateres",
      antesDeFila: (fila) => {
        for (const cr of crateres) if (cr.activo && fila > cr.f + cr.radio / SEP_Z + 1) cr.activo = false;
        if (Math.random() > 0.14) return;
        const libre = crateres.find((cr) => !cr.activo);
        if (!libre) return;
        libre.activo = true;
        libre.radio = azar(2.6, 5.5);
        libre.c = Math.floor(azar(0, COLUMNAS));
        // El centro queda adelante: el pozo empieza por su borde.
        libre.f = fila + libre.radio / SEP_Z;
        libre.hondo = azar(0.7, 1.5);
      },
      altura: (c, xn, banda, m, fila) => {
        let h = m.espectro[banda] * 0.25 * (0.3 + xn) + (Math.random() - 0.5) * 0.06;
        for (const cr of crateres) {
          if (!cr.activo) continue;
          const dx = (c - cr.c) * SEP_X;
          const dz = (fila - cr.f) * SEP_Z;
          const d = Math.sqrt(dx * dx + dz * dz) / cr.radio;
          if (d < 1) h += -cr.hondo * (1 - d * d) + 0.45 * cr.hondo * d ** 4;
          else if (d < 1.8) h += 0.45 * cr.hondo * Math.exp(-(d - 1) * (d - 1) * 12);
        }
        return h;
      },
      tinte: new THREE.Color(0xa05bff),
      pesoTinte: 0.3,
      lineas: [0.8, 0.8],
      densidad: 0.45,
      estructuras: [
        ["hongo", 4],
        ["cristales", 3],
        ["antena", 2],
        ["monolito", 1],
        ["arco", 0.3],
      ],
    }),
  };

  let actual = biomas[elegir(BIOMAS)];
  let anterior = actual;
  let transicion = 1;
  let filaGlobal = 0;
  let reloj = 0;
  let ultimoCambio = -Infinity;
  let proximoCambio = -1;

  for (let i = 0; i < COLUMNAS * FILAS; i++) {
    tintes.set([actual.tinte.r, actual.tinte.g, actual.tinte.b, actual.pesoTinte], i * 4);
    estilos.set(actual.lineas, i * 2);
  }

  const cambiarBioma = (nombre?: NombreBioma) => {
    if (!nombre && reloj - ultimoCambio < CAMBIO_MINIMO) return;
    if (nombre === actual.nombre) return;
    const siguiente = nombre ?? elegir(BIOMAS.filter((b) => b !== actual.nombre));
    anterior = actual;
    actual = biomas[siguiente];
    transicion = 0;
    ultimoCambio = reloj;
    proximoCambio = reloj + azar(25, 45);
  };

  // ——— Estructuras ———

  // Dos materiales para todo: el cuerpo oscuro con luz de borde y los acentos que brillan.
  const materialCuerpo = conBorde(
    new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.55, roughness: 0.4, envMapIntensity: 0.8, side: THREE.DoubleSide }),
    kit.borde,
    0.7,
    2.6
  );
  const materialAcento = new THREE.MeshBasicMaterial({ vertexColors: true });
  const texturaCartel = crearTexturaCartel();
  const materialCartel = new THREE.MeshBasicMaterial({
    map: texturaCartel,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const materiales = [materialCuerpo, materialAcento, materialCartel];

  const piramide = geometriasPiramide();
  const torre = geometriasTorre();
  const rascacielos = geometriasRascacielos();
  const hongo = geometriasHongo();
  const monolito = geometriasMonolito();
  const antena = geometriasAntena();
  const cartel = geometriasCartel();
  const arco = geometriasArco();

  const defs: Record<TipoEstructura, DefEstructura> = {
    piramide: {
      capacidad: 24,
      desdeX: 4,
      radio: 1.5,
      escala: [0.8, 1.5],
      alto: [1, 1],
      inclina: 0,
      mira: "azar",
      // La piedra flota sobre la punta y gira despacio.
      animar: (e, t, local) => {
        local.position.set(0, 2.85 - HUNDE + Math.sin(t * 1.1 + e.fase) * 0.1, 0);
        local.rotation.set(0, t * 0.5 + e.fase, 0);
      },
      partes: [
        { geometria: piramide.cuerpo, material: materialCuerpo },
        { geometria: piramide.piedra, material: materialAcento, anima: true, colorea: true },
      ],
    },
    torre: {
      capacidad: 60,
      desdeX: 5,
      radio: 0.9,
      escala: [0.8, 1.3],
      alto: [0.7, 1.8],
      inclina: 0,
      mira: "azar",
      partes: [
        { geometria: torre.cuerpo, material: materialCuerpo },
        { geometria: torre.ventanas, material: materialAcento, colorea: true },
      ],
    },
    rascacielos: {
      capacidad: 40,
      desdeX: 6,
      radio: 0.95,
      escala: [0.8, 1.2],
      alto: [0.7, 1.5],
      inclina: 0,
      mira: "azar",
      partes: [
        { geometria: rascacielos.cuerpo, material: materialCuerpo },
        { geometria: rascacielos.acento, material: materialAcento, colorea: true },
      ],
    },
    cristales: {
      capacidad: 30,
      desdeX: 3,
      radio: 0.8,
      escala: [0.6, 1.3],
      alto: [0.8, 1.5],
      inclina: 0.15,
      mira: "azar",
      partes: [{ geometria: geometriaCristales(), material: materialAcento, colorea: true }],
    },
    hongo: {
      capacidad: 30,
      desdeX: 3,
      radio: 1.2,
      escala: [0.7, 1.4],
      alto: [1, 1],
      inclina: 0.05,
      mira: "azar",
      partes: [
        { geometria: hongo.pie, material: materialCuerpo },
        { geometria: hongo.sombrero, material: materialAcento, colorea: true },
      ],
    },
    monolito: {
      capacidad: 12,
      desdeX: 4,
      radio: 0.6,
      escala: [0.8, 1.4],
      alto: [1, 1],
      // Apenas torcido: inquieta más que derecho.
      inclina: 0.06,
      mira: "camino",
      partes: [
        { geometria: monolito.cuerpo, material: materialCuerpo },
        { geometria: monolito.costura, material: materialAcento, colorea: true },
      ],
    },
    antena: {
      capacidad: 14,
      desdeX: 5,
      radio: 1.2,
      escala: [0.8, 1.3],
      alto: [1, 1],
      inclina: 0,
      mira: "camino",
      // El plato barre el cielo de un lado a otro, despacio.
      animar: (e, t, local) => {
        local.position.set(0, ROTULA_Y, 0);
        local.rotation.set(0, Math.sin(t * 0.3 + e.fase) * 0.8, 0);
      },
      partes: [
        { geometria: antena.cuerpo, material: materialCuerpo },
        { geometria: antena.plato, material: materialCuerpo, anima: true },
        { geometria: antena.punta, material: materialAcento, anima: true, colorea: true },
      ],
    },
    cartel: {
      capacidad: 6,
      desdeX: 6,
      radio: 1.8,
      escala: [0.9, 1.2],
      alto: [1, 1],
      inclina: 0,
      mira: "camino",
      variantes: { cuantas: 2, primera: 0.65 },
      partes: [
        { geometria: cartel.cuerpo, material: materialCuerpo },
        { geometria: cartel.panelA51, material: materialCartel, colorea: true, variante: 0 },
        { geometria: cartel.panelWas, material: materialCartel, colorea: true, variante: 1 },
      ],
    },
    arco: {
      capacidad: 4,
      desdeX: 9,
      radio: 3.4,
      escala: [0.8, 1.1],
      alto: [1, 1],
      inclina: 0,
      mira: "camino",
      partes: [
        { geometria: arco.cuerpo, material: materialCuerpo },
        { geometria: arco.arcos, material: materialAcento, colorea: true },
      ],
    },
  };

  const estructuras = new THREE.Group();
  grupo.add(estructuras);
  const blanco = new THREE.Color(0xffffff);
  const pools = {} as Record<TipoEstructura, Pool>;
  for (const tipo of Object.keys(defs) as TipoEstructura[]) {
    const def = defs[tipo];
    const partes = def.partes.map((p) => {
      const malla = new THREE.InstancedMesh(p.geometria, p.material, def.capacidad);
      malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      if (p.colorea) {
        // El buffer de colores se crea acá, una vez, y no en el primer cuadro.
        malla.setColorAt(0, blanco);
        malla.instanceColor?.setUsage(THREE.DynamicDrawUsage);
      }
      // Las instancias se mueven: la esfera que three calcula al principio no sirve para recortar.
      malla.frustumCulled = false;
      malla.count = 0;
      malla.visible = false;
      estructuras.add(malla);
      return { malla, anima: !!p.anima, colorea: !!p.colorea, variante: p.variante ?? null };
    });
    const libres: Estructura[] = Array.from({ length: def.capacidad }, () => ({
      fila: 0,
      x: 0,
      y: 0,
      giro: 0,
      inclinaX: 0,
      inclinaZ: 0,
      escala: 1,
      alto: 1,
      tono: 0,
      fase: 0,
      variante: 0,
    }));
    pools[tipo] = { def, partes, activas: [], libres };
  }
  const listaPools = Object.values(pools);

  // Cuántas filas más está ocupada cada columna (para no encimar estructuras).
  const ocupacion = new Int16Array(COLUMNAS);

  const elegirTipo = (b: Bioma): TipoEstructura => {
    let r = Math.random() * b.pesoTotal;
    for (let i = 0; i < b.estructuras.length; i++) {
      r -= b.estructuras[i][1];
      if (r <= 0) return b.estructuras[i][0];
    }
    return b.estructuras[0][0];
  };

  const nacer = (b: Bioma, fila: number, aspecto: number) => {
    const pool = pools[elegirTipo(b)];
    const def = pool.def;
    const e = pool.libres.pop();
    if (!e) return;
    const maximo = anchoUtil(aspecto);
    const desde = def.desdeX * (aspecto < 0.8 ? 0.75 : 1);
    const escala = azar(def.escala[0], def.escala[1]) * (0.75 + 0.25 * escalaPorAspecto(aspecto));
    const lado = Math.random() < 0.5 ? -1 : 1;
    const c = THREE.MathUtils.clamp(Math.round((lado * azar(desde, Math.max(desde, maximo))) / SEP_X + MITAD), 1, COLUMNAS - 2);
    const kc = Math.ceil((def.radio * escala) / SEP_X);
    for (let k = Math.max(0, c - kc); k <= Math.min(COLUMNAS - 1, c + kc); k++) {
      if (ocupacion[k] > 0) {
        pool.libres.push(e);
        return;
      }
    }
    const kr = Math.ceil((def.radio * escala) / SEP_Z);
    for (let k = Math.max(0, c - kc); k <= Math.min(COLUMNAS - 1, c + kc); k++) ocupacion[k] = Math.max(ocupacion[k], kr * 2 + 1);

    // Parada sobre lo más bajo de alrededor: en una ladera queda enterrada de un lado, nunca flota.
    let y = Infinity;
    for (let f = fila; f <= Math.min(FILAS - 1, fila + 1); f++) {
      for (let dc = -1; dc <= 1; dc++) y = Math.min(y, alturas[f * COLUMNAS + c + dc]);
    }

    e.fila = fila;
    e.x = (c - MITAD) * SEP_X;
    e.y = y;
    // Lo que mira al camino gira hacia el centro: del lado izquierdo, hacia la derecha.
    e.giro = def.mira === "camino" ? -Math.sign(e.x) * azar(0.15, 0.5) : azar(0, Math.PI * 2);
    e.inclinaX = azar(-def.inclina, def.inclina);
    e.inclinaZ = azar(-def.inclina, def.inclina);
    e.escala = escala;
    e.alto = azar(def.alto[0], def.alto[1]);
    e.tono = Math.random() < 0.45 ? 0 : Math.random() < 0.8 ? 1 : 0.5;
    e.fase = azar(0, Math.PI * 2);
    e.variante = def.variantes ? (Math.random() < def.variantes.primera ? 0 : 1 + Math.floor(Math.random() * (def.variantes.cuantas - 1))) : 0;
    pool.activas.push(e);
  };

  /** Siembra las estructuras de una fila: con el bioma que entra, o el que se va si todavía se funden. */
  const sembrarFila = (fila: number, aspecto: number, energia: number) => {
    const b = transicion < 1 && Math.random() > transicion ? anterior : actual;
    const n = b.densidad * (0.8 + energia * 0.5);
    const cuantas = Math.floor(n) + (Math.random() < n - Math.floor(n) ? 1 : 0);
    for (let i = 0; i < cuantas; i++) nacer(b, fila, aspecto);
  };

  /** Todo avanza una fila; lo que pasó la cámara vuelve al pool. */
  const correrEstructuras = () => {
    for (let k = 0; k < COLUMNAS; k++) if (ocupacion[k] > 0) ocupacion[k]--;
    for (const pool of listaPools) {
      for (let i = pool.activas.length - 1; i >= 0; i--) {
        const e = pool.activas[i];
        e.fila++;
        if (e.fila < FILAS - 1) continue;
        // Sale sin correr a los demás: el último ocupa su lugar.
        const ultima = pool.activas.pop();
        if (ultima && ultima !== e) pool.activas[i] = ultima;
        pool.libres.push(e);
      }
    }
  };

  // Al arrancar el piso ya trae estructuras (todavía plano), así no se ve vacío los primeros segundos.
  const aspectoInicial = window.innerWidth / Math.max(1, window.innerHeight);
  for (let f = FILAS - 7; f >= 0; f--) {
    for (let k = 0; k < COLUMNAS; k++) if (ocupacion[k] > 0) ocupacion[k]--;
    sembrarFila(f, aspectoInicial, 0.3);
  }

  const tmpTinte = new THREE.Color();
  const generarFila = (m: Musica) => {
    filaGlobal++;
    if (transicion < 1) transicion = Math.min(1, transicion + 1 / FILAS_TRANSICION);
    const k = suave(transicion);
    const mezclando = k < 1 && anterior !== actual;
    actual.antesDeFila?.(filaGlobal);
    if (mezclando) anterior.antesDeFila?.(filaGlobal);
    for (let c = 0; c < COLUMNAS; c++) {
      const xn = Math.abs(c - MITAD) / MITAD;
      const banda = Math.min(BANDAS - 1, Math.floor(xn * BANDAS));
      const nueva = actual.altura(c, xn, banda, m, filaGlobal);
      alturas[c] = mezclando ? anterior.altura(c, xn, banda, m, filaGlobal) * (1 - k) + nueva * k : nueva;
    }
    const a = mezclando ? anterior : actual;
    tmpTinte.copy(a.tinte).lerp(actual.tinte, k);
    const peso = a.pesoTinte + (actual.pesoTinte - a.pesoTinte) * k;
    const lineaX = a.lineas[0] + (actual.lineas[0] - a.lineas[0]) * k;
    const lineaZ = a.lineas[1] + (actual.lineas[1] - a.lineas[1]) * k;
    for (let c = 0; c < COLUMNAS; c++) {
      tintes[c * 4] = tmpTinte.r;
      tintes[c * 4 + 1] = tmpTinte.g;
      tintes[c * 4 + 2] = tmpTinte.b;
      tintes[c * 4 + 3] = peso;
      estilos[c * 2] = lineaX;
      estilos[c * 2 + 1] = lineaZ;
    }
  };

  const base = new THREE.Object3D();
  const local = new THREE.Object3D();
  const animada = new THREE.Matrix4();
  const cero = new THREE.Matrix4().makeScale(0, 0, 0);
  const tmpColor = new THREE.Color();
  let avance = 0;

  return {
    obj: grupo,
    cambiarBioma,
    actualizar: (m) => {
      reloj = m.reloj;
      if (proximoCambio < 0) proximoCambio = reloj + azar(25, 45);
      if (reloj >= proximoCambio) {
        cambiarBioma();
        proximoCambio = reloj + azar(25, 45);
      }

      avance += (3 + m.energia * 22) * m.dt;
      let corrio = false;
      while (avance >= SEP_Z) {
        avance -= SEP_Z;
        alturas.copyWithin(COLUMNAS, 0, COLUMNAS * (FILAS - 1));
        tintes.copyWithin(COLUMNAS * 4, 0, COLUMNAS * 4 * (FILAS - 1));
        estilos.copyWithin(COLUMNAS * 2, 0, COLUMNAS * 2 * (FILAS - 1));
        generarFila(m);
        correrEstructuras();
        sembrarFila(0, m.aspecto, m.energia);
        corrio = true;
      }
      if (corrio) {
        for (let i = 0; i < alturas.length; i++) posiciones.setY(i, alturas[i]);
        posiciones.needsUpdate = true;
        atributoTinte.needsUpdate = true;
        atributoEstilo.needsUpdate = true;
      }
      grupo.position.z = zBase + avance;
      grupo.position.y = -4.4 - m.golpe * 0.15;
      material.uniforms.uColorA.value.copy(m.colorA).lerp(m.colorB, 0.15 + m.medios * 0.25);
      material.uniforms.uColorB.value.copy(m.colorB);
      material.uniforms.uFuerza.value = 0.42 + m.brillo * 0.2;
      // Los acentos siguen el brillo lento, nunca el bombo.
      materialAcento.color.setScalar(0.8 + m.brillo * 0.25);
      materialCartel.color.setScalar(0.7 + m.brillo * 0.25);

      for (const pool of listaPools) {
        const n = pool.activas.length;
        for (const parte of pool.partes) {
          parte.malla.count = n;
          parte.malla.visible = n > 0;
        }
        if (n === 0) continue;
        const animar = pool.def.animar;
        for (let i = 0; i < n; i++) {
          const e = pool.activas[i];
          base.position.set(e.x, e.y, -LARGO_TERRENO / 2 + e.fila * SEP_Z);
          base.rotation.set(e.inclinaX, e.giro, e.inclinaZ);
          base.scale.set(e.escala, e.escala * e.alto, e.escala);
          base.updateMatrix();
          if (animar) {
            animar(e, reloj, local);
            local.updateMatrix();
            animada.multiplyMatrices(base.matrix, local.matrix);
          }
          tmpColor.copy(m.colorA).lerp(m.colorB, e.tono);
          for (const parte of pool.partes) {
            const otraVariante = parte.variante !== null && parte.variante !== e.variante;
            parte.malla.setMatrixAt(i, otraVariante ? cero : parte.anima ? animada : base.matrix);
            if (parte.colorea) parte.malla.setColorAt(i, tmpColor);
          }
        }
        for (const parte of pool.partes) {
          parte.malla.instanceMatrix.needsUpdate = true;
          if (parte.malla.instanceColor) parte.malla.instanceColor.needsUpdate = true;
        }
      }
    },
    liberar: () => {
      geometria.dispose();
      material.dispose();
      for (const pool of listaPools) {
        for (const parte of pool.partes) {
          parte.malla.geometry.dispose();
          parte.malla.dispose();
        }
      }
      materiales.forEach((mat) => mat.dispose());
      texturaCartel.dispose();
    },
  };
}
