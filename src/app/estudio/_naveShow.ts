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
//    Con el dedo se los agarra (cuelgan de la cabeza como péndulo), se los tira (pican, se marean y
//    vuelven caminando; si salen por arriba, una nave los trae) y se los voltea como bolos, en cadena.
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

// El dedo (lo conecta _Nave.tsx): agarrados cuelgan de la cabeza como un péndulo; tirados vuelan con
// gravedad, pican, se marean y vuelven caminando a su lugar; empujados caen como bolos, en cadena.
/** Resorte que lleva la cabeza al dedo: llega en ~0,2 s sin pasarse y después lo sigue firme. */
const RESORTE_DEDO = { firmeza: 480, freno: 37 };
/**
 * Colgado, el cuerpo se mece como un péndulo (`largo`: la parte del cuerpo hasta su centro). La
 * aceleración del dedo lo empuja a medias y la velocidad lo deja atrás: con todo, cualquier tirón le
 * daba la vuelta entera. `acelMax` es el tope de esos empujones.
 */
const PENDULO = { largo: 0.6, freno: 2.2, empuje: 0.35, arrastre: 1.2, acelMax: 80 };
const GRAVEDAD_RAVE = 20;
/** Pasos de física de a lo sumo esto: a 30 cuadros por segundo el resorte firme se desarmaría. */
const PASO_FISICA = 1 / 120;
/** Cuántos cuadros del dedo se guardan para medir su velocidad. */
const MUESTRAS_DEDO = 16;
/** El tiro sale con la velocidad del dedo en sus últimos 75 ms: si frenó antes de soltar, cae casi derecho. */
const VENTANA_TIRO = 0.075;
/** Para seguir al dedo alcanza una ventana más corta (responde antes). */
const VENTANA_RESORTE = 0.045;
const TIRO_MAX = 30;
/** Cuánto gira (rad/s) por cada unidad por segundo de costado del tiro, en el sentido del tiro. */
const GIRO_POR_VELOCIDAD = 0.45;
const REBOTE_PARED = 0.55;
/** En el piso pica una o dos veces: lo que conserva de la velocidad, y el piquecito mínimo. */
const REBOTE_PISO = 0.42;
const PIQUE_MIN = 2.2;
const MAREO = 0.9;
/** Vuelve a saltitos y, aunque esté lejos, no tarda más que `tardaMax` segundos. */
const CAMINA = { rapidez: 1.5, saltito: 0.09, largoSaltito: 0.32, tardaMax: 2.6 };
/** El salto al llegar a su lugar, y el saltito al levantarse después de caerse. */
const SALTO_CONTENTO = 0.9;
const SALTITO_LEVANTA = 0.5;
/**
 * El bolo, sobre los pies: el empujón arranca entre `empujon` y `empujon + extra` rad/s, queda acostado
 * a `acostado` rad (con un rebotecito), se queda `queda` s y se levanta en `levanta` s. Al pasar
 * `vecino` rad tumba al de al lado, si lo alcanza.
 */
const VOLTEO = { empujon: 1, extra: 3, acostado: 1.45, rebote: 0.35, queda: 0.7, levanta: 0.55, vecino: 0.75 };
/** Uno que vuela bajo tumba a los parados que roza: tan cerca de costado y hasta tan alto sobre las cabezas. */
const ROCE = { ancho: 0.24, alto: 0.5 };
/** Se fue por arriba cuando todo el cuerpo pasó este margen sobre el borde de la pantalla. */
const SALIDA_ARRIBA = 0.6;
/** Al cambiar de estado la pose no salta: la diferencia se apaga sola (constante de tiempo; ~0,2 s en total). */
const MEZCLA_POSE = 0.06;

const clamp = THREE.MathUtils.clamp;
/** La diferencia entre dos ángulos por el lado corto (-π..π). */
function difAngulo(a: number, b: number) {
  const d = a - b;
  return d - Math.round(d / VUELTA) * VUELTA;
}

// La rave baila de a dos: cada uno tiene pareja (el de al lado), se miran, chocan las caderas en los
// bombos, chocan las manos en los redoblantes y a veces cambian de lugar girando. Los graves largan
// olas que cruzan a toda la gente, y cada uno rebota con su banda del espectro (los del medio con
// los graves, los de las puntas con los agudos), así la fila entera dibuja la música. Con el dedo se
// los saca del baile (ver `Fuera`); mientras uno está afuera, su pareja no cambia de lugar con él.
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
  par: Pareja | null;
  aplausoDesde: number;
  /** Banda del espectro con la que rebota. */
  banda: number;
  /** Lo que se mueve en este cuadro por cambiar de lugar con la pareja. */
  xAhora: number;
  zExtra: number;
  giroExtra: number;
  /** Mitad visible del mundo a su profundidad (de este cuadro). */
  mvx: number;
  mvy: number;
  fuera: Fuera;
};

type Pareja = { a: Bailarin; b: Bailarin; cambioDesde: number; xa: number; xb: number };

/** Fuera del baile: lo lleva el dedo, vuela, está mareado, vuelve caminando o lo voltearon. */
type Estado = "baila" | "agarrado" | "vuela" | "mareado" | "vuelve" | "volteado";

type Fuera = {
  estado: Estado;
  desde: number;
  /** Cabeza en el mundo (a su profundidad) y su velocidad. La pone la física; bailando no se usa. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Giro del cuerpo en el plano de la pantalla y su velocidad: colgado es el péndulo; volando, el del tiro. */
  giro: number;
  giroVel: number;
  /** Mareado: a qué vuelta entera se endereza. */
  giroMeta: number;
  piques: number;
  /** Volviendo: desde dónde salió, cuántos saltitos da y a qué velocidad. */
  caminaDesde: number;
  saltitos: number;
  rapidez: number;
  /** Volteado: para qué lado, cuánto está caído sobre los pies, en qué parte va y con qué fuerza lo empujaron. */
  lado: 1 | -1;
  angulo: number;
  anguloVel: number;
  fase: "cae" | "acostado" | "levanta";
  faseDesde: number;
  rebotes: number;
  fuerza: number;
  tumboVecino: boolean;
  /** Lo que pide el estado de ahora: para dónde mirar, brazos arriba, pataleo y a qué ritmo. */
  miraMeta: number;
  alzadaMeta: number;
  pataleoMeta: number;
  ritmo: number;
  /** Suavizados (nunca saltan): el pataleo, el bamboleo de la cabeza mareada y cuánto baila a su manera. */
  pataleo: number;
  faseBrazos: number;
  mareo: number;
  baile: number;
  contentoDesde: number;
  /** La última pose dibujada, y lo que falta mezclar desde ella después de cambiar de estado. */
  ultX: number;
  ultY: number;
  ultRy: number;
  ultRz: number;
  mezclaPendiente: boolean;
  mezclaX: number;
  mezclaY: number;
  mezclaRy: number;
  mezclaRz: number;
};

const nuevoFuera = (): Fuera => ({
  estado: "baila",
  desde: -10,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  giro: 0,
  giroVel: 0,
  giroMeta: 0,
  piques: 0,
  caminaDesde: 0,
  saltitos: 1,
  rapidez: CAMINA.rapidez,
  lado: 1,
  angulo: 0,
  anguloVel: 0,
  fase: "cae",
  faseDesde: -10,
  rebotes: 0,
  fuerza: 0,
  tumboVecino: false,
  miraMeta: 0,
  alzadaMeta: 0,
  pataleoMeta: 0,
  ritmo: 0,
  pataleo: 0,
  faseBrazos: 0,
  mareo: 0,
  baile: 1,
  contentoDesde: -10,
  ultX: 0,
  ultY: 0,
  ultRy: 0,
  ultRz: 0,
  mezclaPendiente: false,
  mezclaX: 0,
  mezclaY: 0,
  mezclaRy: 0,
  mezclaRz: 0,
});

// La abducción: baja una nave sobre un bailarín, prende el rayo y lo sube a saltos (en los bombos),
// lo tiene arriba girando con los brazos en alto, lo baja a su lugar y se va. Segundos de cada parte:
const ABDUCCION = { baja: 1.4, prende: 0.6, subeMax: 5, arriba: 2.6, devuelve: 1.6, apaga: 0.5, seVa: 1.3 };
/**
 * La que trae de vuelta a uno que tiraron por arriba de la pantalla: baja con él ya colgado del rayo
 * (arranca `masAlto` más arriba, así él también entra desde afuera), el rayo prende en `prende` s y lo
 * tiene arriba solo `arriba` s. Después lo baja como al final de una abducción.
 */
const DEVOLUCION = { masAlto: 1.4, prende: 0.3, arriba: 0.9 };
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
  /** Lo trae de vuelta (lo tiraron por arriba): baja con él colgado, `extraY` más arriba que su lugar en el rayo. */
  devolucion: boolean;
  extraY: number;
};

export type Rave = Pieza & {
  /** Centro de cada cabeza en el mundo y su radio (x, y, z, r; r = 0 si no se ve): para tocarlos (también en el aire). */
  cabezas: Float32Array;
  /** Pies de cada bailarín en el mundo (x, y, z por bailarín, mismo índice que cabezas): el otro extremo del cuerpo. */
  pies: Float32Array;
  tocar: (indice: number, reloj: number) => void;
  /**
   * Baja una nave y se lleva a ese bailarín por el rayo (el mismo índice que `cabezas`; -1 = uno
   * cualquiera de los que se ven). false si ya hay una abducción en curso o ese no se puede.
   */
  abducir: (indice: number, reloj: number) => boolean;
  /** Prende o apaga las abducciones solas (una cada 25–45 s, en un bombo). Jugando, apagarlas. */
  abducirSola: (si: boolean) => void;
  /** Si al bailarín se lo puede levantar ahora. */
  sePuedeAgarrar: (indice: number, reloj: number) => boolean;
  /** Lo levanta el dedo, que está en `punto` (mundo). Uno a la vez: si había otro agarrado, lo suelta. */
  agarrar: (indice: number, punto: THREE.Vector3, reloj: number) => void;
  /** Adónde va el dedo en este cuadro (mundo, ya proyectado a la profundidad del bailarín; la z se ignora). */
  arrastrar: (punto: THREE.Vector3) => void;
  /** Lo suelta: sale con la velocidad que traía (la mide la rave). Sin nadie agarrado, no hace nada. */
  soltar: (reloj: number) => void;
  /** A qué profundidad (z del mundo) está ese bailarín: ahí proyecta el dedo _Nave. */
  profundidad: (indice: number) => number;
  /** Lo voltea como un bolo para `lado` (1 = +x, -1 = -x). `fuerza` 0..1 (de la velocidad del dedo). */
  empujar: (indice: number, lado: 1 | -1, fuerza: number, reloj: number) => void;
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
    const z = azar(0.5, 3.2);
    const mv = mitadVisible(z, 1);
    return {
      orden: ordenesPareja[Math.floor(i / 2)] * 2 + (i % 2),
      x,
      z,
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
      par: null,
      aplausoDesde: -10,
      banda: Math.min(BANDAS - 1, Math.floor(Math.abs(x) * BANDAS)),
      xAhora: x,
      zExtra: 0,
      giroExtra: 0,
      mvx: mv.x,
      mvy: mv.y,
      fuera: nuevoFuera(),
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
    const par: Pareja = { a, b, cambioDesde: -10, xa: a.x, xb: b.x };
    a.par = par;
    b.par = par;
    parejas.push(par);
  }
  bailarines.sort((a, b) => a.z - b.z);
  let olaDesde = -10;
  // Centro de cada cabeza en el mundo y su radio (x, y, z, r; r = 0 si no se ve): para tocarlos.
  const centros = new Float32Array(BAILARINES * 4);
  const pies = new Float32Array(BAILARINES * 3);

  const raiz = new THREE.Object3D();
  // El giro de costado (z) va en el plano de la pantalla aunque mire para un lado: así el péndulo, el
  // giro del tiro y el bolo se leen de frente (con el orden de siempre se achicaban de perfil).
  raiz.rotation.order = "ZYX";
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

  const cambiandoDeLugar = (b: Bailarin, reloj: number) => b.par !== null && reloj - b.par.cambioDesde < CAMBIO_DE_LUGAR;
  const llevadoPorNave = (b: Bailarin) => abduccion !== null && abduccion.bailarin === b;

  const nuevaAbduccion = (b: Bailarin, reloj: number, devolucion: boolean): Abduccion => {
    const nave = crearNave(kit, elegirModelo(kit));
    nave.grupo.scale.setScalar(ESCALA_ABDUCTORA);
    // El rayo se estira desde la panza (la punta del cono queda pegada a la nave).
    nave.rayo.scale.set(ANCHO_RAYO, LARGO_RAYO, ANCHO_RAYO);
    nave.rayo.position.y = nave.bajo - PANZA_Y * LARGO_RAYO;
    nave.matRayo.uniforms.uOpacidad.value = 0;
    // Se ubica en el próximo cuadro: hasta entonces no se dibuja (si no, saldría un cuadro en el centro).
    nave.grupo.visible = false;
    grupo.add(nave.grupo);
    return {
      bailarin: b,
      nave,
      desde: reloj,
      // La que lo devuelve ya lo trae arriba, agarrado.
      alto: devolucion ? 1 : 0,
      meta: devolucion ? 1 : 0,
      altoBaja: 0,
      subida: 0,
      agarre: devolucion ? 1 : 0,
      dx: 0,
      giro: 0,
      arribaDesde: -1,
      bajaDesde: -1,
      dejoDesde: -1,
      fase: Math.random() * Math.PI * 2,
      rumbo: Math.random() < 0.5 ? -1 : 1,
      vaiven: nuevoVaiven(),
      devolucion,
      extraY: 0,
    };
  };

  const abducir = (indice: number, reloj: number): boolean => {
    if (abduccion) return false;
    let b: Bailarin | undefined;
    if (indice >= 0) {
      b = bailarines[indice];
    } else {
      // Uno que se vea bien: no en las puntas (en un celu parado se cortaría), ni cambiando de lugar, ni afuera.
      const candidatos = bailarines.filter(
        (c) => c.orden < visiblesAhora && Math.abs(c.x) < 0.75 && c.fuera.estado === "baila" && !cambiandoDeLugar(c, reloj)
      );
      b = candidatos.length > 0 ? candidatos[Math.floor(Math.random() * candidatos.length)] : undefined;
    }
    if (!b || b.orden >= visiblesAhora || b.fuera.estado !== "baila" || cambiandoDeLugar(b, reloj)) return false;
    abduccion = nuevaAbduccion(b, reloj, false);
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
    const yPies = baseY + PIES_RAVE * b.escala;
    const panza = yPies + 3.4 * LARGO_RAYO * s * 0.95;
    const yNave = panza - ab.nave.bajo * s;
    const yAfuera = 0.6 + mv.y + 1.6;
    // La que lo devuelve arranca más arriba: él viene colgado abajo y también tiene que entrar desde afuera.
    const yDesde = yAfuera + (ab.devolucion ? DEVOLUCION.masAlto : 0);
    // Sube hasta media altura del rayo (más arriba el cono es finito y quedaría afuera).
    ab.subida = Math.max(0, panza - 0.12 - (baseY + CORONILLA * b.escala)) * 0.72;

    // El rayo prende y apaga con fundido y su brillo sigue la curva lenta. La que lo devuelve lo trae
    // agarrado desde el principio: prende enseguida (fuera de la pantalla) y lo tiene hasta dejarlo.
    const prende = ab.devolucion
      ? suave(THREE.MathUtils.clamp(tau / DEVOLUCION.prende, 0, 1))
      : suave(THREE.MathUtils.clamp((tau - A.baja + 0.25) / A.prende, 0, 1));
    const luz = ab.dejoDesde < 0 ? prende : 1 - suave(THREE.MathUtils.clamp((m.reloj - ab.dejoDesde) / A.apaga, 0, 1));
    ab.agarre = ab.devolucion && ab.dejoDesde < 0 ? 1 : luz;

    if (ab.bajaDesde < 0) {
      // Sube a saltos: cada bombo lo empuja un poco y entre bombo y bombo sube despacio igual.
      if (!ab.devolucion && tau > A.baja + A.prende * 0.5) {
        ab.meta = Math.min(1, ab.meta + m.dt * 0.07 + (m.golpeAhora ? 0.2 : 0));
        if (tau > A.baja + A.prende + A.subeMax) ab.meta = 1;
      }
      ab.alto += (ab.meta - ab.alto) * Math.min(1, m.dt * 4);
      // La que lo devuelve ya lo trae arriba: cuenta desde que llegó sobre su lugar.
      const llego = !ab.devolucion || tau >= A.baja;
      if (ab.arribaDesde < 0 && llego && ab.alto > 0.985) ab.arribaDesde = m.reloj;
      if (ab.arribaDesde >= 0 && m.reloj - ab.arribaDesde > (ab.devolucion ? DEVOLUCION.arriba : A.arriba)) {
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
      y = yDesde + (yNave - yDesde) * suave(THREE.MathUtils.clamp(tau / A.baja, 0, 1));
    } else {
      const k = THREE.MathUtils.clamp((m.reloj - ab.dejoDesde - A.apaga * 0.6) / A.seVa, 0, 1);
      y = yNave + (yAfuera + 2 - yNave) * k * k;
    }
    // Bajando con él colgado: lo que a la nave le falta para llegar, él lo tiene de más.
    ab.extraY = ab.devolucion && ab.dejoDesde < 0 ? y - yNave : 0;
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

  // ————— El dedo: agarrar, tirar, voltear —————
  /** El que lleva el dedo ahora (uno a la vez). */
  let agarrado: Bailarin | null = null;
  const dedo = new THREE.Vector2();
  const dedoAntes = new THREE.Vector2();
  const dedoVel = new THREE.Vector2();
  const tiro = new THREE.Vector2();
  // Por dónde pasó el dedo en los últimos cuadros, con un reloj propio (suma los dt: en pausa no corre).
  const muestraT = new Float64Array(MUESTRAS_DEDO);
  const muestraX = new Float32Array(MUESTRAS_DEDO);
  const muestraY = new Float32Array(MUESTRAS_DEDO);
  let muestras = 0;
  let muestraSig = 0;
  let tiempoDedo = 0;

  const anotarDedo = (x: number, y: number) => {
    muestraT[muestraSig] = tiempoDedo;
    muestraX[muestraSig] = x;
    muestraY[muestraSig] = y;
    muestraSig = (muestraSig + 1) % MUESTRAS_DEDO;
    muestras = Math.min(MUESTRAS_DEDO, muestras + 1);
  };
  /** La velocidad del dedo en la última `ventana` de segundos (de punta a punta: si se quedó quieto, 0). */
  const velocidadDedo = (ventana: number, salida: THREE.Vector2) => {
    salida.set(0, 0);
    if (muestras < 2) return salida;
    const ultima = (muestraSig - 1 + MUESTRAS_DEDO) % MUESTRAS_DEDO;
    let desde = ultima;
    for (let n = 1; n < muestras; n++) {
      desde = (ultima - n + MUESTRAS_DEDO) % MUESTRAS_DEDO;
      if (muestraT[ultima] - muestraT[desde] >= ventana) break;
    }
    const lapso = muestraT[ultima] - muestraT[desde];
    if (lapso > 1e-3) salida.set((muestraX[ultima] - muestraX[desde]) / lapso, (muestraY[ultima] - muestraY[desde]) / lapso);
    return salida;
  };

  /** Cambia de estado. La pose no salta: arranca de la última dibujada y llega sola a la nueva. */
  const cambiar = (b: Bailarin, estado: Estado, reloj: number) => {
    b.fuera.estado = estado;
    b.fuera.desde = reloj;
    b.fuera.mezclaPendiente = true;
  };
  /** Vuelve al baile en el acto (se dejó de ver, o se lo lleva una nave fuera de la pantalla). */
  const volverAlBaile = (b: Bailarin, reloj: number) => {
    const f = b.fuera;
    f.estado = "baila";
    f.desde = reloj;
    f.mezclaPendiente = false;
    f.mezclaX = f.mezclaY = f.mezclaRy = f.mezclaRz = 0;
    f.giro = f.giroVel = 0;
    f.mareo = f.pataleo = 0;
    if (agarrado === b) agarrado = null;
  };

  /** Se ve, está bailando (no afuera ni volteado) y no lo ocupa otra cosa: se lo puede voltear. */
  const sePuedeVoltear = (b: Bailarin, indice: number, reloj: number) =>
    b.orden < visiblesAhora && centros[indice * 4 + 3] > 0 && b.fuera.estado === "baila" && !llevadoPorNave(b) && !cambiandoDeLugar(b, reloj);

  /** Volteado, la cabeza gira alrededor de los pies, que quedan en su lugar. */
  const posarVolteado = (b: Bailarin) => {
    const f = b.fuera;
    const largo = -PIES_RAVE * b.escala;
    const pieX = b.xAhora * b.mvx * 0.92;
    const pieY = -b.mvy * 0.6 - largo;
    f.x = pieX + f.lado * largo * Math.sin(f.angulo);
    f.y = pieY + largo * Math.cos(f.angulo);
    f.giro = -f.lado * f.angulo;
  };

  const empujar = (indice: number, lado: 1 | -1, fuerza: number, reloj: number) => {
    const b = bailarines[indice];
    if (!b || !sePuedeVoltear(b, indice, reloj)) return;
    const f = b.fuera;
    const k = Number.isFinite(fuerza) ? clamp(fuerza, 0, 1) : 0.5;
    f.lado = lado;
    f.angulo = 0;
    f.anguloVel = VOLTEO.empujon + k * VOLTEO.extra;
    f.fase = "cae";
    f.rebotes = 0;
    f.fuerza = k;
    f.tumboVecino = false;
    cambiar(b, "volteado", reloj);
    posarVolteado(b);
  };

  /** Como un bolo: el más cercano que sigue parado para ese lado, si la cabeza del que cae lo alcanza. */
  const tumbarVecino = (b: Bailarin, reloj: number) => {
    const f = b.fuera;
    const pieX = b.xAhora * b.mvx * 0.92;
    // Hasta la coronilla (lo que de verdad le pega al de al lado): en la compu están más separados que
    // el largo hasta el centro de la cabeza y la fila no caía en cadena.
    let alcance = (CORONILLA - PIES_RAVE) * b.escala;
    let vecino = -1;
    for (let j = 0; j < BAILARINES; j++) {
      const otro = bailarines[j];
      if (otro === b || !sePuedeVoltear(otro, j, reloj)) continue;
      const d = (centros[j * 4] - pieX) * f.lado;
      if (d > 0 && d < alcance) {
        alcance = d;
        vecino = j;
      }
    }
    if (vecino >= 0) empujar(vecino, f.lado, Math.max(0.35, f.fuerza * 0.85), reloj);
  };

  /** Uno que vuela bajito tumba a los parados que pasa rozando, para donde va. */
  const rozar = (b: Bailarin, reloj: number) => {
    const f = b.fuera;
    // En la escala del escenario (x / mitad visible): cuenta lo que se ve encimado aunque estén a otra profundidad.
    const u = f.x / b.mvx;
    for (let j = 0; j < BAILARINES; j++) {
      const otro = bailarines[j];
      if (otro === b || !sePuedeVoltear(otro, j, reloj)) continue;
      const dx = centros[j * 4] / otro.mvx - u;
      if (Math.abs(dx) * b.mvx >= ROCE.ancho) continue;
      const lado = Math.abs(f.vx) > 0.8 ? (f.vx > 0 ? 1 : -1) : dx >= 0 ? 1 : -1;
      empujar(j, lado, clamp(Math.abs(f.vx) / 15 + 0.3, 0.3, 1), reloj);
      f.vx *= 0.85;
    }
  };

  const llegar = (b: Bailarin, reloj: number) => {
    cambiar(b, "baila", reloj);
    b.fuera.contentoDesde = reloj;
    b.saltoDesde = reloj;
    b.saltoAlto = SALTO_CONTENTO;
  };
  const empezarACaminar = (b: Bailarin, reloj: number) => {
    const f = b.fuera;
    const distancia = Math.abs(b.xAhora * b.mvx * 0.92 - f.x);
    if (distancia < 0.03) {
      llegar(b, reloj);
      return;
    }
    f.caminaDesde = f.x;
    f.saltitos = Math.max(1, Math.round(distancia / CAMINA.largoSaltito));
    f.rapidez = Math.max(CAMINA.rapidez, distancia / CAMINA.tardaMax);
    cambiar(b, "vuelve", reloj);
  };
  const marear = (b: Bailarin, reloj: number) => {
    const f = b.fuera;
    f.vy = 0;
    // Se endereza a la vuelta entera más cercana contando para dónde venía girando.
    f.giroMeta = Math.round((f.giro + f.giroVel * 0.15) / VUELTA) * VUELTA;
    cambiar(b, "mareado", reloj);
  };
  /** Lo tiraron por arriba de la pantalla: una abductora lo trae colgado del rayo y lo deja en su lugar. */
  const devolver = (b: Bailarin, reloj: number) => {
    // Está fuera de la pantalla: vuelve al baile sin mezclar la pose (cuelga de la nave desde ya).
    volverAlBaile(b, reloj);
    b.fuera.baile = 0;
    abduccion = nuevaAbduccion(b, reloj, true);
  };

  const sePuedeAgarrar = (indice: number, reloj: number) => {
    const b = bailarines[indice];
    if (!b) return false;
    // r > 0: se dibujó en el último cuadro (se ve).
    return b.orden < visiblesAhora && centros[indice * 4 + 3] > 0 && !llevadoPorNave(b) && !cambiandoDeLugar(b, reloj);
  };

  const soltar = (reloj: number) => {
    const b = agarrado;
    if (!b) return;
    agarrado = null;
    const f = b.fuera;
    velocidadDedo(VENTANA_TIRO, tiro);
    if (tiro.length() > TIRO_MAX) tiro.setLength(TIRO_MAX);
    // Apoyado en el piso y casi quieto no es un tiro: vuelve caminando, sin marearse.
    if (f.y + b.mvy * 0.6 < 0.08 && tiro.length() < 2) {
      empezarACaminar(b, reloj);
      return;
    }
    f.vx = tiro.x;
    f.vy = tiro.y;
    // Gira para donde lo tiraron (y algo del péndulo que traía).
    f.giroVel = -f.vx * GIRO_POR_VELOCIDAD + f.giroVel * 0.3;
    f.piques = 0;
    cambiar(b, "vuela", reloj);
  };

  const agarrar = (indice: number, punto: THREE.Vector3, reloj: number) => {
    if (!sePuedeAgarrar(indice, reloj)) return;
    const b = bailarines[indice];
    if (agarrado && agarrado !== b) soltar(reloj);
    const f = b.fuera;
    if (f.estado !== "agarrado") {
      // Lo levanta de donde esté y con lo que se venía moviendo (volando o cayéndose), sin saltos.
      if (f.estado === "vuela") {
        f.vx = clamp(f.vx, -12, 12);
        f.vy = clamp(f.vy, -12, 12);
        f.giroVel = clamp(f.giroVel, -8, 8);
      } else {
        f.vx = 0;
        f.vy = 0;
        f.giroVel = f.estado === "volteado" ? -f.lado * f.anguloVel : 0;
      }
      f.x = f.ultX;
      f.y = f.ultY;
      f.giro = difAngulo(f.ultRz, 0);
      cambiar(b, "agarrado", reloj);
    }
    agarrado = b;
    dedo.set(punto.x, punto.y);
    dedoAntes.copy(dedo);
    muestras = 0;
    anotarDedo(punto.x, punto.y);
  };

  /** Cada cuadro, antes que la nave y que ubicar a la gente: lo que le pasa al que salió del baile. */
  const moverFuera = (b: Bailarin, m: Musica) => {
    const f = b.fuera;
    const dt = m.dt;
    const piso = -b.mvy * 0.6;
    const costado = b.mvx * 0.92;
    const largo = -PIES_RAVE * b.escala;
    const t = m.reloj - f.desde;
    // Pasos chicos: con el dt de un cuadro lento el resorte firme y el péndulo se desarmarían.
    const pasos = dt > 0 ? Math.min(12, Math.ceil(dt / PASO_FISICA)) : 0;
    const h = pasos > 0 ? dt / pasos : 0;
    f.miraMeta = 0;
    f.alzadaMeta = 0;
    f.pataleoMeta = 0;
    f.ritmo = 12;

    switch (f.estado) {
      case "baila":
        break;
      case "agarrado": {
        // Lo que se ve de su plano: de acá no se lo puede sacar (ni meterlo en el piso).
        const techo = 0.6 + b.mvy * 0.95 - CORONILLA * b.escala;
        const l = PENDULO.largo * largo;
        velocidadDedo(VENTANA_RESORTE, dedoVel);
        for (let s = 0; s < pasos; s++) {
          const u = (s + 1) / pasos;
          const metaX = clamp(dedoAntes.x + (dedo.x - dedoAntes.x) * u, -costado, costado);
          const metaY = clamp(dedoAntes.y + (dedo.y - dedoAntes.y) * u, piso, techo);
          // Con la velocidad del dedo sumada al freno: si el dedo corre, la cabeza no se queda atrás.
          const ax = RESORTE_DEDO.firmeza * (metaX - f.x) + RESORTE_DEDO.freno * (dedoVel.x - f.vx);
          const ay = RESORTE_DEDO.firmeza * (metaY - f.y) + RESORTE_DEDO.freno * (dedoVel.y - f.vy);
          f.vx += ax * h;
          f.vy += ay * h;
          f.x += f.vx * h;
          f.y += f.vy * h;
          if (Math.abs(f.x) > costado) {
            f.x = Math.sign(f.x) * costado;
            f.vx = 0;
          }
          if (f.y < piso || f.y > techo) {
            f.y = clamp(f.y, piso, techo);
            f.vy = 0;
          }
          // El cuerpo cuelga de la cabeza: se queda atrás cuando arranca o corre, y se pasa cuando frena.
          const empujeX = clamp(PENDULO.empuje * ax + PENDULO.arrastre * f.vx, -PENDULO.acelMax, PENDULO.acelMax);
          const empujeY = clamp(PENDULO.empuje * ay, -GRAVEDAD_RAVE * 0.6, PENDULO.acelMax);
          const torque = -((GRAVEDAD_RAVE + empujeY) * Math.sin(f.giro) + empujeX * Math.cos(f.giro)) / l;
          f.giroVel += (torque - PENDULO.freno * f.giroVel) * h;
          f.giro += f.giroVel * h;
        }
        dedoAntes.copy(dedo);
        f.alzadaMeta = 1;
        f.pataleoMeta = 1;
        f.ritmo = 24;
        break;
      }
      case "vuela": {
        for (let s = 0; s < pasos && f.estado === "vuela"; s++) {
          f.vy -= GRAVEDAD_RAVE * h;
          f.x += f.vx * h;
          f.y += f.vy * h;
          f.giro += f.giroVel * h;
          if (Math.abs(f.x) > costado && f.x * f.vx > 0) {
            f.x = Math.sign(f.x) * costado;
            f.vx = -f.vx * REBOTE_PARED;
            f.giroVel *= -0.6;
          }
          if (f.y < piso && f.vy < 0) {
            f.y = piso;
            f.piques++;
            // El primer pique siempre (aunque lo hayan soltado bajito); el segundo, si le queda envión.
            const sube = -f.vy * REBOTE_PISO;
            if (f.piques === 1 || (f.piques === 2 && sube > 1.5)) {
              f.vy = Math.max(sube, f.piques === 1 ? PIQUE_MIN : 0);
              f.vx *= 0.7;
              f.giroVel *= 0.5;
            } else {
              marear(b, m.reloj);
            }
          }
        }
        if (f.estado !== "vuela") break;
        // Se fue por arriba: si no hay otra nave en curso (ni se está jugando), una lo trae de vuelta.
        if (f.y - largo > 0.6 + b.mvy + SALIDA_ARRIBA && abduccion === null && abducirSola) {
          devolver(b, m.reloj);
          break;
        }
        if (f.y - piso < ROCE.alto) rozar(b, m.reloj);
        f.alzadaMeta = 1;
        f.pataleoMeta = 0.7;
        f.ritmo = 15;
        break;
      }
      case "mareado": {
        for (let s = 0; s < pasos; s++) {
          f.vx *= Math.exp(-8 * h);
          f.x = clamp(f.x + f.vx * h, -costado, costado);
          // Se endereza con un resorte (si venía girando rápido, se pasa un poco y vuelve).
          f.giroVel += (60 * (f.giroMeta - f.giro) - 11 * f.giroVel) * h;
          f.giro += f.giroVel * h;
        }
        f.y = piso;
        const k = Math.min(1, t / MAREO);
        f.mareo = Math.min(1, t / 0.12) * (1 - suave(k));
        f.pataleoMeta = 0.15;
        f.ritmo = 5;
        if (k >= 1) {
          // Las vueltas enteras no se ven: se descuentan para que no se acumulen.
          f.giro -= f.giroMeta;
          f.giroMeta = 0;
          empezarACaminar(b, m.reloj);
        }
        break;
      }
      case "vuelve": {
        const casa = b.xAhora * b.mvx * 0.92;
        const dir = casa >= f.caminaDesde ? 1 : -1;
        const total = Math.max(1e-3, Math.abs(casa - f.caminaDesde));
        f.x += dir * f.rapidez * dt;
        const llego = (casa - f.x) * dir <= 0;
        if (llego) f.x = casa;
        // Los saltitos terminan justo en su lugar (un número entero de saltitos en el camino).
        const paso = clamp(Math.abs(f.x - f.caminaDesde) / total, 0, 1) * f.saltitos * Math.PI;
        f.y = piso + Math.abs(Math.sin(paso)) * CAMINA.saltito;
        // Se bambolea de un pie al otro con cada saltito.
        f.giro = Math.sin(paso) * 0.1;
        f.miraMeta = dir * 1.15;
        f.pataleoMeta = 0.3;
        f.ritmo = (f.rapidez * f.saltitos * Math.PI) / total;
        if (llego) llegar(b, m.reloj);
        break;
      }
      case "volteado": {
        if (f.fase === "cae") {
          // Péndulo invertido sobre los pies: arranca con el empujón y acelera al caer.
          const caida = GRAVEDAD_RAVE / (PENDULO.largo * largo);
          for (let s = 0; s < pasos && f.fase === "cae"; s++) {
            f.anguloVel += caida * Math.sin(f.angulo) * h;
            f.angulo += f.anguloVel * h;
            if (f.angulo >= VOLTEO.acostado) {
              f.angulo = VOLTEO.acostado;
              if (f.rebotes === 0 && f.anguloVel > 1.5) {
                f.anguloVel *= -VOLTEO.rebote;
                f.rebotes = 1;
              } else {
                f.anguloVel = 0;
                f.fase = "acostado";
                f.faseDesde = m.reloj;
              }
            }
          }
          if (!f.tumboVecino && f.angulo > VOLTEO.vecino) {
            f.tumboVecino = true;
            tumbarVecino(b, m.reloj);
          }
          f.alzadaMeta = 0.6;
          f.pataleoMeta = 0.5;
          f.ritmo = 18;
        } else if (f.fase === "acostado") {
          if (m.reloj - f.faseDesde > VOLTEO.queda) {
            f.fase = "levanta";
            f.faseDesde = m.reloj;
          }
          f.alzadaMeta = 0.3;
          f.pataleoMeta = 0.35;
        } else {
          const k = clamp((m.reloj - f.faseDesde) / VOLTEO.levanta, 0, 1);
          f.angulo = VOLTEO.acostado * (1 - suave(k));
          if (k >= 1) {
            cambiar(b, "baila", m.reloj);
            b.saltoDesde = m.reloj;
            b.saltoAlto = SALTITO_LEVANTA;
          }
        }
        posarVolteado(b);
        break;
      }
    }

    if (f.estado !== "mareado") f.mareo *= Math.exp(-12 * dt);
    f.pataleo += (f.pataleoMeta - f.pataleo) * Math.min(1, dt * 10);
    f.faseBrazos += f.ritmo * dt;
    f.baile += ((f.estado === "baila" ? 1 : 0) - f.baile) * Math.min(1, dt * 8);
  };

  return {
    obj: grupo,
    cabezas: centros,
    pies,
    tocar: (indice, reloj) => {
      const b = bailarines[indice];
      if (!b) return;
      const f = b.fuera;
      if (f.estado === "vuela") {
        // En el aire el toque lo hace subir otro poco y girar más.
        f.vy = Math.max(f.vy, 0) + 5;
        f.giroVel += f.vx >= 0 ? -9 : 9;
        return;
      }
      if (f.estado !== "baila") return;
      b.saltoDesde = reloj;
      b.saltoAlto = azar(1.3, 1.8);
      b.vueltaDesde = reloj;
    },
    abducir,
    abducirSola: (si) => {
      abducirSola = si;
    },
    sePuedeAgarrar,
    agarrar,
    arrastrar: (punto) => {
      if (agarrado) dedo.set(punto.x, punto.y);
    },
    soltar,
    profundidad: (indice) => {
      const b = bailarines[indice];
      return b ? b.z + b.zExtra : 0;
    },
    empujar,
    actualizar: (m) => {
      const visibles = Math.round(BAILARINES * THREE.MathUtils.clamp(m.aspecto, 0.6, 1));
      visiblesAhora = visibles;
      // El dedo: dónde está en este cuadro (para medir con qué velocidad lo tiran).
      if (m.dt > 0) {
        tiempoDedo += m.dt;
        if (agarrado) anotarDedo(dedo.x, dedo.y);
      }

      // Olas: los graves fuertes largan una que cruza desde una punta (en el drop, desde el medio).
      const drop = m.drop > 0.95;
      if ((drop || (m.golpeAhora && m.graves > 0.7 && Math.random() < 0.3)) && m.reloj - olaDesde > OLA_ENTRE) {
        olaDesde = m.reloj;
        const origen = drop ? 0 : Math.random() < 0.5 ? -1 : 1;
        for (const b of bailarines) {
          // El que ya está en el aire termina su salto (si no, caería al piso de un cuadro al otro).
          const enElAire = m.reloj - b.saltoDesde < 0.45 && m.reloj >= b.saltoDesde;
          if (enElAire || b.fuera.estado !== "baila") continue;
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
        // se lo está llevando una nave, o lo sacó el dedo del baile).
        const ocupada =
          llevadoPorNave(par.a) || llevadoPorNave(par.b) || par.a.fuera.estado !== "baila" || par.b.fuera.estado !== "baila";
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

      // Los que sacó el dedo (y los volteados): antes que la nave, así una devolución arranca en este cuadro.
      for (const b of bailarines) {
        if (b.orden >= visibles) {
          // Se dejó de ver estando afuera (el celu se dio vuelta): vuelve a su lugar sin más.
          if (b.fuera.estado !== "baila") volverAlBaile(b, m.reloj);
          continue;
        }
        const mv = mitadVisible(b.z, m.aspecto);
        b.mvx = mv.x;
        b.mvy = mv.y;
        moverFuera(b, m);
      }

      if (abduccion) moverAbduccion(m, abduccion);
      const llevado = abduccion;
      const decae = Math.exp(-m.dt / MEZCLA_POSE);

      bailarines.forEach((b, i) => {
        centros[i * 4 + 3] = 0;
        if (b.orden >= visibles) {
          for (const parte of [cabezas, ojos, brillos, cuerpos]) parte.setMatrixAt(i, oculto);
          brazos.setMatrixAt(i * 2, oculto);
          brazos.setMatrixAt(i * 2 + 1, oculto);
          return;
        }
        const f = b.fuera;
        const baila = f.estado === "baila";
        // Algún salto suelto en los bombos, sin pisar una ola que viene en camino.
        if (baila && m.golpeAhora && b.saltoDesde < m.reloj - 0.45 && Math.random() < 0.12) {
          b.saltoDesde = m.reloj;
          b.saltoAlto = azar(0.3, 0.9) * (0.6 + m.graves);
        }
        // Con quién baila: su pareja si se ve; si no, solo (0).
        const conPareja = b.pareja !== null && b.pareja.orden < visibles ? b.hacia : 0;
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
        const flota = ab ? ab.alto * ab.subida + Math.sin(m.reloj * 2.3 + b.fase) * 0.05 * ab.alto + ab.extraY : 0;
        const v = (m.reloj - b.vueltaDesde) / VUELTA_RAVE;
        const vuelta = v >= 0 && v < 1 ? suave(v) * Math.PI * 2 : 0;
        // El vaivén es espejado entre los dos de la pareja (mismo compás, signo contrario).
        const vaiven = Math.sin(m.reloj * 2 + b.fase) * 0.06 * (conPareja || 1);
        // Colgado del rayo se mece como sin gravedad.
        const mecido = ab ? Math.sin(m.reloj * 1.7 + b.fase) * 0.2 * ab.alto : 0;

        let x: number;
        let y: number;
        let ry: number;
        let rz: number;
        if (baila) {
          // Arriba de la barra del player, que tapa el borde de abajo en el celu.
          x = b.xAhora * b.mvx * 0.92 + arrime * suelto + (ab ? ab.dx * ab.alto : 0);
          y = -b.mvy * 0.6 + (rebote + salto) * suelto + flota;
          // Se miran con la pareja (más cuanto más suenan los medios); con dedo o mouse, todos lo miran a él.
          const metaMira = kit.mirada.activa
            ? THREE.MathUtils.clamp(Math.atan2(kit.mirada.punto.x - x, kit.mirada.punto.z - b.z), -0.8, 0.8)
            : conPareja * (0.35 + m.medios * 0.45);
          b.mira += (metaMira - b.mira) * Math.min(1, m.dt * 6);
          ry = Math.sin(m.reloj + b.fase) * 0.12 + b.mira + vuelta + b.giroExtra + (ab ? ab.giro : 0);
          rz = vaiven * suelto + mecido;
        } else {
          // Afuera la pose la arma moverFuera; acá se suman el meneo del pataleo y el tambaleo del mareo.
          x = f.x;
          y = f.y;
          b.mira += (f.miraMeta - b.mira) * Math.min(1, m.dt * 6);
          ry = Math.sin(m.reloj + b.fase) * 0.12 * f.baile + b.mira + Math.sin(f.faseBrazos * 0.6) * 0.18 * f.pataleo;
          rz = f.giro + Math.sin(m.reloj * 5.5 + b.fase) * 0.14 * f.mareo;
        }
        // Recién cambió de estado: lo que separa la pose nueva de la última dibujada se apaga solo.
        if (f.mezclaPendiente) {
          f.mezclaPendiente = false;
          f.mezclaX = f.ultX - x;
          f.mezclaY = f.ultY - y;
          f.mezclaRy = difAngulo(f.ultRy, ry);
          f.mezclaRz = difAngulo(f.ultRz, rz);
        }
        f.mezclaX *= decae;
        f.mezclaY *= decae;
        f.mezclaRy *= decae;
        f.mezclaRz *= decae;
        x += f.mezclaX;
        y += f.mezclaY;
        ry += f.mezclaRy;
        rz += f.mezclaRz;
        f.ultX = x;
        f.ultY = y;
        f.ultRy = ry;
        f.ultRz = rz;

        raiz.position.set(x, y, b.z + b.zExtra);
        raiz.rotation.set(0, ry, rz);
        raiz.scale.setScalar(b.escala);
        raiz.updateMatrix();
        centros[i * 4] = x;
        centros[i * 4 + 1] = y;
        centros[i * 4 + 2] = b.z + b.zExtra;
        centros[i * 4 + 3] = b.escala * 1.4;
        // Los pies: el giro de costado es en el plano de la pantalla, así que quedan en el mismo z.
        const largo = -PIES_RAVE * b.escala;
        pies[i * 3] = x + largo * Math.sin(rz);
        pies[i * 3 + 1] = y - largo * Math.cos(rz);
        pies[i * 3 + 2] = b.z + b.zExtra;

        tmpColor.copy(b.rosa ? m.colorB : m.colorA).multiplyScalar(0.55 + m.brillo * 0.12);

        // Cabeceo con los graves, para adelante, con el pivote en el cuello. Mareado, la cabeza da vueltas.
        const cabeceo = -0.06 + m.graves * 0.32 * pulso * f.baile;
        const bamboleo = m.reloj * 8 + b.fase;
        cabeza
          .copy(raiz.matrix)
          .multiply(
            ponerLocal(
              0,
              CUELLO_Y,
              0,
              cabeceo + Math.cos(bamboleo) * 0.25 * f.mareo,
              0,
              Math.sin(m.reloj * 2 + b.fase) * 0.1 + Math.sin(bamboleo) * 0.35 * f.mareo
            )
          )
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
        // no, cada uno baila a su manera. Afuera del baile, lo que pide su estado.
        const enOla = saltando && m.reloj - olaDesde < 2.5;
        // El que se lleva el rayo, con los brazos arriba todo el viaje; y el que volvió a su lugar, contento.
        const contento = m.reloj - f.contentoDesde < 0.55 ? 1 : 0;
        const metaAlzada = baila
          ? Math.max(Math.min(1, m.drop * 1.6), saltando && (b.estilo === 0 || enOla) ? 1 : 0, v >= 0 && v < 1.6 ? 1 : 0, agarre, contento)
          : f.alzadaMeta;
        const rapidez = Math.min(1, m.dt * 12);
        b.alzada += (metaAlzada - b.alzada) * rapidez;
        b.puno += (m.golpe - b.puno) * Math.min(1, m.dt * 25);
        // Choque de manos con la pareja: sube el brazo de su lado y baja.
        const a = (m.reloj - b.aplausoDesde) / APLAUSO;
        const choque = conPareja !== 0 && a >= 0 && a < 1 ? Math.sin(a * Math.PI) : 0;
        for (const lado of [-1, 1]) {
          let angulo = 0.18 + 0.05 * Math.sin(m.reloj * 2 + b.fase);
          // Su manera de bailar se apaga mientras está afuera y vuelve de a poco.
          if (b.estilo === 1 && lado === 1) angulo += b.puno * 2.1 * f.baile;
          if (b.estilo === 2) angulo += (0.5 + Math.sin(m.reloj * 4.6 + b.fase + (lado > 0 ? 0 : Math.PI)) * 0.4 * (0.4 + m.medios)) * f.baile;
          if (lado === conPareja) angulo += choque * (1.9 - angulo) * f.baile;
          angulo += b.alzada * (2.5 - angulo + Math.sin(m.reloj * 7 + b.fase + lado) * 0.2);
          // Agarrado o volando patalea rápido; mareado o caminando, los brazos se balancean.
          angulo += Math.sin(f.faseBrazos + b.fase + lado * 1.9) * 0.45 * f.pataleo;
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
