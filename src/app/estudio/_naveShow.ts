import * as THREE from "three";
import { BANDAS } from "./_analisis";
import { azar, crearOvni, mitadVisible, type Kit } from "./_naveKit";

// Las piezas fijas del show: siempre están y reaccionan a la música cuadro a cuadro.
//  - Nodriza: el ovni gigante del centro con un anillo de barras del espectro alrededor.
//  - Túnel: anillos de neón que vienen hacia la cámara más rápido cuanto más fuerte suena.
//  - Terreno: una grilla que se arma con el espectro y avanza (los graves al medio, los agudos
//    en las montañas de los costados).
//  - Rave: aliens que cabecean con los graves y saltan en los bombos.
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

export function crearNodriza(kit: Kit): Pieza & { luces: () => THREE.Vector3[] } {
  const grupo = new THREE.Group();
  grupo.position.set(0, 1.6, -6);

  const ovni = crearOvni(kit);
  ovni.grupo.scale.setScalar(1.7);
  grupo.add(ovni.grupo);

  // Barras: 32 bandas a la derecha y su espejo a la izquierda; los graves abajo, los agudos arriba.
  const RADIO = 3.6;
  const geometriaBarra = new THREE.BoxGeometry(1, 1, 1);
  geometriaBarra.translate(0, 0.5, 0);
  const materialBarra = new THREE.MeshBasicMaterial({ toneMapped: false });
  const barras = new THREE.InstancedMesh(geometriaBarra, materialBarra, BANDAS * 2);
  barras.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const angulos = Array.from({ length: BANDAS * 2 }, (_, i) => {
    const b = i % BANDAS;
    const lado = i < BANDAS ? 1 : -1;
    return { b, angulo: -Math.PI / 2 + lado * ((b + 0.5) / BANDAS) * Math.PI };
  });
  for (let i = 0; i < angulos.length; i++) barras.setColorAt(i, BLANCO);
  const anilloBarras = new THREE.Group();
  anilloBarras.add(barras);

  const materialAro = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const aro = new THREE.Mesh(new THREE.TorusGeometry(RADIO - 0.12, 0.035, 8, 160), materialAro);
  anilloBarras.add(aro);
  grupo.add(anilloBarras);

  const posicionLuz = new THREE.Vector3();

  return {
    obj: grupo,
    luces: () =>
      ovni.luces.children.map((luz) => {
        luz.getWorldPosition(posicionLuz);
        return posicionLuz.clone();
      }),
    actualizar: (m) => {
      const escala = escalaPorAspecto(m.aspecto);
      grupo.scale.setScalar(escala * (1 + m.golpe * 0.06));
      grupo.position.y = 1.6 + Math.sin(m.reloj * 0.8) * 0.2;

      ovni.grupo.rotation.y += m.dt * (0.3 + m.energia * 1.6);
      ovni.grupo.rotation.z = Math.sin(m.reloj * 0.7) * 0.06;
      ovni.matRayo.opacity = 0.08 + m.brillo * 0.22;
      ovni.matRayo.color.copy(m.colorA);
      ovni.luces.children.forEach((luz, i) => luz.scale.setScalar(1 + Math.sin(m.reloj * 2.5 + i) * 0.25 + m.brillo * 0.3));

      // La cúpula es compartida por todos los ovnis: brillan juntos con los agudos.
      kit.cupula.emissive.copy(m.colorA);
      kit.cupula.emissiveIntensity = 0.7 + m.brillo * 0.6;
      kit.aroRosa.emissive.copy(m.colorB);

      for (let i = 0; i < angulos.length; i++) {
        const { b, angulo } = angulos[i];
        const v = m.espectro[b];
        tmpMatriz.position.set(Math.cos(angulo) * RADIO, Math.sin(angulo) * RADIO, 0);
        tmpMatriz.rotation.set(0, 0, angulo - Math.PI / 2);
        tmpMatriz.scale.set(0.11, 0.06 + v * 2.6, 0.11);
        tmpMatriz.updateMatrix();
        barras.setMatrixAt(i, tmpMatriz.matrix);
        // El color de cada barra es fijo (degradé por banda): solo cambia la altura, no el brillo.
        tmpColor.copy(m.colorA).lerp(m.colorB, b / (BANDAS - 1)).lerp(BLANCO, 0.15);
        barras.setColorAt(i, tmpColor);
      }
      barras.instanceMatrix.needsUpdate = true;
      if (barras.instanceColor) barras.instanceColor.needsUpdate = true;
      anilloBarras.rotation.z = Math.sin(m.reloj * 0.15) * 0.15;

      materialAro.color.copy(m.colorA);
      materialAro.opacity = 0.25 + m.brillo * 0.3;
    },
    liberar: () => {
      geometriaBarra.dispose();
      materialBarra.dispose();
      aro.geometry.dispose();
      materialAro.dispose();
      ovni.matRayo.dispose();
      barras.dispose();
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
    const material = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
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

// ————————————————————————————— Terreno —————————————————————————————

const COLUMNAS = 41;
const FILAS = 56;
const ANCHO_TERRENO = 46;
const LARGO_TERRENO = 84;

export function crearTerreno(): Pieza {
  const geometria = new THREE.PlaneGeometry(ANCHO_TERRENO, LARGO_TERRENO, COLUMNAS - 1, FILAS - 1);
  geometria.rotateX(-Math.PI / 2);
  const posiciones = geometria.attributes.position as THREE.BufferAttribute;
  posiciones.setUsage(THREE.DynamicDrawUsage);
  // Fila 0 = la del fondo; la última = la más cercana a la cámara.
  const alturas = new Float32Array(COLUMNAS * FILAS);

  const lineas = new THREE.MeshBasicMaterial({ wireframe: true, transparent: true, opacity: 0.6, toneMapped: false });
  // Un relleno oscuro abajo de las líneas tapa las estrellas: queda como un piso sólido.
  const relleno = new THREE.MeshBasicMaterial({ color: 0x030504, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const grupo = new THREE.Group();
  grupo.add(new THREE.Mesh(geometria, relleno), new THREE.Mesh(geometria, lineas));
  const zBase = TUNEL_HASTA - 1 - LARGO_TERRENO / 2;
  grupo.position.set(0, -4.4, zBase);

  const separacion = LARGO_TERRENO / (FILAS - 1);
  let avance = 0;
  const mitad = (COLUMNAS - 1) / 2;

  return {
    obj: grupo,
    actualizar: (m) => {
      avance += (3 + m.energia * 22) * m.dt;
      while (avance >= separacion) {
        avance -= separacion;
        alturas.copyWithin(COLUMNAS, 0, COLUMNAS * (FILAS - 1));
        for (let c = 0; c < COLUMNAS; c++) {
          const xn = Math.abs(c - mitad) / mitad;
          const banda = Math.min(BANDAS - 1, Math.floor(xn * BANDAS));
          // Camino plano al medio, montañas que crecen hacia los costados.
          alturas[c] = m.espectro[banda] * (0.15 + xn * xn * 5) + (Math.random() - 0.5) * 0.08 * xn;
        }
      }
      for (let i = 0; i < alturas.length; i++) posiciones.setY(i, alturas[i]);
      posiciones.needsUpdate = true;
      grupo.position.z = zBase + avance;
      grupo.position.y = -4.4 - m.golpe * 0.15;
      lineas.color.copy(m.colorA).lerp(m.colorB, 0.25 + m.medios * 0.4);
      lineas.opacity = 0.28 + m.brillo * 0.18;
    },
    liberar: () => {
      geometria.dispose();
      lineas.dispose();
      relleno.dispose();
    },
  };
}

// ————————————————————————————— Rave —————————————————————————————

const BAILARINES = 22;

export function crearRave(kit: Kit): Pieza {
  // Instancias (una sola llamada de dibujo para todas las cabezas): la rave tiene que ser liviana.
  const piel = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x0a1a06, roughness: 0.5 });
  const cabezas = new THREE.InstancedMesh(kit.geo.cabeza, piel, BAILARINES);
  const ojos = new THREE.InstancedMesh(kit.geo.ojo, kit.ojo, BAILARINES * 2);
  cabezas.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ojos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const grupo = new THREE.Group();
  grupo.add(cabezas, ojos);

  const bailarines = Array.from({ length: BAILARINES }, (_, i) => ({
    x: (i / (BAILARINES - 1)) * 2 - 1 + azar(-0.03, 0.03),
    z: azar(0.5, 3.2),
    fase: Math.random() * Math.PI * 2,
    escala: azar(0.32, 0.46),
    saltoDesde: -10,
    saltoAlto: 0,
    rosa: Math.random() < 0.3,
  }));
  bailarines.sort((a, b) => a.z - b.z);

  const ojo = new THREE.Object3D();
  const cabeza = new THREE.Object3D();

  return {
    obj: grupo,
    actualizar: (m) => {
      bailarines.forEach((b, i) => {
        if (m.golpeAhora && Math.random() < 0.35) {
          b.saltoDesde = m.reloj;
          b.saltoAlto = azar(0.3, 0.9) * (0.6 + m.graves);
        }
        const mv = mitadVisible(b.z, m.aspecto);
        const k = (m.reloj - b.saltoDesde) / 0.45;
        const salto = k >= 0 && k < 1 ? Math.sin(k * Math.PI) * b.saltoAlto : 0;
        const rebote = Math.abs(Math.sin(m.reloj * 4.6 + b.fase)) * 0.08 * (0.3 + m.graves);

        // Arriba de la barra del player, que tapa el borde de abajo en el celu.
        cabeza.position.set(b.x * mv.x * 0.92, -mv.y * 0.6 + rebote + salto, b.z);
        // Cabeceo con los graves, para adelante.
        cabeza.rotation.set(-0.1 + m.graves * 0.35 * Math.abs(Math.sin(m.reloj * 4.6 + b.fase)), Math.sin(m.reloj + b.fase) * 0.15, Math.sin(m.reloj * 2 + b.fase) * 0.12);
        cabeza.scale.set(b.escala * 0.85, b.escala * 1.05, b.escala * 0.85);
        cabeza.updateMatrix();
        cabezas.setMatrixAt(i, cabeza.matrix);
        tmpColor.copy(b.rosa ? m.colorB : m.colorA).multiplyScalar(0.4 + m.brillo * 0.15);
        cabezas.setColorAt(i, tmpColor);

        for (const lado of [-1, 1]) {
          // Ojos más grandes que los del alien suelto: de lejos tienen que leerse como cara.
          ojo.position.set(lado * 0.36, 0.05, 0.72);
          ojo.rotation.set(0, 0, lado * -0.5);
          ojo.scale.set(0.46, 0.26, 0.2);
          ojo.updateMatrix();
          ojo.matrix.premultiply(cabeza.matrix);
          ojos.setMatrixAt(i * 2 + (lado === -1 ? 0 : 1), ojo.matrix);
        }
      });
      cabezas.instanceMatrix.needsUpdate = true;
      if (cabezas.instanceColor) cabezas.instanceColor.needsUpdate = true;
      ojos.instanceMatrix.needsUpdate = true;
    },
    liberar: () => {
      piel.dispose();
      cabezas.dispose();
      ojos.dispose();
    },
  };
}

// ————————————————————————————— Láseres —————————————————————————————

const LASERES = 12;
// Medio segundo con entrada y salida suaves: un láser nunca prende ni apaga de golpe.
const VIDA_LASER = 0.5;

export function crearLaseres(): Pieza & { disparar: (desde: THREE.Vector3, hacia: THREE.Vector3, color: THREE.Color, reloj: number) => void } {
  const grupo = new THREE.Group();
  const geometria = new THREE.CylinderGeometry(0.04, 0.04, 1, 6);
  geometria.translate(0, 0.5, 0);
  const arriba = new THREE.Vector3(0, 1, 0);
  const direccion = new THREE.Vector3();
  const pool = Array.from({ length: LASERES }, () => {
    const material = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const rayo = new THREE.Mesh(geometria, material);
    rayo.visible = false;
    grupo.add(rayo);
    return { rayo, material, desde: -10 };
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
      l.material.color.copy(color);
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
        l.material.opacity = 0.65 * (p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8);
      }
    },
    liberar: () => {
      geometria.dispose();
      pool.forEach((l) => l.material.dispose());
    },
  };
}

