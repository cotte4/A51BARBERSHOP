import * as THREE from "three";
import { NAVE_INICIAL, type ModeloNave } from "@/lib/estudio-naves";
import { BANDAS } from "./_analisis";
import { crearNave, elegirModelo, vaivenDe, type Nave, type Vaiven } from "./_naveFlota";
import { azar, CUELLO_Y, CUERPO, mitadVisible, nuevoVaiven, OJO, orientarNave, PANZA_Y, suave, type Kit } from "./_naveKit";
import { conBorde } from "./_naveMateriales";

// Las piezas fijas del show: siempre están y reaccionan a la música cuadro a cuadro.
//  - Nodriza: la nave elegida en el hangar, gigante en el centro, con un anillo de barras del
//    espectro alrededor. Cambia de modelo sin rearmarse (la vieja se va girando, la nueva entra).
//  - Túnel: anillos de neón que vienen hacia la cámara más rápido cuanto más fuerte suena.
//  - (El terreno vive aparte, con sus biomas y estructuras: _naveTerreno.ts.)
//  - Rave: aliens que cabecean con los graves, saltan en los bombos y levantan los brazos. Cada
//    tanto baja una nave, se lleva a uno por el rayo (sube a saltos, en los bombos) y lo devuelve.
//  - Láseres: salen de las luces de la nodriza en cada redoblante / hi-hat.

/** Lo que suena en este cuadro, ya suavizado. Lo arma _Nave.tsx. */
export type Musica = {
  reloj: number;
  dt: number;
  energia: number;
  graves: number;
  medios: number;
  agudos: number;
  /** BANDAS valores 0..1, con caída lenta (como un ecualizador). */
  espectro: Float32Array;
  /**
   * Graves suavizados lento (~300 ms para subir). Todo lo que cambia la luminosidad de un área
   * grande usa esto y no `graves`: así no hay destellos al ritmo del bombo (fotosensibilidad).
   */
  brillo: number;
  /** Decaen de 1 a 0 después de cada evento. Solo para movimiento, nunca para luminosidad. */
  golpe: number;
  chasquido: number;
  drop: number;
  /** true solo en el cuadro en que pasa el evento. */
  golpeAhora: boolean;
  chasquidoAhora: boolean;
  colorA: THREE.Color;
  colorB: THREE.Color;
  aspecto: number;
};

export type Pieza = {
  obj: THREE.Object3D;
  actualizar: (m: Musica) => void;
  liberar: () => void;
};

const BLANCO = new THREE.Color(0xffffff);
const tmpColor = new THREE.Color();
const tmpMatriz = new THREE.Object3D();

/** Factor para que el show entre en un celular parado sin cortarse a los costados. */
function escalaPorAspecto(aspecto: number) {
  return THREE.MathUtils.clamp(aspecto / 0.85, 0.5, 1);
}

// ————————————————————————————— Nodriza —————————————————————————————

/** El pico de cada barra se queda arriba un ratito y cae despacio, como en un ecualizador de verdad. */
const PICO_SOSTIENE = 0.35;
const PICO_CAE = 0.55;
/** Su lugar en el show. El dedo la puede sacar de acá; al soltarla, vuelve sola. */
const CASA = new THREE.Vector3(0, 1.6, -6);
/** La nave de la nodriza, agrandada: el platillo (1,62 de radio) queda en 2,75. */
const ESCALA_NAVE = 1.7;
/** Segundos del cambio de nave: la de antes se va girando y achicándose, la nueva entra girando. */
const CAMBIO_NAVE = 1.1;
/**
 * Las que giran sobre su eje todo el tiempo (cuanto más suena, más rápido). El anillo y el cigarro
 * no: de perfil se ven finitos. Se mecen con su vaivén y el toque les da unas vueltas.
 */
const GIRA_SOLA: Record<ModeloNave, boolean> = { platillo: true, trompo: true, anillo: false, cigarro: false, triangulo: true, enjambre: true };
const VUELTA = Math.PI * 2;

/** Lo que el dedo le hace a la nodriza. Lo escribe _Nave.tsx y la nodriza lo lee en cada cuadro. */
export type ControlNodriza = {
  /** A dónde la lleva el dedo (mundo). null = vuelve sola a su lugar. */
  meta: THREE.Vector3 | null;
  /** 0..1: cuánto es nave del juego (más chica, sin vaivén ni golpe de escala). */
  juego: number;
  /** 0..1: el aro que se llena mientras la mantienen apretada. */
  carga: number;
  /** Los escribe la nodriza: su centro y el radio del casco de su nave, en el mundo (para chocar). */
  posicion: THREE.Vector3;
  radio: number;
  /** Hasta dónde llega algo de la nave en el mundo (los drones del enjambre): para tocarla. */
  alcance: number;
  /** El modelo de la nave (lo escribe la nodriza; durante un cambio ya es el nuevo). */
  modelo: ModeloNave;
};

export type Nodriza = Pieza & {
  /** Dónde están las luces de la nave en el mundo (de ahí salen los láseres). */
  luces: () => THREE.Vector3[];
  control: ControlNodriza;
  /** Un toque: gira más rápido un rato. */
  girar: () => void;
  /** Cambia la nave sin rearmar la pieza (el espectro y el aro de carga quedan). */
  cambiarModelo: (modelo: ModeloNave) => void;
};

/** Crece con un rebotecito al final (sale de 0, se pasa apenas de 1 y vuelve). */
function conRebote(x: number) {
  const c = 1.2;
  const u = x - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

/** El aro que se llena de las 12 en sentido horario; lo que falta se ve como una huella tenue. */
function crearMaterialCarga() {
  return new THREE.ShaderMaterial({
    uniforms: { uProgreso: { value: 0 }, uColor: { value: new THREE.Color() } },
    vertexShader: /* glsl */ `
      varying vec2 vPos;
      void main() {
        vPos = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uProgreso;
      uniform vec3 uColor;
      varying vec2 vPos;
      void main() {
        float a = fract(0.25 - atan(vPos.y, vPos.x) / 6.2831853);
        float lleno = step(a, uProgreso);
        gl_FragColor = vec4(uColor * mix(0.12, 0.9, lleno), 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function crearNodriza(kit: Kit, modelo: ModeloNave = NAVE_INICIAL): Nodriza {
  const grupo = new THREE.Group();
  grupo.position.copy(CASA);
  let nave: Nave = crearNave(kit, modelo);
  nave.grupo.scale.setScalar(ESCALA_NAVE);
  grupo.add(nave.grupo);
  const control: ControlNodriza = {
    meta: null,
    juego: 0,
    carga: 0,
    posicion: grupo.position.clone(),
    radio: nave.radio * ESCALA_NAVE,
    alcance: nave.alcance * ESCALA_NAVE,
    modelo,
  };
  const velocidad = new THREE.Vector3();
  const destino = new THREE.Vector3();
  const hacia = new THREE.Vector3();
  // Al tocarla gira más rápido un rato.
  let giroExtra = 0;
  // El giro de las que giran solas, y las vueltas del toque de las que no (vuelven a quedar de frente).
  let giroLibre = 0;
  let vueltaToque = 0;
  const vaiven = nuevoVaiven();

  // El cambio de nave: el pedido espera al próximo cuadro (hace falta el reloj) y, si hay uno en curso,
  // a que termine.
  let pedido: ModeloNave | null = null;
  let saliente: Nave | null = null;
  let cambioDesde = 0;
  let giroSaliente = 0;
  // Donde estaba la de antes al empezar el cambio (con su vaivén): se va desde ahí, sin salto.
  const desdeSaliente = new THREE.Vector3();

  const materialCarga = crearMaterialCarga();
  const carga = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.18, 128), materialCarga);
  carga.visible = false;
  grupo.add(carga);

  // Barras: 32 bandas a la derecha y su espejo a la izquierda; los graves abajo, los agudos arriba.
  const RADIO = 3.6;
  const geometriaBarra = new THREE.BoxGeometry(1, 1, 1);
  geometriaBarra.translate(0, 0.5, 0);
  // Degradé por vértice: la base apagada y la punta prendida (se multiplica con el color de cada barra).
  const posBarra = geometriaBarra.getAttribute("position");
  const tonos = new Float32Array(posBarra.count * 3);
  for (let i = 0; i < posBarra.count; i++) tonos.fill(posBarra.getY(i) > 0.5 ? 1 : 0.22, i * 3, i * 3 + 3);
  geometriaBarra.setAttribute("color", new THREE.BufferAttribute(tonos, 3));
  const materialBarra = new THREE.MeshBasicMaterial({ vertexColors: true });
  const barras = new THREE.InstancedMesh(geometriaBarra, materialBarra, BANDAS * 2);
  barras.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const geometriaPico = new THREE.BoxGeometry(1, 1, 1);
  const materialPico = new THREE.MeshBasicMaterial();
  const picos = new THREE.InstancedMesh(geometriaPico, materialPico, BANDAS * 2);
  picos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const alturaPico = new Float32Array(BANDAS);
  const sostenPico = new Float32Array(BANDAS);

  const angulos = Array.from({ length: BANDAS * 2 }, (_, i) => {
    const b = i % BANDAS;
    const lado = i < BANDAS ? 1 : -1;
    return { b, angulo: -Math.PI / 2 + lado * ((b + 0.5) / BANDAS) * Math.PI };
  });
  for (let i = 0; i < angulos.length; i++) {
    barras.setColorAt(i, BLANCO);
    picos.setColorAt(i, BLANCO);
  }
  const anilloBarras = new THREE.Group();
  anilloBarras.add(barras, picos);

  const materialAro = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const aro = new THREE.Mesh(new THREE.TorusGeometry(RADIO - 0.12, 0.035, 8, 160), materialAro);
  anilloBarras.add(aro);
  grupo.add(anilloBarras);

  return {
    obj: grupo,
    // Siempre la nave de ahora (en un cambio, la nueva).
    luces: () => nave.posicionesLuces(),
    control,
    girar: () => {
      giroExtra = Math.min(giroExtra + 9, 18);
    },
    cambiarModelo: (otro) => {
      pedido = otro;
    },
    actualizar: (m) => {
      // Los actores sueltos leen la música de acá (ecualizador, disparos en los chasquidos).
      kit.sonido = m;
      const libre = 1 - control.juego;
      const escala = escalaPorAspecto(m.aspecto) * (1 - control.juego * 0.5);
      grupo.scale.setScalar(escala * (1 + m.golpe * 0.06 * libre));

      if (pedido !== null && saliente === null) {
        if (pedido !== nave.modelo) {
          saliente = nave;
          giroSaliente = saliente.grupo.rotation.y;
          desdeSaliente.copy(saliente.grupo.position);
          nave = crearNave(kit, pedido);
          nave.grupo.scale.setScalar(0.001);
          grupo.add(nave.grupo);
          cambioDesde = m.reloj;
          control.modelo = pedido;
        }
        pedido = null;
      }
      // k: 0 → 1 a lo largo del cambio (1 = sin cambio en curso).
      let k = 1;
      if (saliente) {
        k = THREE.MathUtils.clamp((m.reloj - cambioDesde) / CAMBIO_NAVE, 0, 1);
        if (k >= 1) {
          grupo.remove(saliente.grupo);
          saliente.liberar();
          saliente = null;
        }
      }

      // Resorte: firme mientras el dedo la lleva, blando cuando vuelve sola a su lugar.
      if (control.meta) destino.copy(control.meta);
      else destino.set(CASA.x, CASA.y + Math.sin(m.reloj * 0.8) * 0.2, CASA.z);
      const [firmeza, freno] = control.meta ? [90, 16] : [6, 4.5];
      velocidad.addScaledVector(hacia.subVectors(destino, grupo.position), firmeza * m.dt);
      velocidad.multiplyScalar(Math.exp(-freno * m.dt));
      grupo.position.addScaledVector(velocidad, m.dt);
      // Se inclina hacia donde va, como un platillo de verdad.
      grupo.rotation.z = THREE.MathUtils.clamp(-velocidad.x * 0.04, -0.45, 0.45);
      grupo.rotation.x = THREE.MathUtils.clamp(velocidad.y * 0.03, -0.3, 0.3);
      control.posicion.copy(grupo.position);
      // En un cambio, el radio pasa de una nave a la otra de a poco (el juego choca con esto).
      const mezcla = saliente ? suave(k) : 1;
      const radioNave = saliente ? THREE.MathUtils.lerp(saliente.radio, nave.radio, mezcla) : nave.radio;
      const alcanceNave = saliente ? THREE.MathUtils.lerp(saliente.alcance, nave.alcance, mezcla) : nave.alcance;
      control.radio = radioNave * ESCALA_NAVE * escala;
      control.alcance = alcanceNave * ESCALA_NAVE * escala;

      carga.visible = control.carga > 0.01;
      // El aro de carga abraza al casco de la nave que haya (medido para el platillo).
      carga.scale.setScalar(Math.max(0.75, radioNave / 1.62));
      materialCarga.uniforms.uProgreso.value = suave(Math.min(1, control.carga));
      materialCarga.uniforms.uColor.value.copy(m.colorA).lerp(BLANCO, 0.35);

      giroExtra *= Math.exp(-1.2 * m.dt);
      // La nueva entra girando y frena justo en su lugar (sus vueltas extra terminan en una vuelta entera).
      const llega = THREE.MathUtils.clamp((k - 0.3) / 0.7, 0, 1);
      const giroEntrada = saliente ? (1 - suave(llega)) * VUELTA * 2 : 0;
      vaivenDe(nave.modelo, m.reloj, 0, vaiven);
      if (GIRA_SOLA[nave.modelo]) {
        giroLibre += m.dt * (0.3 + m.energia * 1.6 + giroExtra);
        nave.grupo.rotation.y = giroLibre + giroEntrada;
      } else {
        // No gira sola: el toque le da unas vueltas y, cuando se le pasa, vuelve a quedar de frente.
        vueltaToque += m.dt * giroExtra;
        if (giroExtra < 0.5) vueltaToque += (Math.round(vueltaToque / VUELTA) * VUELTA - vueltaToque) * Math.min(1, m.dt * 2.5);
        nave.grupo.rotation.y = vaiven.giroY * libre + vueltaToque + giroEntrada;
      }
      // Su forma de volar, a media escala (entera, el triángulo se saldría del aro del espectro). Jugando
      // no: la nave tiene que estar donde la ves.
      const desvio = ESCALA_NAVE * 0.5 * libre;
      nave.grupo.position.set(vaiven.x * desvio, vaiven.y * desvio, 0);
      nave.grupo.rotation.z = Math.sin(m.reloj * 0.7) * 0.06 + vaiven.giroZ * libre;
      nave.grupo.rotation.x = 0.1;
      nave.grupo.scale.setScalar(ESCALA_NAVE * (saliente ? Math.max(0.001, conRebote(llega)) : 1));
      // Las luces son un ecualizador: cada una sigue una banda.
      nave.animar(m.reloj, m.espectro);
      nave.matRayo.uniforms.uOpacidad.value = 0.08 + m.brillo * 0.22;
      nave.matRayo.uniforms.uColor.value.copy(m.colorA);

      if (saliente) {
        // La de antes se achica cada vez más rápido, girando, y sube un poco: se la lleva el giro.
        const sale = Math.min(1, k / 0.5);
        giroSaliente += m.dt * (2 + sale * 16);
        saliente.grupo.rotation.y = giroSaliente;
        saliente.grupo.position.set(desdeSaliente.x, desdeSaliente.y + sale * sale * 0.35, desdeSaliente.z);
        saliente.grupo.scale.setScalar(ESCALA_NAVE * Math.max(0.001, 1 - sale * sale));
        saliente.animar(m.reloj, m.espectro);
        saliente.matRayo.uniforms.uOpacidad.value = (0.08 + m.brillo * 0.22) * (1 - sale);
        saliente.matRayo.uniforms.uColor.value.copy(m.colorA);
      }

      // Materiales del kit: todos los ovnis y aliens siguen la paleta juntos.
      kit.borde.value.copy(m.colorA);
      kit.motor.color.copy(m.colorA);
      kit.cupula.emissive.copy(m.colorA);
      kit.cupula.emissiveIntensity = 0.08 + m.brillo * 0.12;
      kit.aroRosa.emissive.copy(m.colorB);

      for (let i = 0; i < angulos.length; i++) {
        const { b, angulo } = angulos[i];
        const v = m.espectro[b];
        if (i < BANDAS) {
          if (v >= alturaPico[b]) {
            alturaPico[b] = v;
            sostenPico[b] = PICO_SOSTIENE;
          } else if (sostenPico[b] > 0) {
            sostenPico[b] -= m.dt;
          } else {
            alturaPico[b] = Math.max(v, alturaPico[b] - m.dt * PICO_CAE);
          }
        }
        const coseno = Math.cos(angulo);
        const seno = Math.sin(angulo);
        tmpMatriz.position.set(coseno * RADIO, seno * RADIO, 0);
        tmpMatriz.rotation.set(0, 0, angulo - Math.PI / 2);
        tmpMatriz.scale.set(0.11, 0.06 + v * 2.6, 0.11);
        tmpMatriz.updateMatrix();
        barras.setMatrixAt(i, tmpMatriz.matrix);
        // El color de cada barra es fijo (degradé por banda): solo cambia la altura, no el brillo.
        tmpColor.copy(m.colorA).lerp(m.colorB, b / (BANDAS - 1)).lerp(BLANCO, 0.15);
        barras.setColorAt(i, tmpColor);

        const r = RADIO + 0.06 + alturaPico[b] * 2.6 + 0.08;
        tmpMatriz.position.set(coseno * r, seno * r, 0);
        tmpMatriz.scale.set(0.13, 0.035, 0.13);
        tmpMatriz.updateMatrix();
        picos.setMatrixAt(i, tmpMatriz.matrix);
        picos.setColorAt(i, tmpColor.lerp(BLANCO, 0.5));
      }
      barras.instanceMatrix.needsUpdate = true;
      picos.instanceMatrix.needsUpdate = true;
      if (barras.instanceColor) barras.instanceColor.needsUpdate = true;
      if (picos.instanceColor) picos.instanceColor.needsUpdate = true;
      anilloBarras.rotation.z = Math.sin(m.reloj * 0.15) * 0.15;
      // En el juego el espectro queda como un aura chica alrededor de la nave.
      anilloBarras.scale.setScalar(1 - control.juego * 0.3);

      materialAro.color.copy(m.colorA);
      materialAro.opacity = 0.25 + m.brillo * 0.3;
    },
    liberar: () => {
      geometriaBarra.dispose();
      materialBarra.dispose();
      geometriaPico.dispose();
      materialPico.dispose();
      aro.geometry.dispose();
      materialAro.dispose();
      carga.geometry.dispose();
      materialCarga.dispose();
      nave.liberar();
      saliente?.liberar();
      barras.dispose();
      picos.dispose();
    },
  };
}

// ————————————————————————————— Túnel —————————————————————————————

const ANILLOS_TUNEL = 22;
const TUNEL_DESDE = -70;
const TUNEL_HASTA = 9;

export function crearTunel(): Pieza {
  const grupo = new THREE.Group();
  grupo.position.y = 0.8;
  const geometria = new THREE.TorusGeometry(5.5, 0.03, 6, 120);
  const anillos = Array.from({ length: ANILLOS_TUNEL }, (_, i) => {
    const material = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const anillo = new THREE.Mesh(geometria, material);
    anillo.position.z = TUNEL_DESDE + (i / ANILLOS_TUNEL) * (TUNEL_HASTA - TUNEL_DESDE);
    anillo.rotation.z = Math.random() * Math.PI;
    grupo.add(anillo);
    return { anillo, material, usaB: i % 2 === 1 };
  });

  return {
    obj: grupo,
    actualizar: (m) => {
      const velocidad = (4 + m.energia * 42) * m.dt;
      for (const a of anillos) {
        a.anillo.position.z += velocidad;
        if (a.anillo.position.z > TUNEL_HASTA) {
          a.anillo.position.z -= TUNEL_HASTA - TUNEL_DESDE;
          a.usaB = !a.usaB;
        }
        const z = a.anillo.position.z;
        const aparece = THREE.MathUtils.clamp((z - TUNEL_DESDE) / 18, 0, 1);
        const seVa = THREE.MathUtils.clamp((TUNEL_HASTA - z) / 7, 0, 1);
        a.material.opacity = aparece * seVa * (0.12 + m.brillo * 0.2);
        a.material.color.copy(a.usaB ? m.colorB : m.colorA);
        a.anillo.rotation.z += m.dt * 0.25;
        a.anillo.scale.setScalar(escalaPorAspecto(m.aspecto) * (1 + m.golpe * 0.1));
      }
    },
    liberar: () => {
      geometria.dispose();
      anillos.forEach((a) => a.material.dispose());
    },
  };
}

// ————————————————————————————— Rave —————————————————————————————

const BAILARINES = 22;

/** Un bailarín tocado salta alto, da una vuelta y levanta los brazos. */
const VUELTA_RAVE = 0.7;
/** La ola cruza a toda la gente en ~1,1 s (de punta a punta son 2 unidades). */
const OLA_SEG_POR_UNIDAD = 0.55;
const OLA_ENTRE = 1.4;
const APLAUSO = 0.4;
const CAMBIO_DE_LUGAR = 0.9;

// La rave baila de a dos: cada uno tiene pareja (el de al lado), se miran, chocan las caderas en los
// bombos, chocan las manos en los redoblantes y a veces cambian de lugar girando. Los graves largan
// olas que cruzan a toda la gente, y cada uno rebota con su banda del espectro (los del medio con
// los graves, los de las puntas con los agudos), así la fila entera dibuja la música.
type Bailarin = {
  orden: number;
  x: number;
  z: number;
  fase: number;
  escala: number;
  saltoDesde: number;
  saltoAlto: number;
  rosa: boolean;
  /** 0: brazos arriba en los saltos · 1: puño al ritmo · 2: brazos que van y vienen. */
  estilo: number;
  parpadeo: number;
  /** Brazos suavizados: suben rápido (~80 ms) pero nunca se teletransportan en un cuadro. */
  alzada: number;
  puno: number;
  vueltaDesde: number;
  /** Para dónde mira (giro suavizado): a la pareja, o al dedo si hay. */
  mira: number;
  /** Para qué lado está la pareja: 1 a la derecha, -1 a la izquierda. */
  hacia: number;
  pareja: Bailarin | null;
  aplausoDesde: number;
  /** Banda del espectro con la que rebota. */
  banda: number;
  /** Lo que se mueve en este cuadro por cambiar de lugar con la pareja. */
  xAhora: number;
  zExtra: number;
  giroExtra: number;
};

type Pareja = { a: Bailarin; b: Bailarin; cambioDesde: number; xa: number; xb: number };

// La abducción: baja una nave sobre un bailarín, prende el rayo y lo sube a saltos (en los bombos),
// lo tiene arriba girando con los brazos en alto, lo baja a su lugar y se va. Segundos de cada parte:
const ABDUCCION = { baja: 1.4, prende: 0.6, subeMax: 5, arriba: 2.6, devuelve: 1.6, apaga: 0.5, seVa: 1.3 };
const ESCALA_ABDUCTORA = 0.38;
/** El rayo de la abductora es más largo y ancho que el de siempre: llega de arriba de la gente hasta el piso. */
const LARGO_RAYO = 2;
const ANCHO_RAYO = 1.3;
/** Del centro de la cabeza de un bailarín (en su escala) hasta el borde de abajo del torso y la coronilla. */
const PIES_RAVE = -2.35;
const CORONILLA = 1.15;

type Abduccion = {
  bailarin: Bailarin;
  nave: Nave;
  desde: number;
  /** 0..1: cuánto subió (suavizado) y hasta dónde quiere llegar (crece a saltos en los bombos). */
  alto: number;
  meta: number;
  /** Desde dónde baja (alto al empezar a devolverlo). */
  altoBaja: number;
  /** Cuánto sube en el mundo (lo calcula cada cuadro: depende de la pantalla). */
  subida: number;
  /** 0..1: cuánto lo agarra el rayo (mientras, no rebota ni salta con la gente). */
  agarre: number;
  /** El desvío de la nave, que lo lleva colgado. */
  dx: number;
  giro: number;
  /** -1 = todavía no. */
  arribaDesde: number;
  bajaDesde: number;
  dejoDesde: number;
  fase: number;
  rumbo: number;
  vaiven: Vaiven;
};

export type Rave = Pieza & {
  /** Centro de cada cabeza en el mundo y su radio (x, y, z, r; r = 0 si no se ve): para tocarlos. */
  cabezas: Float32Array;
  tocar: (indice: number, reloj: number) => void;
  /**
   * Baja una nave y se lleva a ese bailarín por el rayo (el mismo índice que `cabezas`; -1 = uno
   * cualquiera de los que se ven). false si ya hay una abducción en curso o ese no se puede.
   */
  abducir: (indice: number, reloj: number) => boolean;
  /** Prende o apaga las abducciones solas (una cada 25–45 s, en un bombo). Jugando, apagarlas. */
  abducirSola: (si: boolean) => void;
};

export function crearRave(kit: Kit): Rave {
  const g = kit.geo;
  // Instancias: una sola llamada de dibujo por parte para los 22, así la rave es liviana.
  const piel = conBorde(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, emissive: 0x0a1a06 }), kit.borde, 0.8, 2.2);
  const cabezas = new THREE.InstancedMesh(g.cabeza, piel, BAILARINES);
  const brazos = new THREE.InstancedMesh(g.brazo, piel, BAILARINES * 2);
  const ojos = new THREE.InstancedMesh(g.ojos, kit.ojo, BAILARINES);
  const brillos = new THREE.InstancedMesh(g.brillos, kit.brillo, BAILARINES);
  const cuerpos = new THREE.InstancedMesh(g.cuerpo, kit.traje, BAILARINES);
  const partes = [cabezas, brazos, ojos, brillos, cuerpos];
  partes.forEach((p) => p.instanceMatrix.setUsage(THREE.DynamicDrawUsage));
  const grupo = new THREE.Group();
  grupo.add(...partes);

  // Orden de aparición al azar por pareja: en un celu parado se muestran menos, pero repartidos por
  // todo el ancho y sin dejar a nadie sin su pareja.
  const ordenesPareja = Array.from({ length: Math.ceil(BAILARINES / 2) }, (_, i) => i).sort(() => Math.random() - 0.5);
  const bailarines: Bailarin[] = Array.from({ length: BAILARINES }, (_, i) => {
    const x = (i / (BAILARINES - 1)) * 2 - 1 + azar(-0.03, 0.03);
    return {
      orden: ordenesPareja[Math.floor(i / 2)] * 2 + (i % 2),
      x,
      z: azar(0.5, 3.2),
      fase: Math.random() * Math.PI * 2,
      escala: azar(0.24, 0.33),
      saltoDesde: -10,
      saltoAlto: 0,
      rosa: Math.random() < 0.3,
      estilo: Math.floor(Math.random() * 3),
      parpadeo: azar(0, 4),
      alzada: 0,
      puno: 0,
      vueltaDesde: -10,
      mira: 0,
      hacia: 0,
      pareja: null,
      aplausoDesde: -10,
      banda: Math.min(BANDAS - 1, Math.floor(Math.abs(x) * BANDAS)),
      xAhora: x,
      zExtra: 0,
      giroExtra: 0,
    };
  });
  // Parejas: el de al lado, a la misma profundidad y con el mismo compás (así el vaivén es espejado).
  const parejas: Pareja[] = [];
  for (let i = 0; i + 1 < BAILARINES; i += 2) {
    const a = bailarines[i];
    const b = bailarines[i + 1];
    b.z = a.z + azar(-0.15, 0.15);
    b.fase = a.fase;
    a.pareja = b;
    b.pareja = a;
    a.hacia = 1;
    b.hacia = -1;
    parejas.push({ a, b, cambioDesde: -10, xa: a.x, xb: b.x });
  }
  bailarines.sort((a, b) => a.z - b.z);
  let olaDesde = -10;
  // Centro de cada cabeza en el mundo y su radio (x, y, z, r; r = 0 si no se ve): para tocarlos.
  const centros = new Float32Array(BAILARINES * 4);

  const raiz = new THREE.Object3D();
  const local = new THREE.Object3D();
  const cabeza = new THREE.Matrix4();
  const matriz = new THREE.Matrix4();
  const oculto = new THREE.Matrix4().makeScale(0, 0, 0);

  const ponerLocal = (x: number, y: number, z: number, rx: number, ry: number, rz: number, sy = 1) => {
    local.position.set(x, y, z);
    local.rotation.set(rx, ry, rz);
    local.scale.set(1, sy, 1);
    local.updateMatrix();
    return local.matrix;
  };

  // ————— Abducción —————
  let abduccion: Abduccion | null = null;
  let abducirSola = true;
  /** Cuándo puede venir la próxima sola (-1: se decide en el primer bombo). */
  let proximaAbduccion = -1;
  // Los que se ven en la pantalla de ahora (para elegir a quién llevarse).
  let visiblesAhora = BAILARINES;

  const parejaDe = (b: Bailarin) => parejas.find((par) => par.a === b || par.b === b) ?? null;
  const cambiandoDeLugar = (b: Bailarin, reloj: number) => {
    const par = parejaDe(b);
    return par !== null && reloj - par.cambioDesde < CAMBIO_DE_LUGAR;
  };

  const abducir = (indice: number, reloj: number): boolean => {
    if (abduccion) return false;
    let b: Bailarin | undefined;
    if (indice >= 0) {
      b = bailarines[indice];
    } else {
      // Uno que se vea bien: no en las puntas (en un celu parado se cortaría) ni cambiando de lugar.
      const candidatos = bailarines.filter((c) => c.orden < visiblesAhora && Math.abs(c.x) < 0.75 && !cambiandoDeLugar(c, reloj));
      b = candidatos.length > 0 ? candidatos[Math.floor(Math.random() * candidatos.length)] : undefined;
    }
    if (!b || b.orden >= visiblesAhora || cambiandoDeLugar(b, reloj)) return false;

    const nave = crearNave(kit, elegirModelo(kit));
    nave.grupo.scale.setScalar(ESCALA_ABDUCTORA);
    // El rayo se estira desde la panza (la punta del cono queda pegada a la nave).
    nave.rayo.scale.set(ANCHO_RAYO, LARGO_RAYO, ANCHO_RAYO);
    nave.rayo.position.y = nave.bajo - PANZA_Y * LARGO_RAYO;
    nave.matRayo.uniforms.uOpacidad.value = 0;
    // Se ubica en el próximo cuadro: hasta entonces no se dibuja (si no, saldría un cuadro en el centro).
    nave.grupo.visible = false;
    grupo.add(nave.grupo);
    abduccion = {
      bailarin: b,
      nave,
      desde: reloj,
      alto: 0,
      meta: 0,
      altoBaja: 0,
      subida: 0,
      agarre: 0,
      dx: 0,
      giro: 0,
      arribaDesde: -1,
      bajaDesde: -1,
      dejoDesde: -1,
      fase: Math.random() * Math.PI * 2,
      rumbo: Math.random() < 0.5 ? -1 : 1,
      vaiven: nuevoVaiven(),
    };
    return true;
  };

  /** Cada cuadro: la nave, el rayo y cuánto subió el bailarín. Va antes de ubicar a la gente. */
  const moverAbduccion = (m: Musica, ab: Abduccion) => {
    const b = ab.bailarin;
    const A = ABDUCCION;
    const tau = m.reloj - ab.desde;
    const mv = mitadVisible(b.z, m.aspecto);
    const s = ESCALA_ABDUCTORA;
    const baseX = b.xAhora * mv.x * 0.92;
    const baseY = -mv.y * 0.6;
    // El rayo llega justo hasta abajo del bailarín; la nave queda arriba, a lo largo del rayo.
    const pies = baseY + PIES_RAVE * b.escala;
    const panza = pies + 3.4 * LARGO_RAYO * s * 0.95;
    const yNave = panza - ab.nave.bajo * s;
    const yAfuera = 0.6 + mv.y + 1.6;
    // Sube hasta media altura del rayo (más arriba el cono es finito y quedaría afuera).
    ab.subida = Math.max(0, panza - 0.12 - (baseY + CORONILLA * b.escala)) * 0.72;

    // El rayo prende y apaga con fundido y su brillo sigue la curva lenta.
    const luz =
      ab.dejoDesde < 0
        ? suave(THREE.MathUtils.clamp((tau - A.baja + 0.25) / A.prende, 0, 1))
        : 1 - suave(THREE.MathUtils.clamp((m.reloj - ab.dejoDesde) / A.apaga, 0, 1));
    ab.agarre = luz;

    if (ab.bajaDesde < 0) {
      // Sube a saltos: cada bombo lo empuja un poco y entre bombo y bombo sube despacio igual.
      if (tau > A.baja + A.prende * 0.5) {
        ab.meta = Math.min(1, ab.meta + m.dt * 0.07 + (m.golpeAhora ? 0.2 : 0));
        if (tau > A.baja + A.prende + A.subeMax) ab.meta = 1;
      }
      ab.alto += (ab.meta - ab.alto) * Math.min(1, m.dt * 4);
      if (ab.arribaDesde < 0 && ab.alto > 0.985) ab.arribaDesde = m.reloj;
      if (ab.arribaDesde >= 0 && m.reloj - ab.arribaDesde > A.arriba) {
        ab.bajaDesde = m.reloj;
        ab.altoBaja = ab.alto;
      }
    } else if (ab.dejoDesde < 0) {
      const k = THREE.MathUtils.clamp((m.reloj - ab.bajaDesde) / A.devuelve, 0, 1);
      ab.alto = ab.altoBaja * (1 - suave(k));
      if (k >= 1) {
        ab.dejoDesde = m.reloj;
        ab.alto = 0;
      }
    }
    // Arriba gira despacio; al bajar termina la vuelta, así queda mirando como antes.
    ab.giro += m.dt * 1.6 * ab.alto;
    if (ab.bajaDesde >= 0) ab.giro += (Math.round(ab.giro / (Math.PI * 2)) * Math.PI * 2 - ab.giro) * Math.min(1, m.dt * 3);

    // La nave: baja desde arriba de la pantalla, se queda (con su vaivén a medias, para no soltar al
    // bailarín) y, cuando lo dejó, se va para arriba acelerando.
    let y: number;
    if (ab.dejoDesde < 0) {
      y = yAfuera + (yNave - yAfuera) * suave(THREE.MathUtils.clamp(tau / A.baja, 0, 1));
    } else {
      const k = THREE.MathUtils.clamp((m.reloj - ab.dejoDesde - A.apaga * 0.6) / A.seVa, 0, 1);
      y = yNave + (yAfuera + 2 - yNave) * k * k;
    }
    vaivenDe(ab.nave.modelo, m.reloj, ab.fase, ab.vaiven);
    ab.dx = ab.vaiven.x * s * 0.3;
    ab.nave.grupo.visible = true;
    ab.nave.grupo.position.set(baseX + ab.dx, y + ab.vaiven.y * s * 0.3, b.z);
    orientarNave(ab.nave.grupo, ab.nave.modelo, ab.rumbo, 0, ab.vaiven);
    ab.nave.grupo.rotation.x = 0.12;
    ab.nave.animar(m.reloj, m.espectro);
    ab.nave.matRayo.uniforms.uOpacidad.value = luz * (0.16 + m.brillo * 0.4);
    ab.nave.matRayo.uniforms.uColor.value.copy(m.colorA);

    if (ab.dejoDesde >= 0 && m.reloj - ab.dejoDesde > A.apaga * 0.6 + A.seVa) {
      grupo.remove(ab.nave.grupo);
      ab.nave.liberar();
      abduccion = null;
      proximaAbduccion = m.reloj + azar(25, 45);
    }
  };

  return {
    obj: grupo,
    cabezas: centros,
    tocar: (indice, reloj) => {
      const b = bailarines[indice];
      if (!b) return;
      b.saltoDesde = reloj;
      b.saltoAlto = azar(1.3, 1.8);
      b.vueltaDesde = reloj;
    },
    abducir,
    abducirSola: (si) => {
      abducirSola = si;
    },
    actualizar: (m) => {
      const visibles = Math.round(BAILARINES * THREE.MathUtils.clamp(m.aspecto, 0.6, 1));
      visiblesAhora = visibles;

      // Olas: los graves fuertes largan una que cruza desde una punta (en el drop, desde el medio).
      const drop = m.drop > 0.95;
      if ((drop || (m.golpeAhora && m.graves > 0.7 && Math.random() < 0.3)) && m.reloj - olaDesde > OLA_ENTRE) {
        olaDesde = m.reloj;
        const origen = drop ? 0 : Math.random() < 0.5 ? -1 : 1;
        for (const b of bailarines) {
          // El que ya está en el aire termina su salto (si no, caería al piso de un cuadro al otro).
          const enElAire = m.reloj - b.saltoDesde < 0.45 && m.reloj >= b.saltoDesde;
          if (enElAire) continue;
          b.saltoDesde = m.reloj + Math.abs(b.x - origen) * OLA_SEG_POR_UNIDAD;
          b.saltoAlto = (drop ? 0.7 : 0.45) * (0.6 + m.graves);
        }
      }

      // Abducción sola: cada tanto, en un bombo (no en el drop, que ya tiene lo suyo).
      if (abducirSola && abduccion === null && m.golpeAhora && m.drop < 0.3) {
        if (proximaAbduccion < 0) proximaAbduccion = m.reloj + azar(10, 20);
        else if (m.reloj >= proximaAbduccion && !abducir(-1, m.reloj)) proximaAbduccion = m.reloj + 3;
      }

      for (const par of parejas) {
        // Redoblante: algunas parejas chocan las manos.
        if (m.chasquidoAhora && Math.random() < 0.35) par.a.aplausoDesde = par.b.aplausoDesde = m.reloj;
        // De vez en cuando, en un bombo, cambian de lugar girando una alrededor de la otra (no si a uno
        // se lo está llevando una nave).
        const ocupada = abduccion !== null && (abduccion.bailarin === par.a || abduccion.bailarin === par.b);
        if (m.golpeAhora && !ocupada && m.reloj - par.cambioDesde > 4 && Math.random() < 0.025 * (0.5 + m.energia)) {
          par.cambioDesde = m.reloj;
          par.xa = par.a.x;
          par.xb = par.b.x;
        }
        const c = (m.reloj - par.cambioDesde) / CAMBIO_DE_LUGAR;
        if (c >= 0 && c < 1) {
          const s = suave(c);
          const arco = Math.sin(c * Math.PI) * 0.4;
          par.a.xAhora = par.xa + (par.xb - par.xa) * s;
          par.b.xAhora = par.xb + (par.xa - par.xb) * s;
          par.a.zExtra = arco;
          par.b.zExtra = -arco;
          par.a.giroExtra = par.b.giroExtra = s * Math.PI * 2;
          continue;
        }
        if (par.cambioDesde > 0 && par.a.x === par.xa) {
          // Terminó el cambio: quedan en el lugar del otro, y la pareja ahora está del otro lado.
          par.a.x = par.xb;
          par.b.x = par.xa;
          par.a.hacia = -par.a.hacia;
          par.b.hacia = -par.b.hacia;
          par.a.banda = Math.min(BANDAS - 1, Math.floor(Math.abs(par.a.x) * BANDAS));
          par.b.banda = Math.min(BANDAS - 1, Math.floor(Math.abs(par.b.x) * BANDAS));
        }
        par.a.xAhora = par.a.x;
        par.b.xAhora = par.b.x;
        par.a.zExtra = par.b.zExtra = 0;
        par.a.giroExtra = par.b.giroExtra = 0;
      }

      if (abduccion) moverAbduccion(m, abduccion);
      const llevado = abduccion;

      bailarines.forEach((b, i) => {
        centros[i * 4 + 3] = 0;
        if (b.orden >= visibles) {
          for (const parte of [cabezas, ojos, brillos, cuerpos]) parte.setMatrixAt(i, oculto);
          brazos.setMatrixAt(i * 2, oculto);
          brazos.setMatrixAt(i * 2 + 1, oculto);
          return;
        }
        // Algún salto suelto en los bombos, sin pisar una ola que viene en camino.
        if (m.golpeAhora && b.saltoDesde < m.reloj - 0.45 && Math.random() < 0.12) {
          b.saltoDesde = m.reloj;
          b.saltoAlto = azar(0.3, 0.9) * (0.6 + m.graves);
        }
        // Con quién baila: su pareja si se ve; si no, solo (0).
        const conPareja = b.pareja !== null && b.pareja.orden < visibles ? b.hacia : 0;
        const mv = mitadVisible(b.z, m.aspecto);
        const k = (m.reloj - b.saltoDesde) / 0.45;
        const saltando = k >= 0 && k < 1;
        const salto = saltando ? Math.sin(k * Math.PI) * b.saltoAlto : 0;
        const pulso = Math.abs(Math.sin(m.reloj * 4.6 + b.fase));
        // Rebota con el bombo y con su banda: la fila entera dibuja el espectro.
        const rebote = m.golpe * 0.07 + m.espectro[b.banda] * 0.16;
        // Choque de caderas: en cada bombo se arriman a la pareja.
        const arrime = conPareja * m.golpe * 0.06;
        // Si se lo lleva el rayo: deja de bailar con la gente, sube colgado de la nave y flota girando.
        const ab = llevado !== null && llevado.bailarin === b ? llevado : null;
        const agarre = ab ? ab.agarre : 0;
        const suelto = 1 - agarre;
        const flota = ab ? ab.alto * ab.subida + Math.sin(m.reloj * 2.3 + b.fase) * 0.05 * ab.alto : 0;

        // Arriba de la barra del player, que tapa el borde de abajo en el celu.
        raiz.position.set(
          b.xAhora * mv.x * 0.92 + arrime * suelto + (ab ? ab.dx * ab.alto : 0),
          -mv.y * 0.6 + (rebote + salto) * suelto + flota,
          b.z + b.zExtra
        );
        // Se miran con la pareja (más cuanto más suenan los medios); con dedo o mouse, todos lo miran a él.
        const metaMira = kit.mirada.activa
          ? THREE.MathUtils.clamp(Math.atan2(kit.mirada.punto.x - raiz.position.x, kit.mirada.punto.z - b.z), -0.8, 0.8)
          : conPareja * (0.35 + m.medios * 0.45);
        b.mira += (metaMira - b.mira) * Math.min(1, m.dt * 6);
        const v = (m.reloj - b.vueltaDesde) / VUELTA_RAVE;
        const vuelta = v >= 0 && v < 1 ? suave(v) * Math.PI * 2 : 0;
        // El vaivén es espejado entre los dos de la pareja (mismo compás, signo contrario).
        const vaiven = Math.sin(m.reloj * 2 + b.fase) * 0.06 * (conPareja || 1);
        // Colgado del rayo se mece como sin gravedad.
        const mecido = ab ? Math.sin(m.reloj * 1.7 + b.fase) * 0.2 * ab.alto : 0;
        raiz.rotation.set(0, Math.sin(m.reloj + b.fase) * 0.12 + b.mira + vuelta + b.giroExtra + (ab ? ab.giro : 0), vaiven * suelto + mecido);
        raiz.scale.setScalar(b.escala);
        raiz.updateMatrix();
        centros[i * 4] = raiz.position.x;
        centros[i * 4 + 1] = raiz.position.y;
        centros[i * 4 + 2] = raiz.position.z;
        centros[i * 4 + 3] = b.escala * 1.4;

        tmpColor.copy(b.rosa ? m.colorB : m.colorA).multiplyScalar(0.55 + m.brillo * 0.12);

        // Cabeceo con los graves, para adelante, con el pivote en el cuello.
        const cabeceo = -0.06 + m.graves * 0.32 * pulso;
        cabeza
          .copy(raiz.matrix)
          .multiply(ponerLocal(0, CUELLO_Y, 0, cabeceo, 0, Math.sin(m.reloj * 2 + b.fase) * 0.1))
          .multiply(ponerLocal(0, -CUELLO_Y, 0, 0, 0, 0));
        cabezas.setMatrixAt(i, cabeza);
        cabezas.setColorAt(i, tmpColor);

        if (m.reloj - b.parpadeo > 0.16) b.parpadeo = m.reloj + azar(1.5, 5);
        const p = (m.reloj - b.parpadeo) / 0.16;
        const parpado = p >= 0 && p <= 1 ? 1 - 0.9 * Math.sin(p * Math.PI) : 1;
        matriz.copy(cabeza).multiply(ponerLocal(0, OJO.y, 0, 0, 0, 0, parpado)).multiply(ponerLocal(0, -OJO.y, 0, 0, 0, 0));
        ojos.setMatrixAt(i, matriz);
        brillos.setMatrixAt(i, matriz);

        matriz.copy(raiz.matrix).multiply(ponerLocal(0, CUERPO.y, 0, 0, 0, 0));
        cuerpos.setMatrixAt(i, matriz);

        // Brazos: en el drop todos arriba (y el que tocaron mientras gira, y los que hacen la ola); si
        // no, cada uno baila a su manera.
        const enOla = saltando && m.reloj - olaDesde < 2.5;
        // El que se lleva el rayo, con los brazos arriba todo el viaje.
        const metaAlzada = Math.max(Math.min(1, m.drop * 1.6), saltando && (b.estilo === 0 || enOla) ? 1 : 0, v >= 0 && v < 1.6 ? 1 : 0, agarre);
        const rapidez = Math.min(1, m.dt * 12);
        b.alzada += (metaAlzada - b.alzada) * rapidez;
        b.puno += (m.golpe - b.puno) * Math.min(1, m.dt * 25);
        // Choque de manos con la pareja: sube el brazo de su lado y baja.
        const a = (m.reloj - b.aplausoDesde) / APLAUSO;
        const choque = conPareja !== 0 && a >= 0 && a < 1 ? Math.sin(a * Math.PI) : 0;
        for (const lado of [-1, 1]) {
          let angulo = 0.18 + 0.05 * Math.sin(m.reloj * 2 + b.fase);
          if (b.estilo === 1 && lado === 1) angulo += b.puno * 2.1;
          if (b.estilo === 2) angulo += 0.5 + Math.sin(m.reloj * 4.6 + b.fase + (lado > 0 ? 0 : Math.PI)) * 0.4 * (0.4 + m.medios);
          if (lado === conPareja) angulo += choque * (1.9 - angulo);
          angulo += b.alzada * (2.5 - angulo + Math.sin(m.reloj * 7 + b.fase + lado) * 0.2);
          matriz.copy(raiz.matrix).multiply(ponerLocal(lado * CUERPO.hombroX, CUERPO.hombroY, 0, 0, 0, lado * angulo));
          const indice = i * 2 + (lado < 0 ? 0 : 1);
          brazos.setMatrixAt(indice, matriz);
          brazos.setColorAt(indice, tmpColor);
        }
      });
      partes.forEach((parte) => {
        parte.instanceMatrix.needsUpdate = true;
        if (parte.instanceColor) parte.instanceColor.needsUpdate = true;
      });
    },
    liberar: () => {
      piel.dispose();
      partes.forEach((p) => p.dispose());
      abduccion?.nave.liberar();
    },
  };
}

// ————————————————————————————— Láseres —————————————————————————————

const LASERES = 12;
// Medio segundo con entrada y salida suaves: un láser nunca prende ni apaga de golpe.
const VIDA_LASER = 0.5;

export function crearLaseres(): Pieza & { disparar: (desde: THREE.Vector3, hacia: THREE.Vector3, color: THREE.Color, reloj: number) => void } {
  const grupo = new THREE.Group();
  // Núcleo finito casi blanco y un halo más ancho del color: se lee como un haz de luz, no un palito.
  const geometria = new THREE.CylinderGeometry(0.022, 0.022, 1, 6);
  geometria.translate(0, 0.5, 0);
  const geometriaHalo = new THREE.CylinderGeometry(0.09, 0.09, 1, 8, 1, true);
  geometriaHalo.translate(0, 0.5, 0);
  const arriba = new THREE.Vector3(0, 1, 0);
  const direccion = new THREE.Vector3();
  const pool = Array.from({ length: LASERES }, () => {
    const material = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const materialHalo = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const rayo = new THREE.Mesh(geometria, material);
    rayo.add(new THREE.Mesh(geometriaHalo, materialHalo));
    rayo.visible = false;
    grupo.add(rayo);
    return { rayo, material, materialHalo, desde: -10 };
  });
  let siguiente = 0;

  return {
    obj: grupo,
    disparar: (desde, hacia, color, reloj) => {
      const l = pool[siguiente];
      siguiente = (siguiente + 1) % LASERES;
      direccion.subVectors(hacia, desde);
      l.rayo.position.copy(desde);
      l.rayo.quaternion.setFromUnitVectors(arriba, direccion.clone().normalize());
      l.rayo.scale.set(1, direccion.length(), 1);
      l.material.color.copy(color).lerp(BLANCO, 0.55);
      l.materialHalo.color.copy(color);
      l.desde = reloj;
      l.rayo.visible = true;
    },
    actualizar: (m) => {
      for (const l of pool) {
        if (!l.rayo.visible) continue;
        const p = (m.reloj - l.desde) / VIDA_LASER;
        if (p >= 1) {
          l.rayo.visible = false;
          continue;
        }
        const curva = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
        l.material.opacity = 0.65 * curva;
        l.materialHalo.opacity = 0.22 * curva;
      }
    },
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
