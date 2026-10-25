import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { COLOR_NAVE, crearNave, elegirModelo, vaivenDe, type Nave, type Vaiven } from "./_naveFlota";
import {
  azar,
  CAMARA_Z,
  crearAlien,
  CUERPO,
  elegir,
  FOV,
  nuevoVaiven,
  orientarNave,
  ROSA_3D,
  suave,
  tieneNariz,
  VERDE_3D,
  type Actor,
  type Kit,
} from "./_naveKit";
import { conBorde } from "./_naveMateriales";
import type { Pieza } from "./_naveShow";

// Lo que pasa a los costados de la nodriza: escenas sueltas que entran por un lado, hacen lo suyo
// unos segundos y se van (cometa, portal, escuadrón, satélite, la vaca abducida, estrellas fugaces,
// el alien con jetpack y una batalla lejana de naves que se tiran láseres en los chasquidos), la
// nebulosa del fondo, que cambia despacio con la paleta, y la formación del drop (navecitas que
// dibujan "51" o una "A" en el cielo).
// Las naves salen de la flota del tema (elegirModelo) y vuelan cada una a su manera (vaivenDe), con
// las luces de ecualizador (kit.sonido).
// Mismas reglas que el resto de la nave: nada parpadea ni prende de golpe (todo entra y sale con
// fundido) y nada se crea por cuadro: lo que cada escena necesita se arma al nacer.

export const TIPOS_COSTADO = ["cometa", "portal", "escuadron", "satelite", "vaca", "fugaces", "jetpack", "batalla"] as const;
export type TipoCostado = (typeof TIPOS_COSTADO)[number];

/** Para sortear con `elegir`: lo liviano sale más seguido que lo grande. */
export const SORTEO_COSTADO: readonly TipoCostado[] = [
  "cometa",
  "cometa",
  "fugaces",
  "fugaces",
  "portal",
  "portal",
  "escuadron",
  "satelite",
  "vaca",
  "jetpack",
  "jetpack",
  "batalla",
  "batalla",
];

/** Las que traen naves completas o un alien: van de a pocas a la vez (el tope lo pone _Nave.tsx). */
export const ESCENAS_GRANDES: readonly TipoCostado[] = ["portal", "escuadron", "satelite", "vaca", "jetpack", "batalla"];

const BLANCO = new THREE.Color(0xffffff);
const tmpColor = new THREE.Color();
const TAN_MEDIO = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

// Sin rojos: son los que más riesgo tienen en destellos.
const COLORES_COMETA = [0xbfe9ff, VERDE_3D, 0x2de2ff, 0xa05bff, ROSA_3D, 0xfff6a8];
const COLORES_PORTAL = [VERDE_3D, ROSA_3D, 0x2de2ff, 0xa05bff];

/** Medio alto visible a la profundidad z. Igual que mitadVisible, pero sin armar un objeto: se usa por cuadro. */
function medioAlto(z: number) {
  return TAN_MEDIO * (CAMARA_Z - z);
}

/** Lo grande se achica en un celu parado, pero menos que la nodriza: si no, no se lee. */
function escalaCostado(aspecto: number) {
  return THREE.MathUtils.clamp(aspecto / 0.85, 0.7, 1);
}

/**
 * Hasta qué fracción del medio ancho de la pantalla llega la nodriza con su anillo (x = 0, z = -6,
 * radio 3,6 por su escala). Lo de los costados va de ahí para afuera: ~0,3 en la compu, ~0,6 en un
 * celu parado.
 */
function bordeNodriza(aspecto: number) {
  const escala = THREE.MathUtils.clamp(aspecto / 0.85, 0.5, 1);
  return THREE.MathUtils.clamp(((3.6 + 1.2) * escala) / (medioAlto(-6) * aspecto), 0.25, 0.8);
}

/** Una fracción del medio ancho, al azar, dentro de la franja del costado. */
function franja(aspecto: number, hasta = 0.95) {
  const desde = bordeNodriza(aspecto) + 0.08;
  return azar(desde, Math.max(desde + 0.04, hasta));
}

/** 0 → 1 → 0 a lo largo de la vida: entra en la fracción `entrada` y sale en la `salida`, sin cortes. */
function fundido(p: number, entrada: number, salida: number) {
  if (p < entrada) return suave(p / entrada);
  if (p > 1 - salida) return suave(Math.max(0, 1 - p) / salida);
  return 1;
}

function lienzo(ancho: number, alto: number) {
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  return { canvas, ctx: canvas.getContext("2d") };
}

/** Puntos redondos con tamaño propio por punto (atributo aTamano), como las estrellas. */
function materialPuntos(textura: THREE.Texture, tamano: number) {
  const material = new THREE.PointsMaterial({
    size: tamano,
    map: textura,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aTamano;")
      .replace("gl_PointSize = size;", "gl_PointSize = size * aTamano;");
  };
  material.customProgramCacheKey = () => "escenas-tamano";
  return material;
}

// ————————————————————————————— Cometa —————————————————————————————

function nacerCometa(kit: Kit, t: number, aspecto: number, lado: number): Actor {
  const grupo = new THREE.Group();
  const color = new THREE.Color(elegir(COLORES_COMETA));

  // La cola: puntos sobre el eje -x (el cometa va hacia +x), más abiertos y apagados hacia la punta.
  // Como va en línea recta, la cola es fija en el grupo: no hay que recalcularla por cuadro.
  const CANTIDAD = 120;
  const largo = azar(4.5, 6.5);
  const posiciones = new Float32Array(CANTIDAD * 3);
  const colores = new Float32Array(CANTIDAD * 3);
  const tamanos = new Float32Array(CANTIDAD);
  for (let i = 0; i < CANTIDAD; i++) {
    // Más puntos cerca de la cabeza, donde la cola es más densa.
    const u = Math.pow(Math.random(), 0.7);
    const abre = 0.04 + u * 0.5;
    posiciones[i * 3] = -largo * u;
    // La cola de polvo se curva apenas para abajo.
    posiciones[i * 3 + 1] = (Math.random() - 0.5) * abre - u * u * 0.5;
    posiciones[i * 3 + 2] = (Math.random() - 0.5) * abre;
    tmpColor.copy(color).lerp(BLANCO, Math.max(0, 0.7 - u * 2)).multiplyScalar(Math.pow(1 - u, 1.6));
    colores[i * 3] = tmpColor.r;
    colores[i * 3 + 1] = tmpColor.g;
    colores[i * 3 + 2] = tmpColor.b;
    tamanos[i] = (1 - u) * 1.5 + azar(0.3, 0.6);
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
  geometria.setAttribute("color", new THREE.BufferAttribute(colores, 3));
  geometria.setAttribute("aTamano", new THREE.BufferAttribute(tamanos, 1));
  const matCola = materialPuntos(kit.puntoRedondo, 0.3);
  const cola = new THREE.Points(geometria, matCola);

  const matCabeza = new THREE.MeshBasicMaterial({ color: color.clone().lerp(BLANCO, 0.7), transparent: true, opacity: 0 });
  const cabeza = new THREE.Mesh(kit.geo.luz, matCabeza);
  cabeza.scale.setScalar(2.6);
  const matHalo = new THREE.SpriteMaterial({
    map: kit.puntoRedondo,
    color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const halo = new THREE.Sprite(matHalo);
  halo.scale.setScalar(1.3);
  grupo.add(cola, halo, cabeza);

  const z = azar(-26, -12);
  const alto = medioAlto(z);
  const ancho = alto * aspecto;
  const desde = franja(aspecto, 0.9);
  // Baja en diagonal: casi siempre hacia afuera, a veces apenas hacia adentro, sin pisar la nodriza.
  const hasta = THREE.MathUtils.clamp(desde + azar(-0.2, 0.35), bordeNodriza(aspecto) + 0.05, 1.15);
  const x0 = lado * ancho * desde;
  const y0 = alto * azar(0.85, 1.1) + 1.5;
  const x1 = lado * ancho * hasta;
  const y1 = alto * azar(-0.35, 0.15);
  const rumbo = Math.atan2(y1 - y0, x1 - x0);
  grupo.position.set(x0, y0, z);

  return {
    obj: grupo,
    clase: "cometa",
    radio: 0.6,
    nace: t,
    vida: azar(2.8, 4),
    propios: [matCola, matCabeza, matHalo],
    geometria,
    mover: (p, tt, g) => {
      grupo.position.set(x0 + (x1 - x0) * p, y0 + (y1 - y0) * p, z);
      grupo.rotation.set(0, 0, rumbo);
      // La cola ondea apenas, como si la empujara el viento solar.
      cola.rotation.z = Math.sin(tt * 2.1) * 0.03;
      const f = fundido(p, 0.12, 0.2);
      matCola.opacity = f * 0.9;
      matCabeza.opacity = f;
      matHalo.opacity = f * (0.55 + g * 0.2);
    },
  };
}

// ————————————————————————————— Portal —————————————————————————————

/**
 * Agujero de gusano: tres brazos en espiral logarítmica que giran hacia adentro y un centro oscuro
 * que tapa las estrellas de atrás. El giro es lento (cada punto ve pasar ~0,5 brazos por segundo).
 */
function crearMaterialPortal(colorA: number, colorB: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uTiempo: { value: 0 },
      uOpacidad: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uTiempo;
      uniform float uOpacidad;
      varying vec2 vUv;
      void main() {
        vec2 c = vUv * 2.0 - 1.0;
        float r = length(c);
        // atan(0, 0) no está definido en GLSL (en algunas placas da NaN): el centro exacto se corre un pelo.
        float a = atan(c.y, c.x + 1e-6);
        float espiral = 0.5 + 0.5 * sin(a * 3.0 + log(r + 0.02) * 6.0 + uTiempo * 2.6);
        float brazos = smoothstep(0.3, 0.95, espiral);
        float franja = smoothstep(0.18, 0.55, r) * (1.0 - smoothstep(0.82, 1.0, r));
        vec3 color = mix(uColorA, uColorB, espiral) * (0.25 + brazos * 0.9) * franja;
        float hueco = 1.0 - smoothstep(0.05, 0.5, r);
        float alfa = clamp(hueco * 0.92 + franja * (0.35 + brazos * 0.5), 0.0, 1.0) * (1.0 - smoothstep(0.9, 1.0, r));
        gl_FragColor = vec4(color, alfa * uOpacidad);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function nacerPortal(kit: Kit, t: number, aspecto: number, lado: number): Actor {
  const raiz = new THREE.Group();
  const boca = new THREE.Group();
  const colorA = elegir(COLORES_PORTAL);
  const colorB = elegir(COLORES_PORTAL.filter((c) => c !== colorA));
  const geoDisco = new THREE.CircleGeometry(1, 64);
  const geoAro = new THREE.TorusGeometry(1, 0.045, 8, 96);
  const geoAroFino = new THREE.TorusGeometry(1.14, 0.016, 6, 96);
  const matDisco = crearMaterialPortal(colorA, colorB);
  const anillo = { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false };
  const matAro = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorA).lerp(BLANCO, 0.25), ...anillo });
  const matAroFino = new THREE.MeshBasicMaterial({ color: colorB, ...anillo });
  const aroFino = new THREE.Mesh(geoAroFino, matAroFino);
  boca.add(new THREE.Mesh(geoDisco, matDisco), new THREE.Mesh(geoAro, matAro), aroFino);
  raiz.add(boca);

  const escala = escalaCostado(aspecto);
  const tamano = azar(1.1, 1.6) * escala;
  const z = azar(-9, -4);
  const alto = medioAlto(z);
  raiz.position.set(lado * alto * aspecto * franja(aspecto, 0.85), alto * azar(-0.1, 0.5), z);
  // Mira un poco hacia el centro: se lee como una puerta, no como un círculo pegado a la pantalla.
  boca.rotation.set(azar(-0.15, 0.15), -lado * 0.45, 0);

  // Lo que escupe: una nave chica de la flota o la pelota alien.
  const ovni = Math.random() < 0.6 ? crearNave(kit, elegirModelo(kit)) : null;
  const viajero = ovni ? ovni.grupo : kit.pelota.grupo.clone();
  if (ovni) ovni.rayo.visible = false;
  const escalaViajero = (ovni ? 0.42 : 0.5) * escala;
  const fase = Math.random() * Math.PI * 2;
  const vaiven = nuevoVaiven();
  viajero.visible = false;
  raiz.add(viajero);
  // Sale hacia la cámara y se abre para afuera hasta perderse por el borde.
  const zFin = 5;
  const finX = lado * medioAlto(zFin) * aspecto * 1.35 - raiz.position.x;
  const finY = medioAlto(zFin) * azar(-0.1, 0.4) - raiz.position.y;
  const finZ = zFin - z;

  return {
    obj: raiz,
    clase: "portal",
    radio: tamano * 1.15,
    nace: t,
    vida: azar(4.5, 5.5),
    propios: ovni ? [matDisco, matAro, matAroFino, ovni.matRayo] : [matDisco, matAro, matAroFino],
    liberar: () => {
      geoDisco.dispose();
      geoAro.dispose();
      geoAroFino.dispose();
      ovni?.liberar();
    },
    mover: (p, tt, g) => {
      // Se abre de a poco, queda abierto y se cierra: escala y opacidad juntas, nunca de golpe.
      const abre = fundido(p, 0.14, 0.16);
      boca.scale.setScalar(tamano * Math.max(0.001, abre));
      matDisco.uniforms.uTiempo.value = tt;
      matDisco.uniforms.uOpacidad.value = abre;
      matAro.opacity = abre * (0.55 + g * 0.3);
      matAroFino.opacity = abre * 0.35;
      aroFino.rotation.z = tt * 0.8;

      const q = (p - 0.3) / 0.5;
      viajero.visible = q > 0 && q < 1;
      if (!viajero.visible) return;
      // Arranca despacio desde el centro del disco y sale disparado.
      const s = q * q;
      viajero.position.set(finX * Math.pow(s, 1.4), finY * s + Math.sin(q * Math.PI) * 0.5, 0.05 + finZ * s);
      viajero.scale.setScalar(escalaViajero * Math.min(1, q / 0.15));
      if (ovni) {
        // Sale hacia su lado: las redondas se inclinan, las de nariz apuntan para allá.
        vaivenDe(ovni.modelo, tt, fase, vaiven);
        orientarNave(viajero, ovni.modelo, lado, -lado * 0.5 * s, vaiven);
        viajero.rotation.x = 0.25;
        ovni.animar(tt, kit.sonido?.espectro);
      } else {
        viajero.rotation.set(tt * 5, tt * 7, 0);
      }
    },
  };
}

// ————————————————————————————— Escuadrón —————————————————————————————

// En V: el líder adelante (más cerca de la cámara) y los dos de atrás abiertos.
const FORMACION = [
  [0, 0, 0],
  [-1.35, -0.3, -1.7],
  [1.35, -0.3, -1.7],
] as const;
const FASES_FORMACION = [0, 1.7, 3.1];

function nacerEscuadron(kit: Kit, t: number, aspecto: number, lado: number): Actor {
  const raiz = new THREE.Group();
  const escala = escalaCostado(aspecto);
  // Todas del mismo modelo (en formación se lee mejor), de las dominantes del tema.
  const modelo = kit.flota.length > 0 ? elegir(kit.flota) : elegirModelo(kit);
  const escalaNave = 0.36 * escala;
  const naves = FORMACION.map(([x, y, z]) => {
    const nave = crearNave(kit, modelo);
    nave.rayo.visible = false;
    nave.grupo.scale.setScalar(escalaNave);
    nave.grupo.position.set(x * escala, y * escala, z * escala);
    raiz.add(nave.grupo);
    return nave;
  });
  const vaiven = nuevoVaiven();
  const nariz = tieneNariz(modelo);
  // Vienen del fondo (salen de la niebla) por el costado y pasan al lado de la cámara.
  const zDesde = -44;
  const zHasta = 7;
  const f = franja(aspecto, 0.8);
  const y0 = medioAlto(-6) * azar(0.05, 0.45);

  return {
    obj: raiz,
    clase: "ovni",
    radio: 2.2 * escala,
    nace: t,
    vida: azar(5, 6.5),
    propios: naves.map((nave) => nave.matRayo),
    liberar: () => naves.forEach((nave) => nave.liberar()),
    mover: (p, tt) => {
      const z = zDesde + (zHasta - zDesde) * p;
      const ancho = medioAlto(z) * aspecto;
      // Al final se abren para afuera, inclinándose, y se pierden por el borde.
      const sale = p > 0.65 ? suave((p - 0.65) / 0.35) : 0;
      raiz.position.set(lado * ancho * (f + sale * 0.85), y0 * (1 - p * 0.6) + Math.sin(p * Math.PI) * 0.7, z);
      for (let i = 0; i < naves.length; i++) {
        const nave = naves[i];
        const fase = FASES_FORMACION[i];
        // El vaivén de su modelo, a medias: que se note la forma de volar sin romper la V.
        vaivenDe(modelo, tt, fase, vaiven);
        const [x, y, zf] = FORMACION[i];
        nave.grupo.position.set(x * escala + vaiven.x * escalaNave * 0.5, y * escala + vaiven.y * escalaNave * 0.5, zf * escala);
        const banco = -lado * (0.12 + sale * 0.55);
        nave.grupo.rotation.set(0.3 + Math.sin(tt * 2 + fase) * 0.05, 0, 0);
        if (nariz) {
          // Vienen hacia la cámara: la nariz apunta para acá y, al abrirse, hacia afuera.
          nave.grupo.rotation.y = -Math.PI / 2 + lado * (0.35 + sale * 0.6) + vaiven.giroY;
          nave.grupo.rotation.z = vaiven.giroZ;
        } else {
          nave.grupo.rotation.y = vaiven.giroY;
          nave.grupo.rotation.z = banco + Math.sin(tt * 1.6 + fase) * 0.06 + vaiven.giroZ;
        }
        nave.animar(tt, kit.sonido?.espectro);
      }
    },
  };
}

// ————————————————————————————— Satélite —————————————————————————————

/** Panel solar: celdas azules con marco claro y un brillo en diagonal en cada una. */
function crearTexturaPanel(): THREE.CanvasTexture {
  const { canvas, ctx } = lienzo(128, 64);
  if (ctx) {
    ctx.fillStyle = "#a3acb6";
    ctx.fillRect(0, 0, 128, 64);
    const columnas = 8;
    const filas = 4;
    const ancho = 128 / columnas;
    const alto = 64 / filas;
    for (let c = 0; c < columnas; c++) {
      for (let f = 0; f < filas; f++) {
        const x = c * ancho + 1.5;
        const y = f * alto + 1.5;
        const grad = ctx.createLinearGradient(x, y, x + ancho, y + alto);
        grad.addColorStop(0, "#1f4a9a");
        grad.addColorStop(0.55, "#0e2558");
        grad.addColorStop(1, "#0a1a40");
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, ancho - 3, alto - 3);
        ctx.fillStyle = "rgba(160, 200, 255, 0.35)";
        ctx.fillRect(x, y + (alto - 3) / 2, ancho - 3, 0.6);
      }
    }
  }
  const textura = new THREE.CanvasTexture(canvas);
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}

function nacerSatelite(kit: Kit, t: number, aspecto: number, lado: number): Actor {
  const raiz = new THREE.Group();
  const geoCuerpo = new THREE.BoxGeometry(0.55, 0.55, 0.85);
  const geoFaja = new THREE.BoxGeometry(0.6, 0.6, 0.1);
  const geoBrazo = new THREE.CylinderGeometry(0.03, 0.03, 2.5, 8).rotateZ(Math.PI / 2);
  const geoPanel = new THREE.BoxGeometry(1.45, 0.025, 0.6);
  // Plato de la antena: un casquete con lo cóncavo mirando para adelante, pegado al frente del cuerpo.
  const geoPlato = new THREE.SphereGeometry(0.34, 24, 8, 0, Math.PI * 2, Math.PI - 0.95, 0.95).rotateX(Math.PI / 2).translate(0, 0, 0.82);
  const geoVastago = new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6).rotateX(Math.PI / 2).translate(0, 0, 0.62);
  const geometrias = [geoCuerpo, geoFaja, geoBrazo, geoPanel, geoPlato, geoVastago];

  const textura = crearTexturaPanel();
  // Lámina dorada de satélite de verdad, con el borde en el color de la paleta como los demás.
  const matOro = conBorde(new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.9, roughness: 0.38 }), kit.borde, 0.5, 2.6);
  const matFaja = new THREE.MeshStandardMaterial({ color: 0x2a2f36, metalness: 0.6, roughness: 0.45 });
  const matPanel = new THREE.MeshStandardMaterial({ map: textura, metalness: 0.35, roughness: 0.32, envMapIntensity: 1.2 });
  const matPlato = new THREE.MeshStandardMaterial({ color: 0xe8edf2, metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide });

  const faja = new THREE.Mesh(geoFaja, matFaja);
  faja.position.z = 0.15;
  const panelIzq = new THREE.Mesh(geoPanel, matPanel);
  panelIzq.position.x = -1.25;
  const panelDer = new THREE.Mesh(geoPanel, matPanel);
  panelDer.position.x = 1.25;
  // La luz de posición es fija, no titila.
  const luz = new THREE.Mesh(kit.geo.luz, kit.motor);
  luz.position.y = 0.31;
  raiz.add(new THREE.Mesh(geoCuerpo, matOro), faja, new THREE.Mesh(geoBrazo, kit.panza), panelIzq, panelDer, new THREE.Mesh(geoPlato, matPlato), new THREE.Mesh(geoVastago, kit.panza), luz);

  const escala = escalaCostado(aspecto) * azar(0.75, 1);
  raiz.scale.setScalar(escala);
  const z = azar(-12, -6);
  const alto = medioAlto(z);
  const ancho = alto * aspecto;
  // Entra desde afuera de la pantalla, se asoma hasta `entra` y vuelve a salir.
  const fuera = 1 + (2.2 * escala) / ancho;
  const entra = Math.min(0.92, bordeNodriza(aspecto) + azar(0.15, 0.3));
  const y0 = alto * azar(0.3, 0.75);
  const y1 = alto * azar(-0.2, 0.3);
  const fase = Math.random() * Math.PI * 2;

  return {
    obj: raiz,
    clase: "satelite",
    radio: 1.7,
    nace: t,
    vida: azar(10, 14),
    propios: [matOro, matFaja, matPanel, matPlato],
    liberar: () => {
      geometrias.forEach((g) => g.dispose());
      textura.dispose();
    },
    mover: (p, tt) => {
      raiz.position.set(lado * ancho * (fuera - (fuera - entra) * Math.sin(p * Math.PI)), y0 + (y1 - y0) * p, z);
      // Da vueltas despacio, como sin gravedad.
      raiz.rotation.set(0.35 + Math.sin(tt * 0.25 + fase) * 0.25, tt * 0.18 + fase, 0.2 + Math.sin(tt * 0.2) * 0.3);
    },
  };
}

// ————————————————————————————— Vaca abducida —————————————————————————————

/**
 * Vaca low-poly mirando a +x: blanca con manchas negras, hocico rosa, cuernitos y ubre. Las patas
 * van aparte, con el pivote en la cadera, para patalear.
 */
function crearVaca(kit: Kit) {
  const geometrias: THREE.BufferGeometry[] = [];
  const unir = (partes: THREE.BufferGeometry[]) => {
    const unida = mergeGeometries(partes);
    partes.forEach((p) => p.dispose());
    geometrias.push(unida);
    return unida;
  };
  const esfera = (radio: number, sx: number, sy: number, sz: number, x: number, y: number, z: number) =>
    new THREE.SphereGeometry(radio, 10, 8).scale(sx, sy, sz).translate(x, y, z);

  const blanco = unir([
    new THREE.CapsuleGeometry(0.4, 0.8, 4, 12).rotateZ(Math.PI / 2).scale(1, 0.95, 0.85),
    new THREE.BoxGeometry(0.44, 0.42, 0.4).rotateZ(-0.25).translate(0.98, 0.2, 0),
    ...[-1, 1].map((lado) => new THREE.BoxGeometry(0.08, 0.05, 0.2).rotateX(lado * 0.4).translate(0.9, 0.33, lado * 0.3)),
    new THREE.CylinderGeometry(0.022, 0.022, 0.5, 6).rotateZ(0.35).translate(-0.9, -0.08, 0),
  ]);
  const negro = unir([
    // Manchas: elipsoides chatos apoyados en los costados y el lomo.
    esfera(1, 0.26, 0.2, 0.07, 0.2, 0.08, 0.33),
    esfera(1, 0.22, 0.17, 0.07, -0.42, 0.14, 0.33),
    esfera(1, 0.28, 0.2, 0.07, -0.3, -0.04, -0.33),
    esfera(1, 0.2, 0.16, 0.07, 0.35, 0.1, -0.33),
    esfera(1, 0.28, 0.06, 0.22, -0.12, 0.36, 0.05),
    // Ojos, narinas y la punta de la cola.
    esfera(0.045, 1, 1, 1, 1.08, 0.3, 0.205),
    esfera(0.045, 1, 1, 1, 1.08, 0.3, -0.205),
    esfera(0.03, 1, 1, 1, 1.31, 0.1, 0.08),
    esfera(0.03, 1, 1, 1, 1.31, 0.1, -0.08),
    esfera(0.06, 1, 1.6, 1, -0.98, -0.34, 0),
  ]);
  const rosa = unir([
    new THREE.BoxGeometry(0.18, 0.24, 0.36).rotateZ(-0.25).translate(1.22, 0.08, 0),
    esfera(0.14, 1, 0.7, 1, -0.3, -0.36, 0),
    ...[-1, 1].flatMap((dx) => [-1, 1].map((dz) => new THREE.CylinderGeometry(0.02, 0.015, 0.08, 6).translate(-0.3 + dx * 0.06, -0.47, dz * 0.06))),
  ]);
  const cuerno = unir([-1, 1].map((lado) => new THREE.ConeGeometry(0.04, 0.17, 8).rotateX(lado * 0.45).translate(0.95, 0.5, lado * 0.13)));
  const pata = new THREE.CylinderGeometry(0.075, 0.065, 0.5, 8).translate(0, -0.25, 0);
  const pezuna = new THREE.CylinderGeometry(0.075, 0.08, 0.1, 8).translate(0, -0.53, 0);
  geometrias.push(pata, pezuna);

  // Facetada a propósito (flatShading): se lee como low-poly, no como un muñeco mal modelado.
  const matBlanco = conBorde(new THREE.MeshStandardMaterial({ color: 0xf2f1ea, roughness: 0.75, flatShading: true }), kit.borde, 0.55, 2.4);
  const matNegro = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.6, flatShading: true });
  const matRosa = new THREE.MeshStandardMaterial({ color: 0xf2a0bd, roughness: 0.6, flatShading: true });
  const matCuerno = new THREE.MeshStandardMaterial({ color: 0xefe2c0, roughness: 0.5, flatShading: true });

  const grupo = new THREE.Group();
  grupo.add(new THREE.Mesh(blanco, matBlanco), new THREE.Mesh(negro, matNegro), new THREE.Mesh(rosa, matRosa), new THREE.Mesh(cuerno, matCuerno));
  const patas = [
    [0.5, 0.2],
    [0.5, -0.2],
    [-0.5, 0.2],
    [-0.5, -0.2],
  ].map(([x, z]) => {
    const cadera = new THREE.Group();
    cadera.position.set(x, -0.2, z);
    cadera.add(new THREE.Mesh(pata, matBlanco), new THREE.Mesh(pezuna, matNegro));
    grupo.add(cadera);
    return cadera;
  });

  return { grupo, patas, geometrias, materiales: [matBlanco, matNegro, matRosa, matCuerno] };
}

function nacerVaca(kit: Kit, t: number, aspecto: number, lado: number): Actor {
  const raiz = new THREE.Group();
  const escala = escalaCostado(aspecto);
  const ovni = crearNave(kit, elegirModelo(kit));
  const sOvni = 0.95 * escala;
  ovni.grupo.scale.setScalar(sOvni);
  // La raíz queda en el medio de la columna nave + rayo: lo que se toca es todo junto. El rayo va de
  // la panza (y = bajo en la nave; -0,34 en el platillo) hasta 3,4 más abajo.
  const ovniY = (1.61 - ovni.bajo) * sOvni;
  ovni.grupo.position.y = ovniY;
  raiz.add(ovni.grupo);
  const vaca = crearVaca(kit);
  const sVaca = 0.6 * sOvni;
  vaca.grupo.visible = false;
  raiz.add(vaca.grupo);
  // Donde la agarra el rayo y la panza, donde se la traga.
  const abajo = ovniY + (ovni.bajo - 2.96) * sOvni;
  const arriba = ovniY + (ovni.bajo - 0.11) * sOvni;
  const vaiven = nuevoVaiven();
  const rumbo = Math.random() < 0.5 ? -1 : 1;

  // En el celu parado, más cerca de la cámara: si no, la vaca no se lee.
  const z = aspecto < 0.8 ? azar(-0.5, 1.5) : azar(-4, -1);
  const alto = medioAlto(z);
  const x = lado * alto * aspecto * franja(aspecto, 0.8);
  const yQuieto = alto * azar(0, 0.3);
  const yArriba = alto + 3.5 * sOvni + 1;
  raiz.position.set(x, yArriba, z);
  const fase = Math.random() * Math.PI * 2;

  return {
    obj: raiz,
    clase: "vaca",
    radio: 2.4 * sOvni,
    nace: t,
    vida: azar(7.5, 9.5),
    propios: [ovni.matRayo, ...vaca.materiales],
    liberar: () => {
      ovni.liberar();
      vaca.geometrias.forEach((g) => g.dispose());
    },
    mover: (p, tt, g) => {
      // Baja, abduce la vaca y se va disparado para arriba.
      const y =
        p < 0.15
          ? yArriba + (yQuieto - yArriba) * suave(p / 0.15)
          : p < 0.88
            ? yQuieto + Math.sin(tt * 1.8 + fase) * 0.12
            : yQuieto + (yArriba + 4 - yQuieto) * suave((p - 0.88) / 0.12);
      raiz.position.set(x + Math.sin(tt * 1.1 + fase) * 0.2, y, z);
      // Su forma de volar, a medias: la vaca va colgada del rayo y lo sigue.
      vaivenDe(ovni.modelo, tt, fase, vaiven);
      const dx = vaiven.x * sOvni * 0.35;
      const dy = vaiven.y * sOvni * 0.3;
      ovni.grupo.position.set(dx, ovniY + dy, 0);
      orientarNave(ovni.grupo, ovni.modelo, rumbo, Math.sin(tt * 2 + fase) * 0.05, vaiven);
      ovni.grupo.rotation.x = 0.12;
      ovni.animar(tt, kit.sonido?.espectro);
      // El rayo prende y apaga con fundido y su brillo sigue la curva lenta.
      const rayo = p < 0.12 ? 0 : p < 0.22 ? suave((p - 0.12) / 0.1) : p < 0.8 ? 1 : p < 0.88 ? 1 - suave((p - 0.8) / 0.08) : 0;
      ovni.matRayo.uniforms.uOpacidad.value = rayo * (0.16 + g * 0.4);

      // La vaca aparece abajo en el rayo, sube girando y se achica al entrar en la panza.
      const aparece = p < 0.16 ? 0 : p < 0.24 ? suave((p - 0.16) / 0.08) : 1;
      const traga = p < 0.7 ? 1 : p < 0.8 ? 1 - suave((p - 0.7) / 0.1) : 0;
      const sube = p < 0.22 ? 0 : p < 0.78 ? suave((p - 0.22) / 0.56) : 1;
      const tam = aparece * traga;
      vaca.grupo.visible = tam > 0.001;
      vaca.grupo.scale.setScalar(sVaca * Math.max(0.001, tam));
      // Colgada del rayo: sigue el vaivén de la nave (de lado siempre, de alto cuanto más arriba está).
      vaca.grupo.position.set(dx + Math.sin(tt * 1.4 + fase) * 0.08 * sOvni, abajo + (arriba - abajo) * sube + dy * sube, 0);
      vaca.grupo.rotation.set(Math.sin(tt * 0.9) * 0.35, tt * 0.8 + fase, Math.sin(tt * 1.2 + fase) * 0.5);
      // Patalea despacio.
      for (let i = 0; i < vaca.patas.length; i++) vaca.patas[i].rotation.z = Math.sin(tt * 5 + i * 1.7) * 0.45;
    },
  };
}

// ————————————————————————————— Estrellas fugaces —————————————————————————————

type Trazo = {
  inicio: number;
  dura: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  velocidad: number;
  largo: number;
  ancho: number;
  r: number;
  g: number;
  b: number;
};

function nacerFugaces(t: number, aspecto: number, lado: number): Actor {
  // Cada trazo es un triángulo finito: dos vértices en la cabeza (prendidos) y la punta de la cola
  // (negra: con mezcla aditiva, negro es transparente). Se reescriben por cuadro, sin crear nada.
  const cantidad = Math.floor(azar(3, 7));
  const posiciones = new Float32Array(cantidad * 9);
  const colores = new Float32Array(cantidad * 9);
  const geometria = new THREE.BufferGeometry();
  const atribPosicion = new THREE.BufferAttribute(posiciones, 3).setUsage(THREE.DynamicDrawUsage);
  const atribColor = new THREE.BufferAttribute(colores, 3).setUsage(THREE.DynamicDrawUsage);
  geometria.setAttribute("position", atribPosicion);
  geometria.setAttribute("color", atribColor);
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const malla = new THREE.Mesh(geometria, material);
  // Los vértices se mueven: la esfera de recorte que calcula three al principio no sirve.
  malla.frustumCulled = false;

  const z = azar(-32, -20);
  const alto = medioAlto(z);
  const ancho = alto * aspecto;
  malla.position.set(lado * ancho * franja(aspecto, 0.85), alto * azar(0.15, 0.5), z);
  const vida = azar(2.4, 3.2);
  // Todas para el mismo lado, como una lluvia: en diagonal, hacia abajo y hacia afuera.
  const caida = azar(0.35, 0.7);
  const trazos: Trazo[] = Array.from({ length: cantidad }, (_, i) => {
    const angulo = caida + azar(-0.08, 0.08);
    tmpColor.set(elegir([0xffffff, 0xbfe9ff, 0xd8ffc8]));
    return {
      inicio: (i / cantidad) * 0.55 + azar(0, 0.08),
      dura: azar(0.28, 0.4),
      x: azar(-ancho * 0.12, ancho * 0.12),
      y: azar(-alto * 0.2, alto * 0.3),
      dx: lado * Math.cos(angulo),
      dy: -Math.sin(angulo),
      velocidad: azar(14, 22),
      largo: azar(3, 6),
      ancho: azar(0.07, 0.12),
      r: tmpColor.r,
      g: tmpColor.g,
      b: tmpColor.b,
    };
  });

  return {
    obj: malla,
    clase: "efecto",
    radio: 0,
    nace: t,
    vida,
    propios: [material],
    geometria,
    mover: (p) => {
      for (let i = 0; i < trazos.length; i++) {
        const s = trazos[i];
        const k = (p - s.inicio) / s.dura;
        const o = i * 9;
        if (k <= 0 || k >= 1) {
          posiciones.fill(0, o, o + 9);
          colores.fill(0, o, o + 9);
          continue;
        }
        const avance = k * s.dura * vida * s.velocidad;
        const hx = s.x + s.dx * avance;
        const hy = s.y + s.dy * avance;
        const largo = s.largo * Math.min(1, k / 0.3);
        const nx = -s.dy * s.ancho * 0.5;
        const ny = s.dx * s.ancho * 0.5;
        posiciones[o] = hx + nx;
        posiciones[o + 1] = hy + ny;
        posiciones[o + 2] = 0;
        posiciones[o + 3] = hx - nx;
        posiciones[o + 4] = hy - ny;
        posiciones[o + 5] = 0;
        posiciones[o + 6] = hx - s.dx * largo;
        posiciones[o + 7] = hy - s.dy * largo;
        posiciones[o + 8] = 0;
        // Entra en ~0,1 s y se apaga despacio: es un trazo fino, no un destello.
        const brillo = (k < 0.15 ? k / 0.15 : k > 0.55 ? 1 - (k - 0.55) / 0.45 : 1) * 0.9;
        for (let v = 0; v < 2; v++) {
          colores[o + v * 3] = s.r * brillo;
          colores[o + v * 3 + 1] = s.g * brillo;
          colores[o + v * 3 + 2] = s.b * brillo;
        }
        colores[o + 6] = 0;
        colores[o + 7] = 0;
        colores[o + 8] = 0;
      }
      atribPosicion.needsUpdate = true;
      atribColor.needsUpdate = true;
    },
  };
}

// ————————————————————————————— Alien con jetpack —————————————————————————————

function nacerJetpack(kit: Kit, t: number, aspecto: number, lado: number): Actor {
  const raiz = new THREE.Group();
  const alien = crearAlien(kit);
  // La raíz queda a media altura del cuerpo: la cabeza arriba, los pies abajo. Así el rulo gira
  // alrededor del medio del alien y lo tocable queda centrado.
  alien.grupo.position.y = 1.1;
  // De tres cuartos, para que se vea la mochila.
  alien.grupo.rotation.y = lado * 0.55;
  raiz.add(alien.grupo);

  const geoTanque = new THREE.CapsuleGeometry(0.13, 0.34, 4, 12);
  const geoTobera = new THREE.CylinderGeometry(0.055, 0.085, 0.12, 12);
  // Llamas: conos que apuntan para abajo con la base en el origen (pegada a la tobera).
  const geoLlama = new THREE.ConeGeometry(0.08, 0.55, 12, 1, true).rotateX(Math.PI).translate(0, -0.275, 0);
  const geoNucleo = new THREE.ConeGeometry(0.04, 0.32, 10, 1, true).rotateX(Math.PI).translate(0, -0.16, 0);
  // Fuego alien: frío (cian o verde), nunca rojo.
  const fuego = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide };
  const matLlama = new THREE.MeshBasicMaterial({ color: elegir([0x7dfff0, VERDE_3D, 0x2de2ff]), opacity: 0.8, ...fuego });
  const matNucleo = new THREE.MeshBasicMaterial({ color: 0xe9fff6, opacity: 0.9, ...fuego });

  const mochila = new THREE.Group();
  mochila.position.set(0, CUERPO.y + 0.12, -0.34);
  const llamas = [-1, 1].map((lado2) => {
    const tanque = new THREE.Mesh(geoTanque, kit.casco);
    tanque.position.x = lado2 * 0.22;
    const tobera = new THREE.Mesh(geoTobera, kit.panza);
    tobera.position.set(lado2 * 0.22, -0.33, 0);
    const llama = new THREE.Mesh(geoLlama, matLlama);
    llama.position.set(lado2 * 0.22, -0.39, 0);
    llama.add(new THREE.Mesh(geoNucleo, matNucleo));
    mochila.add(tanque, tobera, llama);
    return llama;
  });
  alien.grupo.add(mochila);

  const escala = escalaCostado(aspecto);
  raiz.scale.setScalar(0.45 * escala);
  const z = azar(-5, -1);
  const alto = medioAlto(z);
  const xBase = lado * alto * aspecto * franja(aspecto, 0.85);
  // De abajo afuera de la pantalla hasta arriba afuera; el rulo, en el medio.
  const yDesde = -alto - 2.2;
  const yHasta = alto + 2.2;
  const radioRulo = 1.1 * escala;

  return {
    obj: raiz,
    clase: "alien",
    radio: 2,
    nace: t,
    vida: azar(6, 7.5),
    propios: [matLlama, matNucleo],
    liberar: () => {
      geoTanque.dispose();
      geoTobera.dispose();
      geoLlama.dispose();
      geoNucleo.dispose();
    },
    mover: (p, tt, g) => {
      // Sube por el costado; en el medio frena y hace un rulo completo hacia adentro, y sigue.
      const avance = p < 0.4 ? (p / 0.4) * 0.45 : p < 0.64 ? 0.45 : 0.45 + ((p - 0.64) / 0.36) * 0.55;
      const angulo = p < 0.4 ? 0 : p < 0.64 ? ((p - 0.4) / 0.24) * Math.PI * 2 : Math.PI * 2;
      raiz.position.set(
        xBase - lado * (1 - Math.cos(angulo)) * radioRulo,
        yDesde + (yHasta - yDesde) * avance + Math.sin(angulo) * radioRulo,
        z
      );
      raiz.rotation.set(0, 0, lado * angulo + Math.sin(tt * 1.7) * 0.08);
      const saluda = p > 0.14 && p < 0.36 ? suave(Math.min(1, (p - 0.14) / 0.06, (0.36 - p) / 0.06)) : 0;
      alien.animar(tt, { saluda, nada: 0.35, ritmo: g });
      // La llama cambia de largo, no de brillo.
      for (let i = 0; i < llamas.length; i++) {
        llamas[i].scale.set(1, 0.85 + Math.sin(tt * 13 + i * 2) * 0.12 + Math.sin(tt * 29 + i) * 0.06 + g * 0.25, 1);
      }
    },
  };
}

// ————————————————————————————— Batalla de fondo —————————————————————————————

/** Disparos en vuelo a la vez, por batalla. */
const DISPAROS = 4;
/** Su propio tope de destellos: como mucho 2 disparos por segundo, aunque los chasquidos vengan más seguido. */
const ENTRE_DISPAROS = 0.5;
const VIDA_DISPARO = 0.45;
/** Largo de cada láser (mundo) y lo que sigue de largo después de pasar al lado de la presa. */
const LARGO_DISPARO = 1.3;
const PASA_DE_LARGO = 3;
/** Cuánto atrás de la presa va cada cazadora, en segundos de su mismo camino. */
const RETRASO_CAZA = [0.55, 1.05];
/** El tirabuzón de la presa para esquivar. */
const ESQUIVE = 0.6;

type Piloto = {
  nave: Nave;
  /** Hacia dónde mira la nariz (solo las de nariz), suavizado: se dan vuelta de a poco. */
  giro: number;
  vaiven: Vaiven;
  fase: number;
  retraso: number;
  /** Corrimiento propio, para que las cazadoras no vayan exactamente en fila. */
  dy: number;
  dz: number;
  pos: THREE.Vector3;
  velocidad: THREE.Vector3;
};

type Disparo = { malla: THREE.Mesh; material: THREE.MeshBasicMaterial; desde: number; origen: THREE.Vector3; direccion: THREE.Vector3; distancia: number };

/**
 * Batalla lejana: una nave escapa haciendo ochos a un costado y una o dos la persiguen por el mismo
 * camino, tirándole láseres finitos en los chasquidos. Los láseres pasan rozando y la presa esquiva
 * con un tirabuzón: sin explosiones ni fogonazos.
 */
function nacerBatalla(kit: Kit, t: number, aspecto: number, lado: number): Actor {
  const raiz = new THREE.Group();
  const escala = 0.36 * escalaCostado(aspecto);
  const modeloPresa = elegirModelo(kit);
  const modeloCaza = elegirModelo(kit);
  const cuantas = Math.random() < 0.5 ? 3 : 2;
  const pilotos: Piloto[] = Array.from({ length: cuantas }, (_, i) => {
    const nave = crearNave(kit, i === 0 ? modeloPresa : modeloCaza);
    nave.rayo.visible = false;
    nave.grupo.scale.setScalar(escala);
    raiz.add(nave.grupo);
    return {
      nave,
      giro: 0,
      vaiven: nuevoVaiven(),
      fase: Math.random() * Math.PI * 2,
      retraso: i === 0 ? 0 : RETRASO_CAZA[i - 1],
      dy: i === 0 ? 0 : azar(-0.3, 0.3),
      dz: i === 0 ? 0 : azar(-1.2, 1.2),
      pos: new THREE.Vector3(),
      velocidad: new THREE.Vector3(),
    };
  });
  const presa = pilotos[0];

  // Los láseres: un palito finito que viaja (núcleo casi blanco con el color de la que tira).
  const geoDisparo = new THREE.CylinderGeometry(0.045, 0.045, 1, 5, 1, true).translate(0, 0.5, 0);
  const disparos: Disparo[] = Array.from({ length: DISPAROS }, () => {
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const malla = new THREE.Mesh(geoDisparo, material);
    malla.visible = false;
    raiz.add(malla);
    return { malla, material, desde: -10, origen: new THREE.Vector3(), direccion: new THREE.Vector3(), distancia: 0 };
  });

  // Lejos, atrás de la nodriza, en la franja del costado (fracciones del medio ancho).
  const z = azar(-24, -16);
  const alto = medioAlto(z);
  const ancho = alto * aspecto;
  const borde = bordeNodriza(aspecto) + 0.06;
  const centroX = (borde + 0.95) / 2;
  const amplitudX = Math.max(0.12, (0.95 - borde) / 2);
  const centroY = azar(0.05, 0.45);
  const vida = azar(8, 10);
  const w = azar(0.75, 0.95);
  const f1 = Math.random() * Math.PI * 2;
  const f2 = Math.random() * Math.PI * 2;

  /**
   * Dónde va una nave. `tc` es su tiempo en el camino (las cazadoras van atrasadas: entran después) y
   * `tg` el de la escena (se van todas juntas, así ninguna queda en pantalla cuando termina).
   */
  const camino = (tc: number, tg: number, salida: THREE.Vector3) => {
    const entra = 1 - suave(THREE.MathUtils.clamp(tc / 1.8, 0, 1));
    const sale = suave(THREE.MathUtils.clamp((tg - (vida - 2.2)) / 2.2, 0, 1));
    const x = centroX + amplitudX * Math.sin(w * tc + f1) + 0.75 * entra + 0.8 * sale;
    // Un ocho (Lissajous 1:2): sube y baja el doble de rápido de lo que va y viene.
    const y = centroY + 0.28 * Math.sin(2 * w * tc + f2) + 0.35 * sale;
    return salida.set(lado * ancho * x, alto * y, z);
  };

  const antes = new THREE.Vector3();
  const despues = new THREE.Vector3();
  const objetivo = new THREE.Vector3();
  const costado = new THREE.Vector3();
  const ARRIBA = new THREE.Vector3(0, 1, 0);
  let tPrevio = -1;
  let ultimoDisparo = -10;
  let siguienteDisparo = 0;
  let siguienteTirador = 1;
  let esquiveDesde = -10;

  return {
    obj: raiz,
    clase: "ovni",
    radio: presa.nave.alcance * escala + 0.25,
    nace: t,
    vida,
    propios: [...pilotos.map((piloto) => piloto.nave.matRayo), ...disparos.map((d) => d.material)],
    liberar: () => {
      pilotos.forEach((piloto) => piloto.nave.liberar());
      geoDisparo.dispose();
    },
    mover: (p, tt) => {
      const tg = p * vida;
      const dt = tPrevio < 0 ? 0 : THREE.MathUtils.clamp(tt - tPrevio, 0, 0.1);
      tPrevio = tt;

      for (const piloto of pilotos) {
        const tc = tg - piloto.retraso;
        camino(tc, tg, piloto.pos);
        piloto.pos.y += piloto.dy;
        piloto.pos.z += piloto.dz;
        piloto.velocidad.subVectors(camino(tc + 0.05, tg + 0.05, despues), camino(tc - 0.05, tg - 0.05, antes)).divideScalar(0.1);
      }
      // La raíz va con la presa (lo que se toca es ella); las demás se ubican respecto de ella.
      raiz.position.copy(presa.pos);

      const esquive = (tt - esquiveDesde) / ESQUIVE;
      for (const piloto of pilotos) {
        const { nave, velocidad, vaiven } = piloto;
        vaivenDe(nave.modelo, tt, piloto.fase, vaiven);
        const rumbo = velocidad.x >= 0 ? 1 : -1;
        nave.grupo.position.subVectors(piloto.pos, presa.pos);
        nave.grupo.position.x += rumbo * vaiven.x * escala * 0.4;
        nave.grupo.position.y += vaiven.y * escala * 0.4;
        const tirabuzon = piloto === presa && esquive >= 0 && esquive < 1 ? suave(esquive) * Math.PI * 2 : 0;
        if (tieneNariz(nave.modelo)) {
          // Se da vuelta de a poco para mirar a donde va (en el giro pasa de perfil) y sube o baja la nariz.
          piloto.giro += ((rumbo > 0 ? 0 : Math.PI) - piloto.giro) * Math.min(1, dt * 4);
          const nariz = THREE.MathUtils.clamp(Math.atan2(velocidad.y, Math.abs(velocidad.x) + 0.5), -0.6, 0.6);
          nave.grupo.rotation.set(0.2 + tirabuzon, piloto.giro + vaiven.giroY, nariz + vaiven.giroZ * 0.5);
        } else {
          const banco = THREE.MathUtils.clamp((-velocidad.x / ancho) * 1.2, -0.45, 0.45);
          nave.grupo.rotation.set(0.2 + tirabuzon, vaiven.giroY, banco + vaiven.giroZ);
        }
        nave.animar(tt, kit.sonido?.espectro);
      }

      // En los chasquidos tira una cazadora (de a una, turnándose), con su tope de 2 por segundo y
      // solo mientras están en pantalla.
      const sonido = kit.sonido;
      if (sonido?.chasquidoAhora && cuantas > 1 && tt - ultimoDisparo >= ENTRE_DISPAROS && tg > 2 && tg < vida - 2.4) {
        const tirador = pilotos[siguienteTirador];
        siguienteTirador = siguienteTirador + 1 < cuantas ? siguienteTirador + 1 : 1;
        // Apunta adonde va a estar la presa, corrido un poco de costado: el láser pasa rozando.
        objetivo.copy(presa.pos).addScaledVector(presa.velocidad, 0.2);
        const d = disparos[siguienteDisparo];
        d.direccion.subVectors(objetivo, tirador.pos);
        costado.set(-d.direccion.y, d.direccion.x, 0);
        if (costado.lengthSq() > 1e-6) costado.normalize();
        objetivo.addScaledVector(costado, (Math.random() < 0.5 ? -1 : 1) * presa.nave.radio * escala * azar(1.2, 1.7));
        d.direccion.subVectors(objetivo, tirador.pos);
        d.distancia = d.direccion.length();
        if (d.distancia > 0.3) {
          ultimoDisparo = tt;
          siguienteDisparo = (siguienteDisparo + 1) % DISPAROS;
          d.direccion.divideScalar(d.distancia);
          d.origen.copy(tirador.pos);
          d.desde = tt;
          d.malla.quaternion.setFromUnitVectors(ARRIBA, d.direccion);
          d.material.color.set(COLOR_NAVE[tirador.nave.modelo]).lerp(BLANCO, 0.45);
          d.malla.visible = true;
          // La presa lo ve venir y esquiva.
          esquiveDesde = tt + 0.1;
        }
      }

      for (const d of disparos) {
        if (!d.malla.visible) continue;
        const k = (tt - d.desde) / VIDA_DISPARO;
        if (k < 0 || k >= 1) {
          d.malla.visible = false;
          continue;
        }
        // Viaja derecho (en el mundo, aunque la raíz siga a la presa) y se apaga mientras sigue de largo.
        const recorrido = k * (d.distancia + PASA_DE_LARGO);
        const cola = Math.max(0, recorrido - LARGO_DISPARO);
        d.malla.position.copy(d.origen).addScaledVector(d.direccion, cola).sub(raiz.position);
        d.malla.scale.set(1, Math.max(0.001, recorrido - cola), 1);
        d.material.opacity = 0.85 * (k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88);
      }
    },
  };
}

// ————————————————————————————— Entrada —————————————————————————————

/**
 * Hace nacer una escena de costado. `lado` es -1 (izquierda) o 1 (derecha); si no se pasa, al azar.
 * Cada una arranca afuera de la pantalla o en cero (sin fogonazo) y termina igual.
 */
export function nacerEscena(tipo: TipoCostado, kit: Kit, t: number, aspecto: number, lado: 1 | -1 = Math.random() < 0.5 ? -1 : 1): Actor {
  switch (tipo) {
    case "cometa":
      return nacerCometa(kit, t, aspecto, lado);
    case "portal":
      return nacerPortal(kit, t, aspecto, lado);
    case "escuadron":
      return nacerEscuadron(kit, t, aspecto, lado);
    case "satelite":
      return nacerSatelite(kit, t, aspecto, lado);
    case "vaca":
      return nacerVaca(kit, t, aspecto, lado);
    case "fugaces":
      return nacerFugaces(t, aspecto, lado);
    case "batalla":
      return nacerBatalla(kit, t, aspecto, lado);
    default:
      return nacerJetpack(kit, t, aspecto, lado);
  }
}

// ————————————————————————————— Nebulosa —————————————————————————————

const NUBES = 4;
/** Segundos que tarda una nube en aparecer o irse. */
const FUNDIDO_NUBE = 6;

/** Nube de gas: manchas suaves superpuestas, con los bordes que se pierden (no se ve el cuadrado). */
function crearTexturaNube(): THREE.CanvasTexture {
  const T = 256;
  const { canvas, ctx } = lienzo(T, T);
  if (ctx) {
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const mancha = (x: number, y: number, radio: number, alfa: number) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radio);
      grad.addColorStop(0, `rgba(255,255,255,${alfa.toFixed(3)})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, T, T);
    };
    for (let i = 0; i < 55; i++) mancha(T / 2 + gauss() * T * 0.22, T / 2 + gauss() * T * 0.18, azar(T * 0.08, T * 0.3), azar(0.04, 0.12));
    // Hebras más chicas encima: le dan textura de gas, no de mancha.
    for (let i = 0; i < 30; i++) mancha(T / 2 + gauss() * T * 0.28, T / 2 + gauss() * T * 0.22, azar(T * 0.03, T * 0.08), azar(0.06, 0.14));
    ctx.globalCompositeOperation = "destination-in";
    const borde = ctx.createRadialGradient(T / 2, T / 2, T * 0.18, T / 2, T / 2, T * 0.5);
    borde.addColorStop(0, "rgba(255,255,255,1)");
    borde.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = borde;
    ctx.fillRect(0, 0, T, T);
  }
  return new THREE.CanvasTexture(canvas);
}

type Nube = {
  malla: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  lado: number;
  nace: number;
  vida: number;
  vx: number;
  vy: number;
  giro: number;
  /** 0 = color A de la paleta, 1 = color B. */
  mezcla: number;
  fuerza: number;
};

/**
 * Nubes de gas bien al fondo, a los costados: derivan, giran despacio y cada tanto se van y vuelven
 * en otro lugar, con otra forma y otra mezcla de la paleta. El brillo sigue `brillo` (lento) y el
 * color se funde con la paleta en ~2 s: nada cambia de golpe en un área tan grande.
 */
export function crearNebulosa(): Pieza {
  const grupo = new THREE.Group();
  const texturas = [crearTexturaNube(), crearTexturaNube()];
  const geometria = new THREE.PlaneGeometry(1, 1);
  const nubes: Nube[] = Array.from({ length: NUBES }, (_, i) => {
    const material = new THREE.MeshBasicMaterial({
      map: texturas[i % 2],
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      // Están lejos a propósito: con niebla se apagarían del todo.
      fog: false,
    });
    const malla = new THREE.Mesh(geometria, material);
    malla.renderOrder = -1;
    grupo.add(malla);
    return { malla, material, lado: i % 2 === 0 ? -1 : 1, nace: 0, vida: 1, vx: 0, vy: 0, giro: 0, mezcla: 0, fuerza: 1 };
  });
  const meta = new THREE.Color();
  let armada = false;

  /** La vuelve a poner en otro lugar. `fraccion` = cuánto de su vida ya pasó (para arrancar escalonadas). */
  const rearmar = (nube: Nube, reloj: number, aspecto: number, fraccion: number) => {
    const z = azar(-60, -42);
    const alto = medioAlto(z);
    const ancho = alto * aspecto;
    // Casi siempre de su lado; a veces cruza y quedan dos del mismo.
    if (Math.random() < 0.25) nube.lado = -nube.lado;
    const tamano = alto * azar(0.75, 1.25);
    nube.malla.position.set(nube.lado * ancho * azar(0.45, 0.95), alto * azar(-0.45, 0.55), z);
    // Estirada, espejada y girada distinto cada vez: la misma textura arma formas distintas.
    nube.malla.scale.set(tamano * azar(0.8, 1.5) * (Math.random() < 0.5 ? -1 : 1), tamano * azar(0.6, 1.1), 1);
    nube.malla.rotation.z = azar(0, Math.PI * 2);
    nube.vida = azar(26, 42);
    nube.nace = reloj - nube.vida * fraccion;
    nube.vx = azar(-0.25, 0.25);
    nube.vy = azar(-0.12, 0.12);
    nube.giro = azar(-0.012, 0.012);
    nube.mezcla = Math.random();
    nube.fuerza = azar(0.75, 1.15);
  };

  return {
    obj: grupo,
    actualizar: (m) => {
      if (!armada) {
        armada = true;
        for (let i = 0; i < nubes.length; i++) rearmar(nubes[i], m.reloj, m.aspecto, 0.12 + i * 0.2);
      }
      for (let i = 0; i < nubes.length; i++) {
        const nube = nubes[i];
        if (m.reloj - nube.nace >= nube.vida) rearmar(nube, m.reloj, m.aspecto, 0);
        const edad = m.reloj - nube.nace;
        const aparece = THREE.MathUtils.clamp(Math.min(edad, nube.vida - edad) / FUNDIDO_NUBE, 0, 1);
        nube.malla.position.x += nube.vx * m.dt;
        nube.malla.position.y += nube.vy * m.dt;
        nube.malla.rotation.z += nube.giro * m.dt;
        meta.copy(m.colorA).lerp(m.colorB, nube.mezcla);
        nube.material.color.lerp(meta, Math.min(1, m.dt * 0.5));
        nube.material.opacity = Math.min(0.18, aparece * (0.08 + m.brillo * 0.06) * nube.fuerza);
      }
    },
    liberar: () => {
      geometria.dispose();
      texturas.forEach((textura) => textura.dispose());
      nubes.forEach((nube) => nube.material.dispose());
    },
  };
}

// ————————————————————————————— Formación del drop —————————————————————————————
// En el drop, una flotilla de navecitas entra desde los costados y dibuja "51" o una "A" en el cielo,
// arriba y atrás de la nodriza: llegan de a una en el orden del trazo (el texto se escribe solo), las
// une un hilo de luz, lo sostienen unos compases con los halos al ritmo (cada una sigue una banda,
// graves a la izquierda y agudos a la derecha) y se desarman abriéndose hacia arriba y el fondo.
// Todo instanciado: 4 llamadas de dibujo para toda la flotilla.

export type TextoFormacion = "51" | "A";

type Glifo = {
  /** Lugar de cada navecita (x, y), con el alto del texto = 1. En el orden del trazo: así llegan. */
  puntos: readonly (readonly [number, number])[];
  /** Qué navecitas une un hilo de luz. */
  enlaces: readonly (readonly [number, number])[];
  ancho: number;
};

/** Un trazo seguido: une cada navecita con la siguiente, de `desde` a `hasta`. */
function trazo(desde: number, hasta: number): [number, number][] {
  return Array.from({ length: hasta - desde }, (_, k) => [desde + k, desde + k + 1]);
}

const GLIFOS: Record<TextoFormacion, Glifo> = {
  "51": {
    puntos: [
      // El 5: la barra de arriba de derecha a izquierda, el palito que baja y la panza.
      [0.6, 1],
      [0.4, 1],
      [0.2, 1],
      [0, 1],
      [0, 0.785],
      [0, 0.57],
      [0.18, 0.635],
      [0.38, 0.625],
      [0.54, 0.52],
      [0.62, 0.34],
      [0.58, 0.15],
      [0.44, 0.02],
      [0.24, 0],
      [0.06, 0.08],
      // El 1: la banderita, el palo de arriba abajo y la base.
      [0.91, 0.85],
      [1.08, 1],
      [1.08, 0.8],
      [1.08, 0.6],
      [1.08, 0.4],
      [1.08, 0.2],
      [1.08, 0],
      [0.88, 0],
      [1.28, 0],
    ],
    enlaces: [...trazo(0, 13), ...trazo(14, 20), [20, 21], [20, 22]],
    ancho: 1.28,
  },
  A: {
    puntos: [
      // Las dos patas, de abajo a la izquierda a abajo a la derecha pasando por la punta, y el travesaño.
      [0, 0],
      [0.075, 1 / 6],
      [0.15, 2 / 6],
      [0.225, 3 / 6],
      [0.3, 4 / 6],
      [0.375, 5 / 6],
      [0.45, 1],
      [0.525, 5 / 6],
      [0.6, 4 / 6],
      [0.675, 3 / 6],
      [0.75, 2 / 6],
      [0.825, 1 / 6],
      [0.9, 0],
      [0.3, 2 / 6],
      [0.45, 2 / 6],
      [0.6, 2 / 6],
    ],
    enlaces: [...trazo(0, 12), [2, 13], [13, 14], [14, 15], [15, 10]],
    ancho: 0.9,
  },
};

const MAX_NAVECITAS = 24;
const MAX_ENLACES = 24;
/** Bien atrás de la nodriza (z -6), antes de la nebulosa. */
const Z_FORMACION = -24;
/** Llegan desde más cerca de la cámara: se meten en el fondo mientras se acomodan. */
const Z_LLEGADA = Z_FORMACION + 9;
/** Llegan de a una (en el orden del trazo) y cada una vuela esto. */
const ESCALON_LLEGADA = 0.055;
const VUELO_LLEGADA = 1.5;
/** Unos compases armada, después de que llegó la última. */
const SOSTIENE = 4.8;
/** El hilo de luz crece de una navecita a la otra cuando llegaron las dos, y se apaga antes de que se vayan. */
const CRECE_ENLACE = 0.35;
const FUNDE_ENLACES = 0.45;
const ESCALON_SALIDA = 0.03;
const VUELO_SALIDA = 1.4;
/** En fracciones del alto del texto: el radio de cada navecita y el grosor del hilo. */
const RADIO_NAVECITA = 0.075;
const GROSOR_ENLACE = 0.011;
/** El halo de atrás, en radios de navecita. */
const HALO_NAVECITA = 2.7;
/** Hasta qué banda llega la derecha del texto (las últimas casi nunca suenan). */
const BANDA_MAXIMA = 0.78;
const NEGRO = new THREE.Color(0);

type Navecita = {
  /** Su lugar en el texto (mundo): se recalcula cada cuadro (cambia con la pantalla). */
  meta: THREE.Vector3;
  pos: THREE.Vector3;
  previa: THREE.Vector3;
  /** Dónde estaba cuando empezó a irse. */
  salida: THREE.Vector3;
  /** 0 a 1, de izquierda a derecha en el texto: su color y su banda. */
  mezcla: number;
  /** -1..1 desde el centro del texto: para dónde se abre al irse. */
  haciaX: number;
  haciaY: number;
  /** De qué costado llega. */
  lado: number;
  alturaEntrada: number;
  fase: number;
  nivel: number;
  banco: number;
  aparecio: boolean;
  yendose: boolean;
  recien: boolean;
};

export type Formacion = Pieza & {
  /** Arma el texto en el cielo (arranca en el próximo cuadro). false si ya hay una en el cielo. */
  armar: (texto: TextoFormacion) => boolean;
  /** La desarma ya, con su salida de siempre (por ejemplo, si empieza el juego). */
  deshacer: () => void;
  /** true mientras hay navecitas en el cielo (o una pedida). */
  activa: () => boolean;
};

/** La navecita: el platillo simplificado (a este tamaño sobran los escalones), en sus unidades (radio 1,62). */
function crearGeometriasNavecita() {
  const v = (x: number, y: number) => new THREE.Vector2(x, y);
  const casco = new THREE.LatheGeometry(
    [v(0, -0.34), v(0.42, -0.3), v(0.64, -0.2), v(1.0, -0.15), v(1.36, -0.08), v(1.62, 0), v(1.44, 0.1), v(1.08, 0.165), v(0.64, 0.285), v(0, 0.3)],
    20
  );
  // Lo que brilla, en una sola malla: la banda del borde y la cúpula.
  const banda = new THREE.TorusGeometry(1.6, 0.08, 6, 28).rotateX(Math.PI / 2);
  const cupula = new THREE.SphereGeometry(0.6, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.27, 0);
  const neon = mergeGeometries([banda, cupula]);
  banda.dispose();
  cupula.dispose();
  return { casco, neon };
}

export function crearFormacion(kit: Kit): Formacion {
  const grupo = new THREE.Group();
  const geo = crearGeometriasNavecita();
  const geoHalo = new THREE.PlaneGeometry(1, 1);
  const geoEnlace = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true).translate(0, 0.5, 0);
  // Sin niebla lo que brilla: están lejos y tienen que leerse.
  const matNeon = new THREE.MeshBasicMaterial({ fog: false });
  const matHalo = new THREE.MeshBasicMaterial({ map: kit.puntoRedondo, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const matEnlace = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const cascos = new THREE.InstancedMesh(geo.casco, kit.casco, MAX_NAVECITAS);
  const neones = new THREE.InstancedMesh(geo.neon, matNeon, MAX_NAVECITAS);
  const halos = new THREE.InstancedMesh(geoHalo, matHalo, MAX_NAVECITAS);
  const enlaces = new THREE.InstancedMesh(geoEnlace, matEnlace, MAX_ENLACES);
  const mallas = [cascos, neones, halos, enlaces];
  for (const malla of mallas) {
    malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Se mueven por toda la pantalla: la esfera de recorte que three calcula una vez no sirve.
    malla.frustumCulled = false;
    malla.count = 0;
    grupo.add(malla);
  }
  // El color por instancia va desde el principio: si se agregara después, three recompilaría el
  // programa justo en el drop (un tirón).
  for (let i = 0; i < MAX_NAVECITAS; i++) {
    neones.setColorAt(i, NEGRO);
    halos.setColorAt(i, NEGRO);
  }
  for (let i = 0; i < MAX_ENLACES; i++) enlaces.setColorAt(i, NEGRO);

  const navecitas: Navecita[] = Array.from({ length: MAX_NAVECITAS }, () => ({
    meta: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    previa: new THREE.Vector3(),
    salida: new THREE.Vector3(),
    mezcla: 0,
    haciaX: 0,
    haciaY: 0,
    lado: 1,
    alturaEntrada: 0,
    fase: 0,
    nivel: 0,
    banco: 0,
    aparecio: false,
    yendose: false,
    recien: true,
  }));

  let glifo: Glifo | null = null;
  let pedido: TextoFormacion | null = null;
  let pedirSalida = false;
  let desde = 0;
  /** Segundos (desde que se armó) en que empieza a desarmarse. */
  let tSalida = 0;
  // Los primeros cuadros se dibujan vacías: three compila sus programas al arrancar y no en el drop.
  let calentar = 2;

  const aux = new THREE.Object3D();
  const cero = new THREE.Matrix4().makeScale(0, 0, 0);
  const color = new THREE.Color();
  const dir = new THREE.Vector3();
  const c1 = new THREE.Vector3();
  const c2 = new THREE.Vector3();
  const inicio = new THREE.Vector3();
  const fin = new THREE.Vector3();
  const ARRIBA = new THREE.Vector3(0, 1, 0);

  const ocultar = () => {
    for (const malla of mallas) {
      malla.visible = false;
      malla.count = 0;
    }
  };

  const arrancar = (texto: TextoFormacion, reloj: number) => {
    const g = GLIFOS[texto];
    glifo = g;
    desde = reloj;
    const n = g.puntos.length;
    tSalida = (n - 1) * ESCALON_LLEGADA + VUELO_LLEGADA + SOSTIENE;
    for (let i = 0; i < n; i++) {
      const nav = navecitas[i];
      const [px, py] = g.puntos[i];
      nav.mezcla = px / g.ancho;
      nav.haciaX = (px - g.ancho / 2) / (g.ancho / 2);
      nav.haciaY = (py - 0.5) * 2;
      // Las de la izquierda del texto llegan por la izquierda; las del medio, de un lado o del otro.
      nav.lado = Math.abs(nav.haciaX) < 0.05 ? (i % 2 === 0 ? -1 : 1) : Math.sign(nav.haciaX);
      nav.alturaEntrada = azar(-0.5, 0.5);
      nav.fase = Math.random() * Math.PI * 2;
      nav.nivel = 0;
      nav.banco = 0;
      nav.aparecio = false;
      nav.yendose = false;
      nav.recien = true;
    }
    for (const malla of mallas) malla.visible = true;
    cascos.count = neones.count = halos.count = n;
    enlaces.count = g.enlaces.length;
  };

  return {
    obj: grupo,
    armar: (texto) => {
      if (glifo || pedido) return false;
      pedido = texto;
      return true;
    },
    deshacer: () => {
      pedido = null;
      if (glifo) pedirSalida = true;
    },
    activa: () => glifo !== null || pedido !== null,
    actualizar: (m) => {
      if (pedido) {
        arrancar(pedido, m.reloj);
        pedido = null;
      }
      if (!glifo) {
        if (calentar > 0) {
          calentar--;
          for (const malla of mallas) malla.visible = true;
        } else {
          ocultar();
        }
        return;
      }
      const g: Glifo = glifo;
      const n = g.puntos.length;
      const tau = m.reloj - desde;
      if (pedirSalida) {
        pedirSalida = false;
        tSalida = Math.min(tSalida, tau);
      }
      const dt = m.dt;

      // Dónde va el texto: arriba de la nodriza y abajo del borde, lo más grande que entre. Arriba del
      // aro del espectro están los agudos, que casi siempre son barras cortas: el techo es el aro y un
      // poco más (centro de la nodriza 1 por encima de la cámara, aro de 3,6 por su escala).
      const alto = medioAlto(Z_FORMACION);
      const e = THREE.MathUtils.clamp(m.aspecto / 0.85, 0.5, 1);
      const techo = (1 + 3.95 * e) / medioAlto(-6);
      const altoTexto = THREE.MathUtils.clamp(Math.min(0.44, (1.5 * m.aspecto) / g.ancho, 0.87 - techo), 0.24, 0.44);
      const centro = Math.min(techo + 0.03 + altoTexto / 2, 0.9 - altoTexto / 2);
      const H = altoTexto * alto;
      const izquierda = -(g.ancho / 2) * H;
      const abajo = 0.6 + centro * alto - H / 2;
      const anchoLlegada = medioAlto(Z_LLEGADA) * m.aspecto;
      const r = RADIO_NAVECITA * H;

      for (let i = 0; i < n; i++) {
        const nav = navecitas[i];
        const [px, py] = g.puntos[i];
        nav.meta.set(izquierda + px * H, abajo + py * H, Z_FORMACION);

        // Su luz es un ecualizador: sube rápido y baja despacio, nunca de un cuadro al otro.
        const banda = Math.min(m.espectro.length - 1, Math.floor(nav.mezcla * BANDA_MAXIMA * m.espectro.length));
        const valor = m.espectro[banda];
        const metaNivel = Number.isFinite(valor) ? THREE.MathUtils.clamp(valor, 0, 1) : 0;
        nav.nivel += (metaNivel - nav.nivel) * Math.min(1, dt * (metaNivel > nav.nivel ? 9 : 3.5));

        const tLlega = tau - i * ESCALON_LLEGADA;
        const tSale = tau - (tSalida + FUNDE_ENLACES * 0.6 + i * ESCALON_SALIDA);
        let presencia = 1;
        let tam = 1;
        if (tSale > 0 && nav.aparecio) {
          if (!nav.yendose) {
            nav.yendose = true;
            nav.salida.copy(nav.pos);
          }
          // Se abre hacia su lado y para arriba, acelerando, y se pierde en el fondo.
          const k = Math.min(1, tSale / VUELO_SALIDA);
          const u = k * k;
          inicio.copy(nav.salida);
          c1.set(inicio.x + nav.haciaX * H * 0.5, inicio.y + H * 0.9, inicio.z);
          fin.set(inicio.x + nav.haciaX * alto * m.aspecto * 1.2 + nav.lado * H * 0.5, inicio.y + alto * 1.1 + nav.haciaY * H * 0.5, inicio.z - 14);
          nav.pos
            .copy(inicio)
            .multiplyScalar((1 - u) * (1 - u))
            .addScaledVector(c1, 2 * u * (1 - u))
            .addScaledVector(fin, u * u);
          presencia = 1 - suave(Math.min(1, k / 0.85));
          tam = k > 0.75 ? 1 - suave((k - 0.75) / 0.25) : 1;
        } else if (tLlega <= 0 || tSale > 0) {
          // Todavía no salió (o se desarmó antes de que llegara a salir): no está.
          presencia = 0;
          tam = 0;
        } else {
          nav.aparecio = true;
          const kL = Math.min(1, tLlega / VUELO_LLEGADA);
          // Frena al llegar (sale rápido y se acomoda despacio).
          const u = 1 - (1 - kL) * (1 - kL) * (1 - kL);
          // Entra por su costado, hace un arco por arriba y llega a su lugar desde un poco más afuera.
          inicio.set(nav.lado * (anchoLlegada + 3), nav.meta.y + (nav.alturaEntrada - 0.6) * H, Z_LLEGADA);
          c1.set(inicio.x * 0.55 + nav.meta.x * 0.45, inicio.y + H * 1.1, inicio.z + (nav.meta.z - inicio.z) * 0.4);
          c2.set(nav.meta.x + nav.lado * H * 0.7, nav.meta.y + H * 0.35, nav.meta.z);
          const a = (1 - u) * (1 - u) * (1 - u);
          const b = 3 * u * (1 - u) * (1 - u);
          const c = 3 * u * u * (1 - u);
          const d = u * u * u;
          nav.pos.copy(inicio).multiplyScalar(a).addScaledVector(c1, b).addScaledVector(c2, c).addScaledVector(nav.meta, d);
          // Ya en su lugar flota y salta con su banda (se mueve, no cambia de brillo).
          nav.pos.y += (Math.sin(m.reloj * 1.6 + nav.fase) * 0.025 + nav.nivel * 0.05) * H * kL;
          nav.pos.x += Math.sin(m.reloj * 0.9 + nav.fase) * 0.012 * H * kL;
          presencia = suave(Math.min(1, kL / 0.4));
        }

        // Se inclina hacia donde va, como un platillo de verdad (desde el segundo cuadro en que se ve).
        if (tam === 0) {
          nav.recien = true;
        } else {
          if (!nav.recien && dt > 0) {
            const vx = (nav.pos.x - nav.previa.x) / dt;
            const metaBanco = THREE.MathUtils.clamp((-vx / H) * 0.12, -0.7, 0.7);
            nav.banco += (metaBanco - nav.banco) * Math.min(1, dt * 6);
          }
          nav.recien = false;
          nav.previa.copy(nav.pos);
        }

        const s = (r / 1.62) * tam;
        if (s < 1e-4) {
          cascos.setMatrixAt(i, cero);
          neones.setMatrixAt(i, cero);
        } else {
          // La cámara las ve desde abajo: se inclinan lo que haga falta para que se vea la cúpula.
          aux.position.copy(nav.pos);
          aux.rotation.set(Math.atan2(nav.pos.y - 0.6, CAMARA_Z - nav.pos.z) + 0.3, 0, nav.banco);
          aux.scale.setScalar(s);
          aux.updateMatrix();
          cascos.setMatrixAt(i, aux.matrix);
          neones.setMatrixAt(i, aux.matrix);
        }
        // El halo, atrás: el casco le tapa el centro y la navecita queda a contraluz. Late con su banda,
        // pero poco: en un celu parado el texto ocupa un tercio de la mitad de arriba.
        const tamHalo = HALO_NAVECITA * r * presencia * (0.8 + 0.45 * nav.nivel);
        if (tamHalo < 1e-4) {
          halos.setMatrixAt(i, cero);
        } else {
          aux.position.set(nav.pos.x, nav.pos.y, nav.pos.z - r * 0.8);
          aux.rotation.set(0, 0, 0);
          aux.scale.set(tamHalo, tamHalo, 1);
          aux.updateMatrix();
          halos.setMatrixAt(i, aux.matrix);
        }
        color.copy(m.colorA).lerp(m.colorB, nav.mezcla).lerp(BLANCO, 0.25);
        neones.setColorAt(i, color);
        halos.setColorAt(i, color.multiplyScalar(0.6));
      }

      // Los hilos de luz: crecen de la navecita que llegó primero a la otra, y se apagan antes de la salida.
      const funde = 1 - suave(THREE.MathUtils.clamp((tau - tSalida) / FUNDE_ENLACES, 0, 1));
      for (let j = 0; j < g.enlaces.length; j++) {
        const [a, b] = g.enlaces[j];
        const primera = navecitas[Math.min(a, b)];
        const segunda = navecitas[Math.max(a, b)];
        const listo = tau - (Math.max(a, b) * ESCALON_LLEGADA + VUELO_LLEGADA);
        const crece = suave(THREE.MathUtils.clamp(listo / CRECE_ENLACE, 0, 1));
        const f = crece * funde;
        dir.subVectors(segunda.pos, primera.pos);
        const largo = dir.length();
        if (f < 0.002 || largo < 1e-4 || !primera.aparecio || !segunda.aparecio) {
          enlaces.setMatrixAt(j, cero);
          continue;
        }
        dir.divideScalar(largo);
        aux.position.copy(primera.pos);
        aux.quaternion.setFromUnitVectors(ARRIBA, dir);
        aux.scale.set(GROSOR_ENLACE * H, largo * crece, GROSOR_ENLACE * H);
        aux.updateMatrix();
        enlaces.setMatrixAt(j, aux.matrix);
        // Con mezcla aditiva, oscurecer el color es lo mismo que bajarle la opacidad (por hilo).
        color
          .copy(m.colorA)
          .lerp(m.colorB, (primera.mezcla + segunda.mezcla) / 2)
          .lerp(BLANCO, 0.35)
          .multiplyScalar(f * (0.5 + m.brillo * 0.2));
        enlaces.setColorAt(j, color);
      }

      for (const malla of mallas) {
        malla.instanceMatrix.needsUpdate = true;
        if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
      }

      // Se fue la última: listo para el próximo drop.
      if (tau > tSalida + FUNDE_ENLACES * 0.6 + (n - 1) * ESCALON_SALIDA + VUELO_SALIDA) {
        glifo = null;
        ocultar();
      }
    },
    liberar: () => {
      geo.casco.dispose();
      geo.neon.dispose();
      geoHalo.dispose();
      geoEnlace.dispose();
      matNeon.dispose();
      matHalo.dispose();
      matEnlace.dispose();
      mallas.forEach((malla) => malla.dispose());
    },
  };
}
