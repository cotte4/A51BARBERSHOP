import * as THREE from "three";
import { BANDAS } from "./_analisis";
import { azar, crearOvni, CUELLO_Y, CUERPO, mitadVisible, OJO, suave, type Kit } from "./_naveKit";
import { conBorde } from "./_naveMateriales";

// Las piezas fijas del show: siempre están y reaccionan a la música cuadro a cuadro.
//  - Nodriza: el ovni gigante del centro con un anillo de barras del espectro alrededor.
//  - Túnel: anillos de neón que vienen hacia la cámara más rápido cuanto más fuerte suena.
//  - (El terreno vive aparte, con sus biomas y estructuras: _naveTerreno.ts.)
//  - Rave: aliens que cabecean con los graves, saltan en los bombos y levantan los brazos.
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
/** Radio del platillo (el casco por torno mide 1,62) por la escala de la nodriza. */
const RADIO_PLATILLO = 1.62 * 1.7;

/** Lo que el dedo le hace a la nodriza. Lo escribe _Nave.tsx y la nodriza lo lee en cada cuadro. */
export type ControlNodriza = {
  /** A dónde la lleva el dedo (mundo). null = vuelve sola a su lugar. */
  meta: THREE.Vector3 | null;
  /** 0..1: cuánto es nave del juego (más chica, sin vaivén ni golpe de escala). */
  juego: number;
  /** 0..1: el aro que se llena mientras la mantienen apretada. */
  carga: number;
  /** Los escribe la nodriza: su centro y el radio del platillo, en el mundo. */
  posicion: THREE.Vector3;
  radio: number;
};

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

export function crearNodriza(kit: Kit): Pieza & { luces: () => THREE.Vector3[]; control: ControlNodriza; girar: () => void } {
  const grupo = new THREE.Group();
  grupo.position.copy(CASA);
  const control: ControlNodriza = { meta: null, juego: 0, carga: 0, posicion: grupo.position.clone(), radio: RADIO_PLATILLO };
  const velocidad = new THREE.Vector3();
  const destino = new THREE.Vector3();
  const hacia = new THREE.Vector3();
  // Al tocarla gira más rápido un rato.
  let giroExtra = 0;

  const ovni = crearOvni(kit);
  ovni.grupo.scale.setScalar(1.7);
  grupo.add(ovni.grupo);

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
    luces: ovni.posicionesLuces,
    control,
    girar: () => {
      giroExtra = Math.min(giroExtra + 9, 18);
    },
    actualizar: (m) => {
      const libre = 1 - control.juego;
      const escala = escalaPorAspecto(m.aspecto) * (1 - control.juego * 0.5);
      grupo.scale.setScalar(escala * (1 + m.golpe * 0.06 * libre));

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
      control.radio = RADIO_PLATILLO * escala;

      carga.visible = control.carga > 0.01;
      materialCarga.uniforms.uProgreso.value = suave(Math.min(1, control.carga));
      materialCarga.uniforms.uColor.value.copy(m.colorA).lerp(BLANCO, 0.35);

      giroExtra *= Math.exp(-1.2 * m.dt);
      ovni.grupo.rotation.y += m.dt * (0.3 + m.energia * 1.6 + giroExtra);
      ovni.grupo.rotation.z = Math.sin(m.reloj * 0.7) * 0.06;
      ovni.grupo.rotation.x = 0.1;
      ovni.animar(m.reloj);
      ovni.matRayo.uniforms.uOpacidad.value = 0.08 + m.brillo * 0.22;
      ovni.matRayo.uniforms.uColor.value.copy(m.colorA);

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
      ovni.matRayo.dispose();
      ovni.liberar();
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

export function crearRave(kit: Kit): Pieza & { cabezas: Float32Array; tocar: (indice: number, reloj: number) => void } {
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

  // Orden de aparición al azar: en un celu parado se muestran menos, pero repartidos por todo el ancho.
  const ordenes = Array.from({ length: BAILARINES }, (_, i) => i).sort(() => Math.random() - 0.5);
  const bailarines = Array.from({ length: BAILARINES }, (_, i) => ({
    orden: ordenes[i],
    x: (i / (BAILARINES - 1)) * 2 - 1 + azar(-0.03, 0.03),
    z: azar(0.5, 3.2),
    fase: Math.random() * Math.PI * 2,
    escala: azar(0.24, 0.33),
    saltoDesde: -10,
    saltoAlto: 0,
    rosa: Math.random() < 0.3,
    // 0: brazos arriba en los saltos · 1: puño al ritmo · 2: brazos que van y vienen.
    estilo: Math.floor(Math.random() * 3),
    parpadeo: azar(0, 4),
    // Brazos suavizados: suben rápido (~80 ms) pero nunca se teletransportan en un cuadro.
    alzada: 0,
    puno: 0,
    vueltaDesde: -10,
    mira: 0,
  }));
  bailarines.sort((a, b) => a.z - b.z);
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
    actualizar: (m) => {
      const visibles = Math.round(BAILARINES * THREE.MathUtils.clamp(m.aspecto, 0.6, 1));
      bailarines.forEach((b, i) => {
        centros[i * 4 + 3] = 0;
        if (b.orden >= visibles) {
          for (const parte of [cabezas, ojos, brillos, cuerpos]) parte.setMatrixAt(i, oculto);
          brazos.setMatrixAt(i * 2, oculto);
          brazos.setMatrixAt(i * 2 + 1, oculto);
          return;
        }
        if (m.golpeAhora && Math.random() < 0.35) {
          b.saltoDesde = m.reloj;
          b.saltoAlto = azar(0.3, 0.9) * (0.6 + m.graves);
        }
        const mv = mitadVisible(b.z, m.aspecto);
        const k = (m.reloj - b.saltoDesde) / 0.45;
        const saltando = k >= 0 && k < 1;
        const salto = saltando ? Math.sin(k * Math.PI) * b.saltoAlto : 0;
        const pulso = Math.abs(Math.sin(m.reloj * 4.6 + b.fase));
        const rebote = pulso * 0.08 * (0.3 + m.graves);

        // Arriba de la barra del player, que tapa el borde de abajo en el celu.
        raiz.position.set(b.x * mv.x * 0.92, -mv.y * 0.6 + rebote + salto, b.z);
        // Con dedo o mouse en pantalla, todos se dan vuelta a mirarlo.
        const metaMira = kit.mirada.activa
          ? THREE.MathUtils.clamp(Math.atan2(kit.mirada.punto.x - raiz.position.x, kit.mirada.punto.z - b.z), -0.8, 0.8)
          : 0;
        b.mira += (metaMira - b.mira) * Math.min(1, m.dt * 6);
        const v = (m.reloj - b.vueltaDesde) / VUELTA_RAVE;
        const vuelta = v >= 0 && v < 1 ? suave(v) * Math.PI * 2 : 0;
        raiz.rotation.set(0, Math.sin(m.reloj + b.fase) * 0.2 * (1 - Math.abs(b.mira)) + b.mira + vuelta, Math.sin(m.reloj * 2 + b.fase) * 0.05);
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

        // Brazos: en el drop todos arriba (y el que tocaron, mientras gira); si no, cada uno baila a su manera.
        const metaAlzada = Math.max(Math.min(1, m.drop * 1.6), saltando && b.estilo === 0 ? 1 : 0, v >= 0 && v < 1.6 ? 1 : 0);
        const rapidez = Math.min(1, m.dt * 12);
        b.alzada += (metaAlzada - b.alzada) * rapidez;
        b.puno += (m.golpe - b.puno) * Math.min(1, m.dt * 25);
        for (const lado of [-1, 1]) {
          let angulo = 0.18 + 0.05 * Math.sin(m.reloj * 2 + b.fase);
          if (b.estilo === 1 && lado === 1) angulo += b.puno * 2.1;
          if (b.estilo === 2) angulo += 0.5 + Math.sin(m.reloj * 4.6 + b.fase + (lado > 0 ? 0 : Math.PI)) * 0.4 * (0.4 + m.medios);
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
