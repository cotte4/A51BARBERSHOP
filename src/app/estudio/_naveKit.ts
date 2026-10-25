import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { crearPelota, VERDE_3D } from "@/app/torneo/_pelota3d";
import type { ModeloNave } from "@/lib/estudio-naves";
// _naveFlota también importa de acá (cabeza del piloto, rayo): el ciclo es seguro porque ninguno de
// los dos usa al otro al cargarse, solo adentro de funciones.
import { crearNave, elegirModelo, vaivenDe, type MoldeNave, type Nave, type TinteNave, type Vaiven } from "./_naveFlota";
import { conBorde, crearTexturaAnillo, crearTexturaPlaneta, type ColorCompartido } from "./_naveMateriales";

// Los actores sueltos de la nave: ovnis, aliens, la pelota alien, planetas, ondas y chispas.
// Nacen al azar en los golpes del tema, viven unos segundos y se van. Las geometrías y los
// materiales se comparten en un "kit" que se crea una sola vez.

export { VERDE_3D };

export const ROSA_3D = 0xff4fd8;
export const FOV = 60;
export const CAMARA_Z = 10;

/**
 * Qué es un actor: decide cómo reacciona cuando lo tocan (ver _naveToque.ts). "efecto" = ondas y
 * chispas, que no se tocan.
 */
export type ClaseActor = "alien" | "ovni" | "pelota" | "planeta" | "vaca" | "satelite" | "cometa" | "portal" | "efecto";

export type Actor = {
  obj: THREE.Object3D;
  clase: ClaseActor;
  /**
   * Radio para tocarlo, en unidades del grupo (sin su escala): _Nave lo multiplica por `obj.scale.x`.
   * Medido desde `obj.position`. 0 = no se toca.
   */
  radio: number;
  nace: number;
  vida: number;
  /** p va de 0 a 1 a lo largo de la vida del actor. */
  mover: (p: number, t: number, graves: number) => void;
  /** Materiales propios del actor (los compartidos no van acá). */
  propios: THREE.Material[];
  /** Geometría propia, si la tiene. */
  geometria?: THREE.BufferGeometry;
  /** Lo demás que haya que soltar al irse (buffers de instancias). */
  liberar?: () => void;
  /** Lo que hace por su cuenta cuando lo tocan (festejar, saludar); el empujón lo pone _naveToque. */
  reaccionar?: (t: number) => void;
};

/**
 * A dónde mira la gente de la nave: el punto del dedo o del mouse, un poco adelante de la escena.
 * Lo actualiza _Nave.tsx cada cuadro; `activa` es false cuando no hay puntero.
 */
export type Mirada = { activa: boolean; punto: THREE.Vector3 };

/**
 * Lo que suena, para los actores sueltos (su `mover` no recibe la música). Es el mismo objeto
 * `Musica` de _Nave.tsx: la nodriza lo apunta en `kit.sonido` en cada cuadro. Con él las luces de
 * las naves hacen de ecualizador y la batalla de fondo dispara en los chasquidos.
 */
export type Sonido = { espectro: Float32Array; brillo: number; golpeAhora: boolean; chasquidoAhora: boolean };

const tmpMirada = new THREE.Vector3();

/** Giro (y) e inclinación (x) para que algo en `objeto` mire al punto de la mirada, con tope. */
export function anguloHacia(objeto: THREE.Object3D, mirada: Mirada, tope: number): [number, number] {
  objeto.updateWorldMatrix(true, false);
  const local = objeto.worldToLocal(tmpMirada.copy(mirada.punto));
  const giro = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -tope, tope);
  const inclinacion = THREE.MathUtils.clamp(-Math.atan2(local.y, Math.hypot(local.x, local.z)), -tope * 0.5, tope * 0.5);
  return [giro, inclinacion];
}

export type Kit = ReturnType<typeof crearKit>;

export const azar = (min: number, max: number) => min + Math.random() * (max - min);
export const elegir = <T,>(opciones: readonly T[]): T => opciones[Math.floor(Math.random() * opciones.length)];
export const suave = (x: number) => x * x * (3 - 2 * x);

// ————————————————————————————— Geometría del alien —————————————————————————————
// Un "grey": cráneo ancho, mentón angosto, ojos almendra enormes. La cabeza tiene el centro en el
// origen y mide ~2,4 de alto; el cuerpo cuelga abajo (los pies quedan en y ≈ -2,9).

const CRANEO = 1.12;
const MENTON = 1.32;
/** Donde el cuello entra en la cabeza: el pivote para cabecear. */
export const CUELLO_Y = -1.15;

/** Ancho de la cabeza según la altura en la esfera original (-1 abajo, 1 arriba). */
function anchoCabeza(y: number) {
  return y >= 0 ? 1 + 0.05 * Math.sin(y * Math.PI) : 1 - 0.6 * Math.pow(-y, 1.7);
}

/** Recalcula normales suaves sin la costura de la esfera (sus vértices duplicados). */
function suavizar(geometria: THREE.BufferGeometry): THREE.BufferGeometry {
  geometria.deleteAttribute("normal");
  geometria.deleteAttribute("uv");
  const unida = mergeVertices(geometria);
  geometria.dispose();
  unida.computeVertexNormals();
  return unida;
}

function crearGeometriaCabeza(): THREE.BufferGeometry {
  const esfera = new THREE.SphereGeometry(1, 48, 36);
  const posiciones = esfera.getAttribute("position");
  const v = new THREE.Vector3();
  for (let i = 0; i < posiciones.count; i++) {
    v.fromBufferAttribute(posiciones, i);
    const ancho = anchoCabeza(v.y);
    // Cara apenas aplanada adelante, nuca que sale para atrás arriba; el paso entre las dos es suave.
    const atras = THREE.MathUtils.smoothstep(-v.z, -0.25, 0.25);
    const nuca = 1 + 0.12 * THREE.MathUtils.smoothstep(v.y, -0.3, 0.6);
    const fondo = 0.9 + (nuca - 0.9) * atras;
    posiciones.setXYZ(i, v.x * ancho, v.y * (v.y > 0 ? CRANEO : MENTON), v.z * ancho * fondo);
  }
  return suavizar(esfera);
}

/** Ojo almendra: esfera con las puntas afinadas. */
function crearGeometriaOjo(): THREE.BufferGeometry {
  const esfera = new THREE.SphereGeometry(1, 32, 20);
  const posiciones = esfera.getAttribute("position");
  for (let i = 0; i < posiciones.count; i++) {
    const x = posiciones.getX(i);
    posiciones.setY(i, posiciones.getY(i) * (1 - 0.4 * x * x));
  }
  return suavizar(esfera);
}

const rayoGuia = new THREE.Raycaster();
const guiaOrigen = new THREE.Vector3();
const guiaHacia = new THREE.Vector3(0, 0, -1);

/** z de la superficie de una geometría vista de frente en (x, y): para apoyar cosas sobre la cara. */
function frenteDe(geometria: THREE.BufferGeometry, x: number, y: number): number {
  const malla = new THREE.Mesh(geometria);
  rayoGuia.set(guiaOrigen.set(x, y, 10), guiaHacia);
  return rayoGuia.intersectObject(malla)[0]?.point.z ?? 0;
}

export const OJO = { x: 0.37, y: -0.05, ancho: 0.36, alto: 0.21, hondo: 0.13, inclinacion: 0.42, giro: 0.45 };

function geometriasDeCara(cabeza: THREE.BufferGeometry) {
  const ojo = crearGeometriaOjo();
  const ojos: THREE.BufferGeometry[] = [];
  const brillos: THREE.BufferGeometry[] = [];
  const centroY = OJO.y;
  for (const lado of [-1, 1]) {
    const centro = new THREE.Vector3(lado * OJO.x, centroY, frenteDe(cabeza, lado * OJO.x, centroY) - 0.07);
    const giro = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, lado * OJO.giro, lado * OJO.inclinacion));
    const matriz = new THREE.Matrix4().compose(centro, giro, new THREE.Vector3(OJO.ancho, OJO.alto, OJO.hondo));
    const este = ojo.clone().applyMatrix4(matriz);
    ojos.push(este);
    // El reflejo de la luz va del mismo lado en los dos ojos (es una sola luz): arriba a la izquierda.
    for (const [dx, dy, radio] of [
      [-0.09, 0.06, 0.048],
      [0.07, -0.055, 0.022],
    ] as const) {
      const x = centro.x + dx;
      const y = centro.y + dy;
      const punto = new THREE.SphereGeometry(radio, 12, 8);
      punto.translate(x, y, frenteDe(este, x, y) - radio * 0.35);
      brillos.push(punto);
    }
  }
  ojo.dispose();

  // Boquita y dos narinas: casi nada, pero arman la cara.
  const boca = new THREE.CapsuleGeometry(0.02, 0.14, 3, 8);
  boca.rotateZ(Math.PI / 2);
  boca.scale(1, 1, 0.6);
  boca.translate(0, -0.82, frenteDe(cabeza, 0, -0.82) - 0.006);
  const narinas = [-1, 1].map((lado) => {
    const n = new THREE.SphereGeometry(0.022, 8, 6);
    n.scale(1, 0.6, 0.6);
    n.translate(lado * 0.055, -0.5, frenteDe(cabeza, lado * 0.055, -0.5) - 0.008);
    return n;
  });

  const unir = (partes: THREE.BufferGeometry[]) => {
    const unida = mergeGeometries(partes);
    partes.forEach((p) => p.dispose());
    return unida;
  };
  return { ojos: unir(ojos), brillos: unir(brillos), boca: unir([boca, ...narinas]) };
}

/** Antena derecha con la base en el origen; la izquierda es la misma girada media vuelta. */
function crearGeometriaAntena() {
  const curva = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0.42, 0), new THREE.Vector3(0.36, 0.72, 0));
  const tallo = new THREE.TubeGeometry(curva, 16, 0.028, 6, false);
  const bolita = new THREE.SphereGeometry(0.1, 16, 12);
  bolita.translate(0.36, 0.72, 0);
  return { tallo, bolita };
}

/** Brazo colgando desde el hombro (origen): flaco y largo, mano con tres dedos. */
function crearGeometriaBrazo(): THREE.BufferGeometry {
  const brazo = new THREE.CapsuleGeometry(0.062, 0.66, 4, 10);
  brazo.translate(0, -0.4, 0);
  const mano = new THREE.SphereGeometry(0.1, 14, 10);
  mano.scale(1, 1.1, 0.75);
  mano.translate(0, -0.86, 0);
  const dedos = [-0.45, 0, 0.45].map((angulo) => {
    const dedo = new THREE.CapsuleGeometry(0.022, 0.1, 3, 6);
    dedo.rotateZ(angulo);
    dedo.translate(Math.sin(angulo) * 0.07, -0.98 - Math.cos(angulo) * 0.02, 0);
    return dedo;
  });
  const partes = [brazo, mano, ...dedos];
  const unida = mergeGeometries(partes);
  partes.forEach((p) => p.dispose());
  return unida;
}

function crearGeometriaPierna(): THREE.BufferGeometry {
  const pierna = new THREE.CapsuleGeometry(0.08, 0.36, 4, 10);
  pierna.translate(0, -0.26, 0);
  const pie = new THREE.SphereGeometry(0.12, 14, 10);
  pie.scale(0.9, 0.55, 1.5);
  pie.translate(0, -0.58, 0.06);
  const unida = mergeGeometries([pierna, pie]);
  pierna.dispose();
  pie.dispose();
  return unida;
}

/** Torso con cuello (el traje), por torno: pecho angosto, panza de pera. Origen en el centro. */
function crearGeometriaCuerpo(): THREE.BufferGeometry {
  const v = (x: number, y: number) => new THREE.Vector2(x, y);
  const torso = new THREE.LatheGeometry(
    [v(0, -0.5), v(0.2, -0.48), v(0.3, -0.36), v(0.33, -0.14), v(0.3, 0.1), v(0.25, 0.3), v(0.15, 0.42), v(0.1, 0.5), v(0.09, 0.66), v(0, 0.68)],
    28
  );
  torso.scale(1, 1, 0.8);
  return torso;
}

/** Posiciones del cuerpo respecto del centro de la cabeza. */
export const CUERPO = { y: -1.82, hombroX: 0.29, hombroY: -1.52, caderaX: 0.14, caderaY: -2.24, collarY: -1.36 };

// ————————————————————————————— Geometría del ovni —————————————————————————————
// Platillo clásico por torno: la panza oscura con el motor, el borde filoso y el casco cromado
// con un escalón que agarra los reflejos. Arriba, la cúpula de vidrio con un piloto adentro.

const v2 = (x: number, y: number) => new THREE.Vector2(x, y);
/** Donde termina la panza del platillo: de ahí sale el rayo (la punta del cono queda acá). */
export const PANZA_Y = -0.34;

function crearGeometriasOvni() {
  const panza = new THREE.LatheGeometry(
    [v2(0, PANZA_Y), v2(0.3, PANZA_Y), v2(0.42, -0.3), v2(0.47, -0.23), v2(0.64, -0.2), v2(1.0, -0.15), v2(1.36, -0.08), v2(1.62, -0.005)],
    64
  );
  const casco = new THREE.LatheGeometry(
    [v2(1.62, -0.005), v2(1.6, 0.045), v2(1.44, 0.1), v2(1.16, 0.16), v2(1.08, 0.165), v2(1.04, 0.2), v2(0.82, 0.255), v2(0.64, 0.285), v2(0.58, 0.29)],
    64
  );
  const banda = new THREE.TorusGeometry(1.615, 0.04, 10, 96);
  banda.rotateX(Math.PI / 2);
  const motor = new THREE.TorusGeometry(0.4, 0.035, 8, 48);
  motor.rotateX(Math.PI / 2);
  motor.translate(0, -0.3, 0);
  const nucleo = new THREE.CircleGeometry(0.3, 32);
  nucleo.rotateX(Math.PI / 2);
  nucleo.translate(0, PANZA_Y - 0.004, 0);
  const cupula = new THREE.SphereGeometry(0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  cupula.translate(0, 0.27, 0);
  const luz = new THREE.SphereGeometry(0.05, 10, 8);
  const rayo = new THREE.ConeGeometry(1.15, 3.4, 32, 1, true);
  // La punta del cono queda pegada a la panza del ovni.
  rayo.translate(0, -1.7 + PANZA_Y, 0);
  return { panza, casco, banda, motor, nucleo, cupula, luz, rayo };
}

// ————————————————————————————— Kit —————————————————————————————

/** Geometrías y materiales que comparten todos los actores: se crean una vez. */
export function crearKit() {
  // El borde de todos los personajes sigue el color A de la paleta (lo actualiza _Nave.tsx).
  const borde: ColorCompartido = { value: new THREE.Color(VERDE_3D) };

  const casco = conBorde(new THREE.MeshStandardMaterial({ color: 0xc4ccd6, metalness: 0.9, roughness: 0.27, envMapIntensity: 0.85 }), borde, 0.35, 3);
  const panza = new THREE.MeshStandardMaterial({ color: 0x5b646f, metalness: 0.85, roughness: 0.38 });
  // La cúpula es vidrio: casi transparente, refleja el estudio y se le prende el borde.
  const cupula = conBorde(
    new THREE.MeshPhysicalMaterial({
      color: 0xc8ffe0,
      metalness: 0,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2,
      emissive: VERDE_3D,
      emissiveIntensity: 0.1,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    }),
    borde,
    1.1,
    2.2
  );
  const aroRosa = new THREE.MeshStandardMaterial({ color: 0x2a0a22, emissive: ROSA_3D, emissiveIntensity: 1.2 });
  const luz = new THREE.MeshBasicMaterial({ color: 0xfff6a8 });
  const motor = new THREE.MeshBasicMaterial({ color: VERDE_3D });

  const pielVerde = conBorde(new THREE.MeshStandardMaterial({ color: 0x46a82a, roughness: 0.5, emissive: 0x0b2406 }), borde, 0.6, 2.4);
  const pielRosa = conBorde(new THREE.MeshStandardMaterial({ color: 0xb8459f, roughness: 0.5, emissive: 0x26091d }), borde, 0.6, 2.4);
  const traje = conBorde(new THREE.MeshStandardMaterial({ color: 0x4a5466, metalness: 0.55, roughness: 0.3 }), borde, 0.9, 2.4);
  // Ojos mojados: negro con barniz, así reflejan el softbox del estudio.
  const ojo = new THREE.MeshPhysicalMaterial({ color: 0x010203, roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.6 });
  const brillo = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const boca = new THREE.MeshStandardMaterial({ color: 0x0b1608, roughness: 0.8 });

  const texturasPlaneta = [crearTexturaPlaneta(0x6a3bc4, 1.3), crearTexturaPlaneta(0x1aa89c, 4.1), crearTexturaPlaneta(0xd08a2e, 7.7)];
  const atmosferas = [0xb48cff, 0x7dfff0, 0xffd38a].map((c) => ({ value: new THREE.Color(c) }));
  const planetaMats = texturasPlaneta.map((textura, i) =>
    conBorde(new THREE.MeshStandardMaterial({ map: textura, emissiveMap: textura, emissive: 0xffffff, emissiveIntensity: 0.32, roughness: 0.85 }), atmosferas[i], 1.2, 3)
  );
  const texturaAnillo = crearTexturaAnillo();

  const cabeza = crearGeometriaCabeza();
  const cara = geometriasDeCara(cabeza);
  const antena = crearGeometriaAntena();
  const geo = {
    ...crearGeometriasOvni(),
    cabeza,
    ...cara,
    tallo: antena.tallo,
    bolita: antena.bolita,
    brazo: crearGeometriaBrazo(),
    pierna: crearGeometriaPierna(),
    cuerpo: crearGeometriaCuerpo(),
    collar: new THREE.TorusGeometry(0.12, 0.026, 8, 24).rotateX(Math.PI / 2),
    luzPecho: new THREE.SphereGeometry(0.05, 10, 8),
    planeta: new THREE.SphereGeometry(1, 48, 32),
    anillo: new THREE.RingGeometry(1.4, 2.1, 96),
    onda: new THREE.TorusGeometry(1, 0.035, 8, 96),
  };

  const pelota = crearPelota();
  const puntoRedondo = crearPuntoRedondo();
  const mirada: Mirada = { activa: false, punto: new THREE.Vector3() };
  // Las naves dominantes del tema que suena (las escribe _Nave.tsx con el mundo del tema): elegirModelo
  // sale de acá la mayoría de las veces.
  const flota: ModeloNave[] = ["platillo"];
  // Lo de la flota se arma la primera vez que hace falta (_naveFlota.ts) y queda para todas las naves.
  const moldes = new Map<ModeloNave, MoldeNave>();
  const tintes = new Map<number, TinteNave>();

  return {
    borde,
    casco,
    panza,
    cupula,
    aroRosa,
    luz,
    motor,
    pielVerde,
    pielRosa,
    traje,
    ojo,
    brillo,
    boca,
    planetaMats,
    texturasPlaneta,
    texturaAnillo,
    geo,
    pelota,
    puntoRedondo,
    mirada,
    flota,
    moldes,
    tintes,
    // Lo apunta la nodriza al objeto de la música en cada cuadro; null hasta el primero.
    sonido: null as Sonido | null,
  };
}

/** Sin textura, los puntos de three son cuadrados: esto los hace chispas redondas. */
function crearPuntoRedondo(): THREE.CanvasTexture {
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 32;
  const ctx = lienzo.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.8)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
  }
  return new THREE.CanvasTexture(lienzo);
}

export function liberarKit(kit: Kit) {
  kit.puntoRedondo.dispose();
  kit.texturaAnillo.dispose();
  kit.texturasPlaneta.forEach((t) => t.dispose());
  Object.values(kit.geo).forEach((g) => g.dispose());
  [kit.casco, kit.panza, kit.cupula, kit.aroRosa, kit.luz, kit.motor, kit.pielVerde, kit.pielRosa, kit.traje, kit.ojo, kit.brillo, kit.boca, ...kit.planetaMats].forEach(
    (m) => m.dispose()
  );
  kit.moldes.forEach((molde) => molde.propias.forEach((g) => g.dispose()));
  kit.moldes.clear();
  kit.tintes.forEach((tinte) => {
    tinte.aro.dispose();
    tinte.luz.dispose();
  });
  kit.tintes.clear();
  kit.pelota.grupo.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
    }
  });
}

// ————————————————————————————— Ovni —————————————————————————————
// Las naves viven en _naveFlota.ts (seis modelos de la misma familia). El ovni de siempre es el
// platillo: crearOvni queda para los que no eligen modelo. Los del show salen de la flota del tema
// (elegirModelo) y vuelan cada uno a su manera (vaivenDe + orientarNave).

/**
 * El rayo tractor: más fuerte pegado al ovni, con los bordes más prendidos que el centro (se lee
 * como un volumen, no como un cono) y franjas suaves que bajan despacio (< 1 por segundo, bajo
 * contraste: no es un destello).
 */
export function crearMaterialRayo() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(VERDE_3D) },
      uOpacidad: { value: 0.2 },
      uTiempo: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vVista;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vVista = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacidad;
      uniform float uTiempo;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vVista;
      void main() {
        // En el cono, uv.y = 1 es la punta (pegada al ovni) y 0 la base, abajo.
        float fuerza = pow(max(vUv.y, 0.0), 1.4);
        // max(0): por redondeo el dot puede pasar de 1, y la potencia de un negativo es NaN. Un solo
        // píxel NaN el bloom lo desparrama y el cuadro sale entero en negro (un parpadeo).
        float borde = 0.35 + 0.65 * pow(max(0.0, 1.0 - abs(dot(normalize(vNormal), vVista))), 1.5);
        float franjas = 0.82 + 0.18 * sin(vUv.y * 38.0 + uTiempo * 2.4);
        gl_FragColor = vec4(uColor * fuerza * borde * franjas * uOpacidad, 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

export type Ovni = Nave;

export function crearOvni(kit: Kit): Nave {
  return crearNave(kit, "platillo");
}

/** El cigarro y el triángulo tienen la nariz en +x: miran para donde van. Las demás son redondas. */
export function tieneNariz(modelo: ModeloNave): boolean {
  return modelo === "cigarro" || modelo === "triangulo";
}

/**
 * Orienta una nave de la flota que va hacia `rumbo` (1 = +x, -1 = -x) y le suma los giros de su
 * vaivén (ya calculado con vaivenDe). Las de nariz se dan vuelta para mirar a donde van y el vaivén
 * les sube y baja la nariz; las redondas se inclinan `banco` (radianes, con signo). rotation.x no se
 * toca: cada uno la pone para mostrar el techo.
 */
export function orientarNave(grupo: THREE.Object3D, modelo: ModeloNave, rumbo: number, banco: number, vaiven: Vaiven) {
  if (tieneNariz(modelo)) {
    grupo.rotation.y = (rumbo < 0 ? Math.PI : 0) + vaiven.giroY;
    grupo.rotation.z = vaiven.giroZ;
  } else {
    grupo.rotation.y = vaiven.giroY;
    grupo.rotation.z = banco + vaiven.giroZ;
  }
}

export const nuevoVaiven = (): Vaiven => ({ x: 0, y: 0, giroY: 0, giroZ: 0 });

// ————————————————————————————— Alien —————————————————————————————

export function crearCabezaAlien(kit: Kit, piel: THREE.Material) {
  const grupo = new THREE.Group();
  const g = kit.geo;
  grupo.add(new THREE.Mesh(g.cabeza, piel), new THREE.Mesh(g.boca, kit.boca));
  // Los ojos van en su propio grupo, a la altura de los ojos: así el parpadeo los aplasta en el lugar.
  const ojos = new THREE.Group();
  ojos.position.y = OJO.y;
  const malla = new THREE.Mesh(g.ojos, kit.ojo);
  const brillos = new THREE.Mesh(g.brillos, kit.brillo);
  malla.position.y = brillos.position.y = -OJO.y;
  ojos.add(malla, brillos);
  grupo.add(ojos);

  let proximoParpadeo = azar(0.5, 3);
  return {
    grupo,
    animar: (t: number) => {
      const k = (t - proximoParpadeo) / 0.16;
      if (k > 1) proximoParpadeo = t + azar(1.8, 4.5);
      ojos.scale.y = k >= 0 && k <= 1 ? 1 - 0.9 * Math.sin(k * Math.PI) : 1;
    },
  };
}

type Pose = {
  /** 0..1: cuánto levanta el brazo derecho para saludar. */
  saluda?: number;
  /** 0..1: brazos abiertos y piernas que patalean, como nadando en gravedad cero. */
  nada?: number;
  /** 0..1: los dos brazos arriba sacudiéndose (cuando lo tocan). */
  festeja?: number;
  /** Gira la cabeza hacia el dedo o el mouse (kit.mirada). */
  mira?: boolean;
  /** Graves suavizados: cabeceo y antenas al ritmo. */
  ritmo: number;
};

export function crearAlien(kit: Kit) {
  const grupo = new THREE.Group();
  const g = kit.geo;
  const piel = Math.random() < 0.7 ? kit.pielVerde : kit.pielRosa;

  // Cabeza con pivote en el cuello, para cabecear.
  const cuello = new THREE.Group();
  cuello.position.y = CUELLO_Y;
  const cabeza = crearCabezaAlien(kit, piel);
  cabeza.grupo.position.y = -CUELLO_Y;
  cuello.add(cabeza.grupo);
  const antenas = [-1, 1].map((lado) => {
    const antena = new THREE.Group();
    antena.position.set(lado * 0.3, 1.03, -0.05);
    if (lado < 0) antena.rotation.y = Math.PI;
    antena.add(new THREE.Mesh(g.tallo, piel), new THREE.Mesh(g.bolita, kit.aroRosa));
    cabeza.grupo.add(antena);
    return antena;
  });
  grupo.add(cuello);

  const cuerpo = new THREE.Mesh(g.cuerpo, kit.traje);
  cuerpo.position.y = CUERPO.y;
  const collar = new THREE.Mesh(g.collar, kit.aroRosa);
  collar.position.y = CUERPO.collarY;
  const pecho = new THREE.Mesh(g.luzPecho, kit.motor);
  pecho.position.set(0, -1.72, 0.235);
  grupo.add(cuerpo, collar, pecho);

  const brazos = [-1, 1].map((lado) => {
    const hombro = new THREE.Group();
    hombro.position.set(lado * CUERPO.hombroX, CUERPO.hombroY, 0);
    hombro.add(new THREE.Mesh(g.brazo, piel));
    grupo.add(hombro);
    return hombro;
  });
  const piernas = [-1, 1].map((lado) => {
    const cadera = new THREE.Group();
    cadera.position.set(lado * CUERPO.caderaX, CUERPO.caderaY, 0);
    cadera.add(new THREE.Mesh(g.pierna, kit.traje));
    grupo.add(cadera);
    return cadera;
  });

  const fase = Math.random() * Math.PI * 2;
  // Hacia dónde mira, suavizado: la cabeza sigue al dedo sin saltos.
  let giro = 0;
  let inclinacion = 0;
  return {
    grupo,
    animar: (t: number, pose: Pose) => {
      cabeza.animar(t);
      const { saluda = 0, nada = 0, festeja = 0, mira = false, ritmo } = pose;
      const [metaGiro, metaInclinacion] = mira && kit.mirada.activa ? anguloHacia(grupo, kit.mirada, 0.9) : [0, 0];
      giro += (metaGiro - giro) * 0.1;
      inclinacion += (metaInclinacion - inclinacion) * 0.1;
      cuello.rotation.y = giro;
      cuello.rotation.x = -0.05 + inclinacion + ritmo * 0.25 * Math.abs(Math.sin(t * 4.6 + fase));
      cuello.rotation.z = Math.sin(t * 1.7 + fase) * 0.08;
      // Las antenas se balancean con un poco de retraso: parecen blandas.
      antenas.forEach((a, i) => {
        a.rotation.z = -0.1 + Math.sin(t * 5 + fase + i * 1.3) * 0.09 + ritmo * 0.12;
      });
      // Brazo derecho (lado +1): ángulo positivo = sube por afuera. El izquierdo, al revés.
      const vaiven = Math.sin(t * 2 + fase);
      const sacudida = festeja * (2.6 + Math.sin(t * 14) * 0.3);
      const derecho = 0.15 + vaiven * 0.04 + saluda * (2.45 + Math.sin(t * 9) * 0.35) + nada * (1.05 + Math.sin(t * 2.2 + fase) * 0.3);
      const izquierdo = 0.15 - vaiven * 0.04 + nada * (1.05 + Math.sin(t * 2.2 + fase + 1) * 0.3);
      // Festejar manda sobre lo demás: los dos brazos arriba.
      brazos[1].rotation.z = derecho + (sacudida - derecho) * festeja;
      brazos[0].rotation.z = -(izquierdo + (sacudida - izquierdo) * festeja);
      piernas.forEach((p, i) => {
        p.rotation.x = nada * Math.sin(t * 2.4 + fase + i * Math.PI) * 0.4;
        p.rotation.z = (i === 0 ? -1 : 1) * nada * 0.15;
      });
    },
  };
}

/** Medio ancho y medio alto visibles a una profundidad z. */
export function mitadVisible(z: number, aspecto: number) {
  const alto = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * (CAMARA_Z - z);
  return { x: alto * aspecto, y: alto };
}

/** 0..1..0 durante 1,2 s después de que lo tocaron: entra y sale suave. */
function festejoDesde(desde: number, t: number) {
  const k = (t - desde) / 1.2;
  return k < 0 || k > 1 ? 0 : suave(Math.min(1, k / 0.15, (1 - k) / 0.25));
}

export function nacerActor(tipo: string, kit: Kit, t: number, aspecto: number): Actor {
  switch (tipo) {
    case "ovni-cruza": {
      // Una nave de la flota del tema (o cualquiera, a veces) cruza la pantalla con su forma de volar.
      const nave = crearNave(kit, elegirModelo(kit));
      const { grupo, matRayo } = nave;
      const z = azar(-5, 1);
      const m = mitadVisible(z, aspecto);
      const desde = Math.random() < 0.5 ? -1 : 1;
      const rumbo = -desde;
      const y0 = azar(-m.y * 0.3, m.y * 0.7);
      const escala = azar(0.55, 0.95);
      const fase = Math.random() * Math.PI * 2;
      const vaiven = nuevoVaiven();
      grupo.position.z = z;
      grupo.scale.setScalar(escala);
      return {
        obj: grupo,
        clase: "ovni",
        radio: nave.alcance + 0.05,
        nace: t,
        vida: azar(4.5, 7),
        propios: [matRayo],
        liberar: nave.liberar,
        mover: (p, tt, g) => {
          vaivenDe(nave.modelo, tt, fase, vaiven);
          grupo.position.x = desde * (m.x + 3) * (1 - 2 * p) + rumbo * vaiven.x * escala;
          grupo.position.y = y0 + Math.sin(p * Math.PI * 3) * 0.6 + vaiven.y * escala;
          // Las redondas se inclinan hacia donde van, como un platillo de verdad; las de nariz miran para allá.
          orientarNave(grupo, nave.modelo, rumbo, -desde * 0.25, vaiven);
          grupo.rotation.x = 0.18;
          nave.animar(tt, kit.sonido?.espectro);
          matRayo.uniforms.uOpacidad.value = 0.05 + g * 0.35;
        },
      };
    }
    case "ovni-baja": {
      const nave = crearNave(kit, elegirModelo(kit));
      const { grupo, matRayo } = nave;
      const z = azar(-3, 0);
      const m = mitadVisible(z, aspecto);
      const x = azar(-m.x * 0.6, m.x * 0.6);
      const escala = azar(0.6, 0.8);
      // Quieta no va a ningún lado: las de nariz miran para un costado cualquiera.
      const rumbo = Math.random() < 0.5 ? -1 : 1;
      const fase = Math.random() * Math.PI * 2;
      const vaiven = nuevoVaiven();
      grupo.position.set(x, m.y + 3, z);
      grupo.scale.setScalar(escala);
      return {
        obj: grupo,
        clase: "ovni",
        radio: nave.alcance + 0.05,
        nace: t,
        vida: azar(5, 7),
        propios: [matRayo],
        liberar: nave.liberar,
        mover: (p, tt, g) => {
          // Baja, se queda abduciendo y se va disparado para arriba. El vaivén va a medias: el rayo
          // tiene que quedar más o menos en el mismo lugar.
          vaivenDe(nave.modelo, tt, fase, vaiven);
          const arriba = m.y + 3;
          const quieto = m.y * 0.35;
          grupo.position.y =
            (p < 0.2 ? arriba + (quieto - arriba) * suave(p / 0.2) : p < 0.8 ? quieto + Math.sin(tt * 2) * 0.15 : quieto + (arriba + 6 - quieto) * suave((p - 0.8) / 0.2)) +
            vaiven.y * escala * 0.5;
          grupo.position.x = x + Math.sin(tt * 1.3) * 0.3 + vaiven.x * escala * 0.5;
          orientarNave(grupo, nave.modelo, rumbo, 0, vaiven);
          grupo.rotation.x = 0.12;
          nave.animar(tt, kit.sonido?.espectro);
          // El rayo prende y apaga con fundido (~0,4 s), nunca de un cuadro al otro.
          const abduciendo = p < 0.18 ? 0 : p < 0.26 ? suave((p - 0.18) / 0.08) : p < 0.74 ? 1 : p < 0.82 ? 1 - suave((p - 0.74) / 0.08) : 0;
          matRayo.uniforms.uOpacidad.value = abduciendo * (0.12 + g * 0.5);
        },
      };
    }
    case "alien-asoma": {
      const alien = crearAlien(kit);
      const grupo = alien.grupo;
      const z = azar(-2, 0.5);
      const m = mitadVisible(z, aspecto);
      const x = azar(-m.x * 0.75, m.x * 0.75);
      const escala = azar(0.6, 0.85);
      // Escondido abajo (antenas incluidas) y asomado por encima de la rave y de la barra del player.
      const oculto = -m.y - 2.1 * escala;
      const asomado = -m.y * 0.38;
      grupo.position.set(x, oculto, z);
      grupo.scale.setScalar(escala);
      let festejo = -10;
      return {
        obj: grupo,
        clase: "alien",
        radio: 1.5,
        nace: t,
        vida: azar(3.5, 5),
        propios: [],
        reaccionar: (tt) => {
          festejo = tt;
        },
        mover: (p, tt, g) => {
          // Asoma desde abajo, saluda al ritmo y se vuelve a esconder. Si hay dedo, lo mira.
          const sube = p < 0.22 ? suave(p / 0.22) : p > 0.78 ? 1 - suave((p - 0.78) / 0.22) : 1;
          grupo.position.y = oculto + sube * (asomado - oculto);
          grupo.rotation.y = Math.sin(tt * 1.5) * (kit.mirada.activa ? 0.1 : 0.35);
          grupo.rotation.z = Math.sin(tt * 4) * 0.06;
          grupo.scale.setScalar(escala * (1 + g * 0.06));
          const saluda = p > 0.2 && p < 0.8 ? suave(Math.min(1, (p - 0.2) / 0.12, (0.8 - p) / 0.12)) : 0;
          alien.animar(tt, { saluda, festeja: festejoDesde(festejo, tt), mira: true, ritmo: g });
        },
      };
    }
    case "alien-flota": {
      const alien = crearAlien(kit);
      const grupo = alien.grupo;
      const z = azar(-6, -1);
      const m = mitadVisible(z, aspecto);
      const desde = Math.random() < 0.5 ? -1 : 1;
      const y0 = azar(-m.y * 0.5, m.y * 0.6);
      const giro = azar(0.5, 1.1) * (Math.random() < 0.5 ? -1 : 1);
      let festejo = -10;
      return {
        obj: grupo,
        clase: "alien",
        radio: 1.8,
        nace: t,
        vida: azar(6, 9),
        propios: [],
        reaccionar: (tt) => {
          festejo = tt;
        },
        mover: (p, tt, g) => {
          // Gravedad cero: cruza dando vueltas, nadando.
          grupo.position.set(desde * (m.x + 2.5) * (1 - 2 * p), y0 + Math.sin(tt) * 0.8, z);
          grupo.rotation.set(Math.sin(tt * 0.6) * 0.6, tt * giro * 0.8, tt * giro * 0.5);
          grupo.scale.setScalar(0.46 + g * 0.05);
          const festeja = festejoDesde(festejo, tt);
          alien.animar(tt, { nada: 1 - festeja, festeja, ritmo: g });
        },
      };
    }
    case "pelota": {
      const grupo = kit.pelota.grupo.clone();
      const z = azar(-3, 2);
      const m = mitadVisible(z, aspecto);
      const desde = Math.random() < 0.5 ? -1 : 1;
      const altura = azar(m.y * 0.4, m.y * 1.1);
      grupo.scale.setScalar(azar(0.5, 0.9));
      return {
        obj: grupo,
        clase: "pelota",
        radio: 1.05,
        nace: t,
        vida: azar(2.5, 3.5),
        propios: [],
        mover: (p, tt) => {
          // Tiro en parábola, girando fuerte.
          grupo.position.set(desde * (m.x + 1.5) * (1 - 2 * p), -m.y - 1 + Math.sin(p * Math.PI) * (altura + m.y + 1), z);
          grupo.rotation.set(tt * 5, tt * 7, 0);
        },
      };
    }
    case "planeta": {
      const grupo = new THREE.Group();
      const mat = elegir(kit.planetaMats);
      const esfera = new THREE.Mesh(kit.geo.planeta, mat);
      esfera.rotation.z = azar(-0.4, 0.4);
      const matAnillo = new THREE.MeshBasicMaterial({ map: kit.texturaAnillo, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
      const anillo = new THREE.Mesh(kit.geo.anillo, matAnillo);
      anillo.rotation.x = Math.PI / 2.4;
      grupo.add(esfera);
      if (Math.random() < 0.7) grupo.add(anillo);
      const z = -20;
      const m = mitadVisible(z, aspecto);
      const desde = Math.random() < 0.5 ? -1 : 1;
      // Bien arriba o bien abajo: que no tape el centro.
      const y = (Math.random() < 0.5 ? -1 : 1) * azar(m.y * 0.45, m.y * 0.8);
      grupo.scale.setScalar(azar(1.4, 2.2));
      return {
        obj: grupo,
        clase: "planeta",
        radio: 1.1,
        nace: t,
        vida: azar(14, 20),
        propios: [matAnillo],
        mover: (p, tt) => {
          grupo.position.set(desde * (m.x + 5) * (1 - 2 * p), y, z);
          anillo.rotation.z = tt * 0.05;
          esfera.rotation.y = tt * 0.2;
        },
      };
    }
    case "chispas": {
      // Explosión de chispas desde el centro en los bombos fuertes.
      const cantidad = 70;
      const posiciones = new Float32Array(cantidad * 3);
      const direcciones = Array.from({ length: cantidad }, () =>
        new THREE.Vector3(azar(-1, 1), azar(-1, 1), azar(-0.4, 0.6)).normalize().multiplyScalar(azar(3, 9))
      );
      const geometria = new THREE.BufferGeometry();
      geometria.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
      const mat = new THREE.PointsMaterial({
        color: elegir([VERDE_3D, ROSA_3D, 0xfff6a8]),
        size: 0.32,
        map: kit.puntoRedondo,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const puntos = new THREE.Points(geometria, mat);
      puntos.position.z = -1;
      return {
        obj: puntos,
        clase: "efecto",
        radio: 0,
        nace: t,
        vida: 1.1,
        propios: [mat],
        geometria,
        mover: (p) => {
          const avance = 1 - (1 - p) * (1 - p);
          direcciones.forEach((d, i) => posiciones.set([d.x * avance, d.y * avance, d.z * avance], i * 3));
          geometria.attributes.position.needsUpdate = true;
          mat.opacity = 0.7 * (1 - p);
        },
      };
    }
    default: {
      // Onda: un anillo que sale del centro en los bombos fuertes.
      const mat = new THREE.MeshBasicMaterial({ color: elegir([VERDE_3D, ROSA_3D]), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
      const onda = new THREE.Mesh(kit.geo.onda, mat);
      onda.position.z = -2;
      return {
        obj: onda,
        clase: "efecto",
        radio: 0,
        nace: t,
        vida: 1.3,
        propios: [mat],
        mover: (p) => {
          onda.scale.setScalar(0.6 + p * 9);
          mat.opacity = 0.45 * (1 - p);
        },
      };
    }
  }
}

export const TIPOS_GOLPE = ["ovni-cruza", "ovni-baja", "alien-asoma", "alien-asoma", "alien-flota", "pelota"] as const;

/** Estrellas redondas en dos tamaños (la mayoría chicas, unas pocas grandes): da profundidad. */
export function crearEstrellas(cantidad: number, textura: THREE.Texture) {
  const posiciones = new Float32Array(cantidad * 3);
  const colores = new Float32Array(cantidad * 3);
  const tamanos = new Float32Array(cantidad);
  const verde = new THREE.Color(VERDE_3D);
  const blanco = new THREE.Color(0xffffff);
  const fria = new THREE.Color(0xbfe0ff);
  for (let i = 0; i < cantidad; i++) {
    posiciones[i * 3] = azar(-40, 40);
    posiciones[i * 3 + 1] = azar(-25, 25);
    posiciones[i * 3 + 2] = azar(-60, CAMARA_Z);
    const r = Math.random();
    const c = r < 0.18 ? verde : r < 0.4 ? fria : blanco;
    colores.set([c.r, c.g, c.b], i * 3);
    tamanos[i] = Math.random() < 0.12 ? azar(1.8, 2.6) : azar(0.7, 1.1);
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
  geometria.setAttribute("color", new THREE.BufferAttribute(colores, 3));
  geometria.setAttribute("aTamano", new THREE.BufferAttribute(tamanos, 1));
  const material = new THREE.PointsMaterial({ size: 0.13, map: textura, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
  // PointsMaterial no trae tamaño por punto: se lo agrega leyendo el atributo aTamano.
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aTamano;")
      .replace("gl_PointSize = size;", "gl_PointSize = size * aTamano;");
  };
  material.customProgramCacheKey = () => "estrellas-tamano";
  return { puntos: new THREE.Points(geometria, material), posiciones, geometria };
}

export function crearHalo(): THREE.Sprite {
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 256;
  const ctx = lienzo.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, "rgba(140,255,89,0.5)");
    grad.addColorStop(0.4, "rgba(140,255,89,0.12)");
    grad.addColorStop(1, "rgba(140,255,89,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const material = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lienzo), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.position.z = -8;
  return sprite;
}
