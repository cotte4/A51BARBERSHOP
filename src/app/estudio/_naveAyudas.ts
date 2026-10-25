import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { conBorde } from "./_naveMateriales";

// Lo que se ve de las ayudas del juego y de las habilidades de cada nave: la cápsula que se agarra,
// la burbuja del escudo, el campo del imán y el láser. La lógica (cuándo sale, qué agarra, a qué le
// pega) vive en _naveJuego.ts; acá solo se dibuja.
//
// Fotosensibilidad: la burbuja entra y sale con rampas (nunca de un cuadro al otro), el campo del
// imán es tenue y gira lento, y el láser es finito y lo limita el juego a 2 por segundo.

export const TIPOS_AYUDA = ["escudo", "iman", "laser"] as const;
export type TipoAyuda = (typeof TIPOS_AYUDA)[number];

/**
 * Un color por ayuda, distinto de la estrella (que va con el color A del tema): la cápsula, su marca,
 * la burbuja, el campo y el ícono del marcador usan el mismo.
 */
export const COLOR_AYUDA: Record<TipoAyuda, number> = {
  escudo: 0x5ad8ff,
  iman: 0xff5ad1,
  laser: 0xffd84a,
};

export const NOMBRE_AYUDA: Record<TipoAyuda, string> = {
  escudo: "Escudo",
  iman: "Imán",
  laser: "Láser",
};

/** El color de la ayuda para CSS ("#5ad8ff"). */
export const colorAyudaCss = (tipo: TipoAyuda) => `#${COLOR_AYUDA[tipo].toString(16).padStart(6, "0")}`;

const BLANCO = new THREE.Color(0xffffff);

// ————————————————————————————— Cápsula —————————————————————————————

/** Radio de la cápsula en la compu (en el celu, más chica con la nave): para agarrarla. */
export const RADIO_CAPSULA = 0.55;

/** Ícono de adentro de cada cápsula: se reconoce la ayuda antes de agarrarla. */
function crearNucleos(): Record<TipoAyuda, THREE.BufferGeometry> {
  // Escudo: una gema facetada (la burbuja en chiquito).
  const escudo = new THREE.IcosahedronGeometry(0.17, 0);
  // Imán: la herradura, con las puntas un poco más gruesas.
  const arco = new THREE.TorusGeometry(0.13, 0.05, 8, 20, Math.PI).rotateZ(Math.PI);
  const patas = [-1, 1].map((lado) => new THREE.CylinderGeometry(0.058, 0.058, 0.13, 10).translate(lado * 0.13, 0.065, 0));
  const piezasIman = [arco, ...patas];
  piezasIman.forEach((g) => g.deleteAttribute("uv"));
  const iman = mergeGeometries(piezasIman).translate(0, -0.02, 0);
  piezasIman.forEach((g) => g.dispose());
  // Láser: un rombo largo, como un haz congelado.
  const laser = new THREE.OctahedronGeometry(0.15, 0).scale(1.9, 0.55, 0.55);
  return { escudo, iman, laser };
}

/**
 * La cápsula de una ayuda: una pastilla de vidrio acostada, con dos aros de neón y el ícono adentro,
 * del color de la ayuda. No se confunde con la estrella (cinco puntas del color del tema). Hay
 * una sola en pantalla a la vez: cambia de materiales según el tipo.
 */
export function crearCapsula() {
  const grupo = new THREE.Group();
  grupo.visible = false;
  const cuerpo = new THREE.Group();
  grupo.add(cuerpo);

  const geometriaCascara = new THREE.CapsuleGeometry(0.3, 0.5, 6, 18).rotateZ(Math.PI / 2);
  const aros = [-1, 1].map((lado) => new THREE.TorusGeometry(0.312, 0.03, 8, 36).rotateY(Math.PI / 2).translate(lado * 0.27, 0, 0));
  const geometriaAros = mergeGeometries(aros);
  aros.forEach((g) => g.dispose());
  const nucleos = crearNucleos();
  const geometriaHalo = new THREE.SphereGeometry(1, 20, 14);
  const geometriaMarca = new THREE.RingGeometry(0.86, 1, 48);

  const materiales = Object.fromEntries(
    TIPOS_AYUDA.map((tipo) => {
      const color = new THREE.Color(COLOR_AYUDA[tipo]);
      // Vidrio teñido que refleja el estudio; el borde se prende claro, así la silueta se lee de lejos.
      const cascara = conBorde(
        new THREE.MeshStandardMaterial({
          color: color.clone().multiplyScalar(0.25),
          emissive: color,
          emissiveIntensity: 0.18,
          metalness: 0.1,
          roughness: 0.12,
          envMapIntensity: 1.6,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          fog: false,
        }),
        { value: color.clone().lerp(BLANCO, 0.55) },
        1.3,
        2.2
      );
      return [
        tipo,
        {
          cascara,
          luz: new THREE.MeshBasicMaterial({ color: color.clone().lerp(BLANCO, 0.35), fog: false }),
          halo: new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, fog: false }),
          marca: new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
        },
      ];
    })
  ) as Record<TipoAyuda, { cascara: THREE.MeshStandardMaterial; luz: THREE.MeshBasicMaterial; halo: THREE.MeshBasicMaterial; marca: THREE.MeshBasicMaterial }>;

  const nucleo = new THREE.Mesh(nucleos.escudo, materiales.escudo.luz);
  const anillos = new THREE.Mesh(geometriaAros, materiales.escudo.luz);
  const cascara = new THREE.Mesh(geometriaCascara, materiales.escudo.cascara);
  // El vidrio después del ícono: se ve el ícono a través.
  cascara.renderOrder = 1;
  cuerpo.add(nucleo, anillos, cascara);
  const halo = new THREE.Mesh(geometriaHalo, materiales.escudo.halo);
  grupo.add(halo);
  const marca = new THREE.Mesh(geometriaMarca, materiales.escudo.marca);
  marca.visible = false;

  let tipoActual: TipoAyuda = "escudo";

  return {
    obj: grupo,
    /** La marca va aparte: vive en el plano de la nave, no se mueve con la cápsula. */
    marca,

    /**
     * La pone en `pos` con su tamaño (`escala`, que ya trae el achique al pasar la cámara). `prende`
     * (0..1): cuánto se ve la marca en (`pos.x`, `pos.y`, `zPlano`); `radioMarca`, su radio en el mundo.
     */
    poner: (tipo: TipoAyuda, pos: THREE.Vector3, escala: number, reloj: number, fase: number, prende: number, zPlano: number, radioMarca: number) => {
      if (tipo !== tipoActual) {
        tipoActual = tipo;
        const m = materiales[tipo];
        nucleo.geometry = nucleos[tipo];
        nucleo.material = m.luz;
        anillos.material = m.luz;
        cascara.material = m.cascara;
        halo.material = m.halo;
        marca.material = m.marca;
      }
      grupo.visible = true;
      grupo.position.copy(pos);
      grupo.scale.setScalar(escala);
      // La pastilla da vueltas despacio y cabecea: se ve de costado, de punta y de frente.
      cuerpo.rotation.set(Math.sin(reloj * 1.1 + fase) * 0.5, reloj * 1.6 + fase, Math.sin(reloj * 0.8 + fase) * 0.35);
      // El ícono gira al revés, más rápido: llama la atención sin titilar.
      nucleo.rotation.set(0, -reloj * 3.2, 0);
      halo.scale.setScalar(0.62 + Math.sin(reloj * 3 + fase) * 0.04);

      marca.visible = prende > 0;
      if (prende > 0) {
        marca.position.set(pos.x, pos.y, zPlano);
        // Como la de las estrellas: se cierra sobre el lugar a medida que la cápsula llega.
        marca.scale.setScalar((radioMarca + 0.15) * (1.6 - prende * 0.6));
        (marca.material as THREE.MeshBasicMaterial).opacity = 0.55 * prende;
      }
    },

    ocultar: () => {
      grupo.visible = false;
      marca.visible = false;
    },

    liberar: () => {
      geometriaCascara.dispose();
      geometriaAros.dispose();
      Object.values(nucleos).forEach((g) => g.dispose());
      geometriaHalo.dispose();
      geometriaMarca.dispose();
      Object.values(materiales).forEach((m) => {
        m.cascara.dispose();
        m.luz.dispose();
        m.halo.dispose();
        m.marca.dispose();
      });
    },
  };
}

// ————————————————————————————— Burbuja del escudo —————————————————————————————

/** La burbuja tarda esto en prenderse y en apagarse (el plan pide ~0,3 s al gastarse). */
const BURBUJA_SUBE = 0.45;
const BURBUJA_BAJA = 0.3;

/**
 * Burbuja translúcida alrededor de la nave: casi invisible al centro y prendida en el borde
 * (fresnel), con franjas suaves que suben despacio. Cuando absorbe un golpe se marca de ese lado y
 * se le va. Nunca parpadea: cambia de nivel con rampas.
 */
export function crearBurbuja() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color() },
      uNivel: { value: 0 },
      uTiempo: { value: 0 },
      uGolpeDir: { value: new THREE.Vector3(0, 1, 0) },
      uGolpe: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vVista;
      varying vec3 vLocal;
      void main() {
        vLocal = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vVista = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uNivel;
      uniform float uTiempo;
      uniform vec3 uGolpeDir;
      uniform float uGolpe;
      varying vec3 vNormal;
      varying vec3 vVista;
      varying vec3 vLocal;
      void main() {
        // max(0): por redondeo el dot puede pasar de 1 y la potencia de un negativo es NaN (el bloom
        // lo desparrama y el cuadro sale negro).
        float frente = abs(dot(normalize(vNormal), normalize(vVista)));
        float borde = pow(max(0.0, 1.0 - frente), 2.2);
        // Franjas que suben lento: se lee como un campo, no como vidrio quieto.
        float franjas = 0.8 + 0.2 * sin(vLocal.y * 16.0 - uTiempo * 1.4);
        // El golpe: el lado que recibió el meteorito se prende y se apaga en medio segundo.
        float lado = max(0.0, dot(normalize(vLocal + vec3(1e-4)), uGolpeDir));
        float golpe = uGolpe * lado * lado * lado * lado;
        float a = (0.05 + 0.95 * borde) * franjas + golpe * 0.7;
        gl_FragColor = vec4(uColor * a * uNivel, 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const geometria = new THREE.SphereGeometry(1, 40, 24);
  const malla = new THREE.Mesh(geometria, material);
  malla.visible = false;
  malla.renderOrder = 2;

  let nivel = 0;
  let meta = 0;
  const tmp = new THREE.Vector3();

  return {
    obj: malla,
    /** 0..1: cuánto se ve (0 = apagada). La burbuja llega sola con su rampa. */
    set meta(valor: number) {
      meta = THREE.MathUtils.clamp(valor, 0, 1);
    },
    get nivel() {
      return nivel;
    },

    /** Absorbió un golpe que vino de `desde` (mundo). */
    golpe: (desde: THREE.Vector3) => {
      tmp.subVectors(desde, malla.position);
      if (tmp.lengthSq() < 1e-6) tmp.set(0, 0, 1);
      material.uniforms.uGolpeDir.value.copy(tmp.normalize());
      material.uniforms.uGolpe.value = 1;
    },

    /** `rx`, `ry`: semiejes en el mundo (es un óvalo que envuelve el choque de cada nave). */
    actualizar: (dt: number, reloj: number, centro: THREE.Vector3, rx: number, ry: number, color: THREE.Color) => {
      if (meta > nivel) nivel = Math.min(meta, nivel + dt / BURBUJA_SUBE);
      else nivel = Math.max(meta, nivel - dt / BURBUJA_BAJA);
      malla.visible = nivel > 0.001;
      if (!malla.visible) return;
      malla.position.copy(centro);
      // Respira apenas: está viva.
      const respira = 1 + Math.sin(reloj * 2.2) * 0.015;
      malla.scale.set(rx * respira, ry * respira, rx * respira);
      material.uniforms.uColor.value.copy(color);
      material.uniforms.uNivel.value = suaveNivel(nivel);
      material.uniforms.uTiempo.value = reloj;
      material.uniforms.uGolpe.value *= Math.exp(-dt * 5);
    },

    apagar: () => {
      nivel = 0;
      meta = 0;
      malla.visible = false;
      material.uniforms.uGolpe.value = 0;
    },

    liberar: () => {
      geometria.dispose();
      material.dispose();
    },
  };
}

/** Curva para que las rampas entren y salgan suaves. */
const suaveNivel = (x: number) => x * x * (3 - 2 * x);

// ————————————————————————————— Campo del imán —————————————————————————————

/** Hilos como mucho a la vez (estrellas y la cápsula que el imán está trayendo). */
const HILOS = 8;

/**
 * El imán: un aro punteado en el plano de la nave que marca hasta dónde llega (gira lento) y un
 * hilo tenue a cada estrella que está trayendo, más claro cuanto más tira.
 */
export function crearCampoIman() {
  const grupo = new THREE.Group();
  const materialAro = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uNivel: { value: 0 }, uTiempo: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vPos;
      void main() {
        vPos = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uNivel;
      uniform float uTiempo;
      varying vec2 vPos;
      void main() {
        // El aro no pasa por el centro (radio interior 0,9): atan nunca recibe (0, 0).
        float a = atan(vPos.y, vPos.x) / 6.2831853;
        float rayita = smoothstep(0.35, 0.5, abs(fract(a * 24.0 - uTiempo * 0.15) - 0.5) * 2.0);
        gl_FragColor = vec4(uColor * uNivel * (0.25 + 0.75 * rayita), 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const geometriaAro = new THREE.RingGeometry(0.9, 1, 120, 1);
  const aro = new THREE.Mesh(geometriaAro, materialAro);
  aro.visible = false;

  const posiciones = new Float32Array(HILOS * 2 * 3);
  const colores = new Float32Array(HILOS * 2 * 3);
  const geometriaHilos = new THREE.BufferGeometry();
  const atributoPos = new THREE.BufferAttribute(posiciones, 3).setUsage(THREE.DynamicDrawUsage);
  const atributoColor = new THREE.BufferAttribute(colores, 3).setUsage(THREE.DynamicDrawUsage);
  geometriaHilos.setAttribute("position", atributoPos);
  geometriaHilos.setAttribute("color", atributoColor);
  geometriaHilos.setDrawRange(0, 0);
  const materialHilos = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const hilos = new THREE.LineSegments(geometriaHilos, materialHilos);
  hilos.frustumCulled = false;
  grupo.add(aro, hilos);

  let nivel = 0;
  let meta = 0;
  let cuantos = 0;
  const color = new THREE.Color();

  return {
    obj: grupo,
    set meta(valor: number) {
      meta = THREE.MathUtils.clamp(valor, 0, 1);
    },

    /** Antes de sumar los hilos de este cuadro. */
    empezarHilos: () => {
      cuantos = 0;
    },

    /** Un hilo de `desde` (lo que trae) a `hasta` (la nave), con `fuerza` 0..1. */
    hilo: (desde: THREE.Vector3, hasta: THREE.Vector3, fuerza: number) => {
      if (cuantos >= HILOS) return;
      const i = cuantos * 6;
      posiciones[i] = desde.x;
      posiciones[i + 1] = desde.y;
      posiciones[i + 2] = desde.z;
      posiciones[i + 3] = hasta.x;
      posiciones[i + 4] = hasta.y;
      posiciones[i + 5] = hasta.z;
      // Más claro del lado de la estrella, se pierde hacia la nave.
      const k = 0.55 * THREE.MathUtils.clamp(fuerza, 0, 1) * nivel;
      colores[i] = color.r * k;
      colores[i + 1] = color.g * k;
      colores[i + 2] = color.b * k;
      colores[i + 3] = colores[i + 4] = colores[i + 5] = 0;
      cuantos++;
    },

    actualizar: (dt: number, reloj: number, centro: THREE.Vector3, radio: number, colorCampo: THREE.Color) => {
      if (meta > nivel) nivel = Math.min(meta, nivel + dt / 0.5);
      else nivel = Math.max(meta, nivel - dt / 0.4);
      color.copy(colorCampo);
      aro.visible = nivel > 0.001;
      if (aro.visible) {
        aro.position.copy(centro);
        aro.scale.setScalar(radio);
        aro.rotation.z = reloj * 0.25;
        materialAro.uniforms.uColor.value.copy(colorCampo);
        materialAro.uniforms.uNivel.value = 0.32 * suaveNivel(nivel);
        materialAro.uniforms.uTiempo.value = reloj;
      }
      geometriaHilos.setDrawRange(0, cuantos * 2);
      if (cuantos > 0) {
        atributoPos.needsUpdate = true;
        atributoColor.needsUpdate = true;
      }
    },

    apagar: () => {
      nivel = 0;
      meta = 0;
      cuantos = 0;
      aro.visible = false;
      geometriaHilos.setDrawRange(0, 0);
    },

    liberar: () => {
      geometriaAro.dispose();
      materialAro.dispose();
      geometriaHilos.dispose();
      materialHilos.dispose();
    },
  };
}

// ————————————————————————————— Láser —————————————————————————————

const LASERES = 3;
const VIDA_LASER = 0.26;

/**
 * El láser del juego: como los del show (núcleo casi blanco y halo del color), más grueso para que
 * se lea jugando. Sale de la nave y llega justo a lo que rompe. El juego lo limita a 2 por segundo.
 */
export function crearLaserJuego() {
  const grupo = new THREE.Group();
  const geometria = new THREE.CylinderGeometry(0.03, 0.03, 1, 6).translate(0, 0.5, 0);
  const geometriaHalo = new THREE.CylinderGeometry(0.11, 0.11, 1, 10, 1, true).translate(0, 0.5, 0);
  const arriba = new THREE.Vector3(0, 1, 0);
  const direccion = new THREE.Vector3();
  const pool = Array.from({ length: LASERES }, () => {
    const material = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const materialHalo = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const rayo = new THREE.Mesh(geometria, material);
    rayo.add(new THREE.Mesh(geometriaHalo, materialHalo));
    rayo.visible = false;
    rayo.frustumCulled = false;
    grupo.add(rayo);
    return { rayo, material, materialHalo, desde: -10 };
  });
  let siguiente = 0;

  return {
    obj: grupo,
    /** `ancho`: la escala de la nave (en el celu, más finito). */
    disparar: (desde: THREE.Vector3, hacia: THREE.Vector3, color: THREE.Color, reloj: number, ancho: number) => {
      direccion.subVectors(hacia, desde);
      const largo = direccion.length();
      if (largo < 1e-3) return;
      const l = pool[siguiente];
      siguiente = (siguiente + 1) % LASERES;
      l.rayo.position.copy(desde);
      l.rayo.quaternion.setFromUnitVectors(arriba, direccion.divideScalar(largo));
      l.rayo.scale.set(ancho, largo, ancho);
      l.material.color.copy(color).lerp(BLANCO, 0.6);
      l.materialHalo.color.copy(color);
      l.desde = reloj;
      l.rayo.visible = true;
    },
    actualizar: (reloj: number) => {
      for (const l of pool) {
        if (!l.rayo.visible) continue;
        const p = (reloj - l.desde) / VIDA_LASER;
        if (p >= 1 || p < 0) {
          l.rayo.visible = false;
          continue;
        }
        // Sube en un instante corto (no aparece de un cuadro al otro) y se apaga más lento.
        const curva = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
        l.material.opacity = 0.8 * curva;
        l.materialHalo.opacity = 0.26 * curva;
      }
    },
    apagar: () => pool.forEach((l) => (l.rayo.visible = false)),
    liberar: () => {
      geometria.dispose();
      geometriaHalo.dispose();
      pool.forEach((l) => {
        l.material.dispose();
        l.materialHalo.dispose();
      });
    },
  };
}
