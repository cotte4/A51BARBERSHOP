"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { crearLimitador60, usarMovimientoReducido } from "@/app/torneo/_movimiento";
import { crearPelota, liberarEscena, ROJO_3D, VERDE_3D } from "@/app/torneo/_pelota3d";
import { analizarTema, CUADROS_POR_SEG, type Analisis } from "./_analisis";

// La visual del Estudio: aparece al dar play y se va al pausar. Ovnis, aliens, la pelota alien,
// planetas y ondas salen al azar en los golpes del bombo del tema que suena (ver _analisis.ts).

const ROSA_3D = 0xff4fd8;
const MAX_ACTORES = 12;
const FOV = 60;
const CAMARA_Z = 10;
// Sin análisis (todavía bajando, o falló) se inventa un pulso de trap: 140 BPM.
const PERIODO_FALSO = 60 / 140;

type Actor = {
  obj: THREE.Object3D;
  nace: number;
  vida: number;
  /** p va de 0 a 1 a lo largo de la vida del actor. */
  mover: (p: number, t: number, graves: number) => void;
  /** Materiales propios del actor (los compartidos no van acá). */
  propios: THREE.Material[];
  /** Geometría propia, si la tiene. */
  geometria?: THREE.BufferGeometry;
};

type Kit = ReturnType<typeof crearKit>;

const azar = (min: number, max: number) => min + Math.random() * (max - min);
const elegir = <T,>(opciones: readonly T[]): T => opciones[Math.floor(Math.random() * opciones.length)];
const suave = (x: number) => x * x * (3 - 2 * x);

/** Geometrías y materiales que comparten todos los actores: se crean una vez. */
function crearKit() {
  // Sin mapa de entorno, un metal puro se ve negro: metal a medias y un brillo propio leve.
  const metal = new THREE.MeshStandardMaterial({ color: 0xc9d1d9, metalness: 0.55, roughness: 0.3, emissive: 0x1b2620, emissiveIntensity: 0.6 });
  const cupula = new THREE.MeshStandardMaterial({
    color: 0x0c1f08,
    emissive: VERDE_3D,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.85,
  });
  const aroRosa = new THREE.MeshStandardMaterial({ color: 0x2a0a22, emissive: ROSA_3D, emissiveIntensity: 1.2 });
  const luz = new THREE.MeshBasicMaterial({ color: 0xfff6a8 });
  const pielVerde = new THREE.MeshStandardMaterial({ color: 0x2f6b1d, emissive: VERDE_3D, emissiveIntensity: 0.35, roughness: 0.5 });
  const pielRosa = new THREE.MeshStandardMaterial({ color: 0x6b1d5a, emissive: ROSA_3D, emissiveIntensity: 0.35, roughness: 0.5 });
  const ojo = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.08, metalness: 0.4 });
  const planetaMats = [
    new THREE.MeshStandardMaterial({ color: 0x3b1a5e, emissive: 0x6a2bd1, emissiveIntensity: 0.35, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x0e3b3a, emissive: 0x1fd1c0, emissiveIntensity: 0.3, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x4a1020, emissive: ROJO_3D, emissiveIntensity: 0.3, roughness: 0.8 }),
  ];

  const geo = {
    disco: new THREE.SphereGeometry(1, 32, 16),
    cupula: new THREE.SphereGeometry(0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    aro: new THREE.TorusGeometry(1.45, 0.06, 8, 48),
    luz: new THREE.SphereGeometry(0.09, 8, 6),
    rayo: new THREE.ConeGeometry(1.15, 3.4, 24, 1, true),
    cabeza: new THREE.SphereGeometry(1, 32, 24),
    ojo: new THREE.SphereGeometry(1, 24, 16),
    antena: new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6),
    bolita: new THREE.SphereGeometry(0.1, 10, 8),
    planeta: new THREE.SphereGeometry(1, 32, 24),
    anillo: new THREE.RingGeometry(1.4, 2.1, 64),
    onda: new THREE.TorusGeometry(1, 0.035, 8, 96),
  };
  // La punta del cono queda pegada a la panza del ovni.
  geo.rayo.translate(0, -1.7, 0);

  const pelota = crearPelota();
  const degradeRayo = crearDegradeRayo();
  const puntoRedondo = crearPuntoRedondo();

  return { metal, cupula, aroRosa, luz, pielVerde, pielRosa, ojo, planetaMats, geo, pelota, degradeRayo, puntoRedondo };
}

/** Textura vertical para el rayo: fuerte pegado al ovni, se desvanece hacia abajo. */
function crearDegradeRayo(): THREE.CanvasTexture {
  const lienzo = document.createElement("canvas");
  lienzo.width = 4;
  lienzo.height = 128;
  const ctx = lienzo.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    // alphaMap lee el canal verde, no el alfa: el degradé va de blanco a negro.
    grad.addColorStop(0, "rgb(245,245,245)");
    grad.addColorStop(0.5, "rgb(90,90,90)");
    grad.addColorStop(1, "rgb(0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, 128);
  }
  // En el cono, v = 1 es la punta (arriba): se da vuelta para que lo fuerte quede en el ovni.
  const textura = new THREE.CanvasTexture(lienzo);
  textura.flipY = false;
  return textura;
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

function liberarKit(kit: Kit) {
  kit.degradeRayo.dispose();
  kit.puntoRedondo.dispose();
  Object.values(kit.geo).forEach((g) => g.dispose());
  [kit.metal, kit.cupula, kit.aroRosa, kit.luz, kit.pielVerde, kit.pielRosa, kit.ojo, ...kit.planetaMats].forEach((m) => m.dispose());
  kit.pelota.grupo.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
    }
  });
}

function crearOvni(kit: Kit) {
  const grupo = new THREE.Group();
  const disco = new THREE.Mesh(kit.geo.disco, kit.metal);
  disco.scale.set(1.6, 0.32, 1.6);
  const cupula = new THREE.Mesh(kit.geo.cupula, kit.cupula);
  cupula.position.y = 0.12;
  const aro = new THREE.Mesh(kit.geo.aro, kit.aroRosa);
  aro.rotation.x = Math.PI / 2;
  const luces = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const l = new THREE.Mesh(kit.geo.luz, kit.luz);
    const a = (i / 8) * Math.PI * 2;
    l.position.set(Math.cos(a) * 1.25, -0.08, Math.sin(a) * 1.25);
    luces.add(l);
  }
  const matRayo = new THREE.MeshBasicMaterial({
    color: VERDE_3D,
    alphaMap: kit.degradeRayo,
    transparent: true,
    opacity: 0.2,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const rayo = new THREE.Mesh(kit.geo.rayo, matRayo);
  grupo.add(disco, cupula, aro, luces, rayo);
  return { grupo, luces, rayo, matRayo };
}

function crearAlien(kit: Kit) {
  const grupo = new THREE.Group();
  const piel = Math.random() < 0.7 ? kit.pielVerde : kit.pielRosa;
  const cabeza = new THREE.Mesh(kit.geo.cabeza, piel);
  cabeza.scale.set(0.85, 1.05, 0.85);
  grupo.add(cabeza);
  for (const lado of [-1, 1]) {
    const ojo = new THREE.Mesh(kit.geo.ojo, kit.ojo);
    ojo.scale.set(0.36, 0.2, 0.14);
    ojo.rotation.z = lado * -0.5;
    ojo.position.set(lado * 0.34, 0.02, 0.74);
    const antena = new THREE.Mesh(kit.geo.antena, piel);
    antena.position.set(lado * 0.3, 1.2, 0);
    antena.rotation.z = lado * -0.35;
    const bolita = new THREE.Mesh(kit.geo.bolita, kit.aroRosa);
    bolita.position.set(lado * 0.42, 1.48, 0);
    grupo.add(ojo, antena, bolita);
  }
  return grupo;
}

/** Medio ancho y medio alto visibles a una profundidad z. */
function mitadVisible(z: number, aspecto: number) {
  const alto = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * (CAMARA_Z - z);
  return { x: alto * aspecto, y: alto };
}

function nacerActor(tipo: string, kit: Kit, t: number, aspecto: number): Actor {
  switch (tipo) {
    case "ovni-cruza": {
      const { grupo, luces, matRayo } = crearOvni(kit);
      const z = azar(-5, 1);
      const m = mitadVisible(z, aspecto);
      const desde = Math.random() < 0.5 ? -1 : 1;
      const y0 = azar(-m.y * 0.3, m.y * 0.7);
      grupo.position.z = z;
      grupo.scale.setScalar(azar(0.55, 0.95));
      return {
        obj: grupo,
        nace: t,
        vida: azar(4.5, 7),
        propios: [matRayo],
        mover: (p, tt, g) => {
          grupo.position.x = desde * (m.x + 3) * (1 - 2 * p);
          grupo.position.y = y0 + Math.sin(p * Math.PI * 3) * 0.6;
          grupo.rotation.z = -desde * 0.25 + Math.sin(tt * 3) * 0.08;
          luces.rotation.y = tt * 4;
          luces.children.forEach((l, i) => l.scale.setScalar(Math.sin(tt * 10 + i) > 0 ? 1.4 : 0.6));
          matRayo.opacity = 0.05 + g * 0.35;
        },
      };
    }
    case "ovni-baja": {
      const { grupo, luces, matRayo } = crearOvni(kit);
      const z = azar(-3, 0);
      const m = mitadVisible(z, aspecto);
      const x = azar(-m.x * 0.6, m.x * 0.6);
      grupo.position.set(x, m.y + 3, z);
      grupo.scale.setScalar(azar(0.6, 0.8));
      return {
        obj: grupo,
        nace: t,
        vida: azar(5, 7),
        propios: [matRayo],
        mover: (p, tt, g) => {
          // Baja, se queda abduciendo y se va disparado para arriba.
          const arriba = m.y + 3;
          const quieto = m.y * 0.35;
          grupo.position.y =
            p < 0.2 ? arriba + (quieto - arriba) * suave(p / 0.2) : p < 0.8 ? quieto + Math.sin(tt * 2) * 0.15 : quieto + (arriba + 6 - quieto) * suave((p - 0.8) / 0.2);
          grupo.position.x = x + Math.sin(tt * 1.3) * 0.3;
          luces.rotation.y = tt * 5;
          luces.children.forEach((l, i) => l.scale.setScalar(Math.sin(tt * 12 + i * 0.8) > 0 ? 1.5 : 0.5));
          const abduciendo = p > 0.2 && p < 0.8 ? 1 : 0;
          matRayo.opacity = abduciendo * (0.12 + g * 0.5);
        },
      };
    }
    case "alien-asoma": {
      const grupo = crearAlien(kit);
      const z = azar(-2, 0.5);
      const m = mitadVisible(z, aspecto);
      const x = azar(-m.x * 0.8, m.x * 0.8);
      const escala = azar(0.7, 1.1);
      grupo.position.set(x, -m.y - 2, z);
      return {
        obj: grupo,
        nace: t,
        vida: azar(3, 4.5),
        propios: [],
        mover: (p, tt, g) => {
          // Asoma desde abajo, cabecea al ritmo y se vuelve a esconder.
          const sube = p < 0.25 ? suave(p / 0.25) : p > 0.75 ? 1 - suave((p - 0.75) / 0.25) : 1;
          grupo.position.y = -m.y - 2 + sube * 2.9;
          grupo.rotation.z = Math.sin(tt * 4) * 0.2;
          grupo.rotation.y = Math.sin(tt * 1.5) * 0.4;
          grupo.scale.setScalar(escala * (1 + g * 0.18));
        },
      };
    }
    case "alien-flota": {
      const grupo = crearAlien(kit);
      const z = azar(-6, -1);
      const m = mitadVisible(z, aspecto);
      const desde = Math.random() < 0.5 ? -1 : 1;
      const y0 = azar(-m.y * 0.6, m.y * 0.6);
      const giro = azar(0.6, 1.4) * (Math.random() < 0.5 ? -1 : 1);
      return {
        obj: grupo,
        nace: t,
        vida: azar(6, 9),
        propios: [],
        mover: (p, tt, g) => {
          // Gravedad cero: cruza dando vueltas.
          grupo.position.set(desde * (m.x + 2) * (1 - 2 * p), y0 + Math.sin(tt) * 0.8, z);
          grupo.rotation.set(tt * giro * 0.7, tt * giro, tt * giro * 0.4);
          grupo.scale.setScalar(0.6 + g * 0.12);
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
      const matAnillo = new THREE.MeshBasicMaterial({ color: 0xd9c8ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
      const anillo = new THREE.Mesh(kit.geo.anillo, matAnillo);
      anillo.rotation.x = Math.PI / 2.4;
      grupo.add(esfera, anillo);
      const z = -20;
      const m = mitadVisible(z, aspecto);
      const desde = Math.random() < 0.5 ? -1 : 1;
      // Bien arriba o bien abajo: que no tape el centro.
      const y = (Math.random() < 0.5 ? -1 : 1) * azar(m.y * 0.45, m.y * 0.8);
      grupo.scale.setScalar(azar(1.4, 2.2));
      return {
        obj: grupo,
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
        nace: t,
        vida: 1.1,
        propios: [mat],
        geometria,
        mover: (p) => {
          const avance = 1 - (1 - p) * (1 - p);
          direcciones.forEach((d, i) => posiciones.set([d.x * avance, d.y * avance, d.z * avance], i * 3));
          geometria.attributes.position.needsUpdate = true;
          mat.opacity = 1 - p;
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
        nace: t,
        vida: 1.3,
        propios: [mat],
        mover: (p) => {
          onda.scale.setScalar(0.6 + p * 9);
          mat.opacity = 0.8 * (1 - p);
        },
      };
    }
  }
}

const TIPOS_GOLPE = ["ovni-cruza", "ovni-baja", "alien-asoma", "alien-asoma", "alien-flota", "pelota"] as const;

function crearEstrellas(cantidad: number) {
  const posiciones = new Float32Array(cantidad * 3);
  const colores = new Float32Array(cantidad * 3);
  const verde = new THREE.Color(VERDE_3D);
  const blanco = new THREE.Color(0xffffff);
  for (let i = 0; i < cantidad; i++) {
    posiciones[i * 3] = azar(-40, 40);
    posiciones[i * 3 + 1] = azar(-25, 25);
    posiciones[i * 3 + 2] = azar(-60, CAMARA_Z);
    const c = Math.random() < 0.2 ? verde : blanco;
    colores.set([c.r, c.g, c.b], i * 3);
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.BufferAttribute(posiciones, 3));
  geometria.setAttribute("color", new THREE.BufferAttribute(colores, 3));
  const material = new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
  return { puntos: new THREE.Points(geometria, material), posiciones, geometria };
}

function crearHalo(): THREE.Sprite {
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

function primerGolpeDesde(golpes: number[], t: number): number {
  let bajo = 0;
  let alto = golpes.length;
  while (bajo < alto) {
    const medio = (bajo + alto) >> 1;
    if (golpes[medio] <= t) bajo = medio + 1;
    else alto = medio;
  }
  return bajo;
}

type Props = {
  audioRef: RefObject<HTMLAudioElement | null>;
  temaId: string | null;
  sonando: boolean;
};

export default function Nave({ audioRef, temaId, sonando }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  // La nave es lo que se viene a ver y solo corre con play, así que se muestra aunque el sistema pida
  // menos movimiento (Windows lo pide con "Efectos de animación" apagado). Lo único que se saca es
  // la sacudida de cámara, que es lo que más marea.
  const menosMovimiento = usarMovimientoReducido();
  const analisisRef = useRef<Analisis | null>(null);
  const sonandoRef = useRef(sonando);
  const despertarRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    sonandoRef.current = sonando;
    if (sonando) despertarRef.current?.();
  }, [sonando]);

  useEffect(() => {
    analisisRef.current = null;
    if (!temaId) return;
    let vigente = true;
    void analizarTema(temaId).then((analisis) => {
      if (vigente) analisisRef.current = analisis;
    });
    return () => {
      vigente = false;
    };
  }, [temaId]);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.opacity = "0";
    el.appendChild(renderer.domElement);

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 100);
    camara.position.z = CAMARA_Z;

    escena.add(new THREE.AmbientLight(0x8fa88a, 0.9));
    const luzVerde = new THREE.PointLight(VERDE_3D, 60, 30);
    luzVerde.position.set(-6, 5, 6);
    const luzRosa = new THREE.PointLight(ROSA_3D, 30, 30);
    luzRosa.position.set(6, -4, 5);
    const luzBlanca = new THREE.DirectionalLight(0xffffff, 1.2);
    luzBlanca.position.set(2, 6, 8);
    escena.add(luzVerde, luzRosa, luzBlanca);

    const estrellas = crearEstrellas(1400);
    escena.add(estrellas.puntos);
    const halo = crearHalo();
    escena.add(halo);

    const kit = crearKit();
    let actores: Actor[] = [];

    const alCambiarTamano = () => {
      camara.aspect = window.innerWidth / window.innerHeight;
      camara.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", alCambiarTamano);

    const sumar = (tipo: string, t: number) => {
      if (actores.length >= MAX_ACTORES) return;
      const actor = nacerActor(tipo, kit, t, camara.aspect);
      escena.add(actor.obj);
      actores.push(actor);
    };

    let cuadro = 0;
    let corriendo = false;
    let opacidad = 0;
    let golpe = 0;
    let energia = 0;
    let graves = 0;
    let indiceGolpe = 0;
    let tiempoAnterior = 0;
    let ultimaAparicion = 0;
    let ultimoPlaneta = -Infinity;
    let golpeFalso = -1;
    let relojAnterior = performance.now();
    let reloj = 0;
    const toca = crearLimitador60();

    const alGolpear = (fuerza: number) => {
      golpe = 1;
      if (fuerza > 0.8) {
        sumar("onda", reloj);
        if (Math.random() < 0.5) sumar("chispas", reloj);
      }
      // No todos los bombos traen algo: así se siente al azar y no satura.
      if (Math.random() < 0.4 || reloj - ultimaAparicion > 2.5) {
        sumar(elegir(TIPOS_GOLPE), reloj);
        ultimaAparicion = reloj;
      }
    };

    const animar = (ahora: number) => {
      cuadro = requestAnimationFrame(animar);
      if (document.hidden || !toca(ahora)) return;
      const dt = Math.min(0.1, (ahora - relojAnterior) / 1000);
      relojAnterior = ahora;
      reloj += dt;

      const audio = audioRef.current;
      const t = audio?.currentTime ?? 0;
      const analisis = analisisRef.current;
      const activo = sonandoRef.current;

      // Lo que suena ahora, leído contra el análisis del tema.
      let e: number;
      let g: number;
      if (analisis) {
        const i = Math.min(analisis.energia.length - 1, Math.floor(t * CUADROS_POR_SEG));
        e = analisis.energia[i] ?? 0;
        g = analisis.graves[i] ?? 0;
        if (Math.abs(t - tiempoAnterior) > 0.6) indiceGolpe = primerGolpeDesde(analisis.golpes, t);
        while (activo && indiceGolpe < analisis.golpes.length && analisis.golpes[indiceGolpe] <= t) {
          const fuerza = analisis.graves[Math.floor(analisis.golpes[indiceGolpe] * CUADROS_POR_SEG)] ?? 0;
          alGolpear(fuerza);
          indiceGolpe++;
        }
      } else {
        const fase = (t % PERIODO_FALSO) / PERIODO_FALSO;
        g = Math.exp(-fase * 6);
        e = 0.45 + g * 0.3;
        const n = Math.floor(t / PERIODO_FALSO);
        if (activo && n !== golpeFalso) {
          golpeFalso = n;
          alGolpear(n % 4 === 0 ? 0.9 : 0.5);
        }
      }
      tiempoAnterior = t;
      energia += ((activo ? e : 0) - energia) * 0.2;
      graves += ((activo ? g : 0) - graves) * 0.35;
      golpe *= 0.88;

      if (activo && reloj - ultimoPlaneta > 18) {
        sumar("planeta", reloj);
        ultimoPlaneta = reloj;
      }

      // Estrellas: viajan hacia la cámara más rápido cuanto más fuerte suena.
      const velocidad = (2 + energia * 26) * dt;
      const pos = estrellas.posiciones;
      for (let i = 2; i < pos.length; i += 3) {
        pos[i] += velocidad;
        if (pos[i] > CAMARA_Z) pos[i] -= 70;
      }
      estrellas.geometria.attributes.position.needsUpdate = true;
      estrellas.puntos.rotation.z += dt * 0.02;

      halo.scale.setScalar(10 + graves * 9 + golpe * 4);
      halo.material.opacity = 0.35 + graves * 0.6;

      const sacudida = menosMovimiento ? 0 : golpe * 0.12;
      camara.position.x = (Math.random() - 0.5) * sacudida;
      camara.position.y = (Math.random() - 0.5) * sacudida;

      actores = actores.filter((actor) => {
        const p = (reloj - actor.nace) / actor.vida;
        if (p >= 1) {
          escena.remove(actor.obj);
          actor.propios.forEach((m) => m.dispose());
          actor.geometria?.dispose();
          return false;
        }
        actor.mover(p, reloj, graves);
        return true;
      });

      opacidad += ((activo ? 1 : 0) - opacidad) * 0.06;
      renderer.domElement.style.opacity = opacidad.toFixed(3);
      renderer.render(escena, camara);

      // En pausa, cuando ya se apagó, deja de dibujar (no gasta batería).
      if (!activo && opacidad < 0.01) {
        renderer.domElement.style.opacity = "0";
        cancelAnimationFrame(cuadro);
        corriendo = false;
      }
    };

    const despertar = () => {
      if (corriendo) return;
      corriendo = true;
      relojAnterior = performance.now();
      cuadro = requestAnimationFrame(animar);
    };
    despertarRef.current = despertar;
    if (sonandoRef.current) despertar();

    return () => {
      despertarRef.current = null;
      cancelAnimationFrame(cuadro);
      window.removeEventListener("resize", alCambiarTamano);
      for (const actor of actores) {
        actor.propios.forEach((m) => m.dispose());
        actor.geometria?.dispose();
      }
      liberarKit(kit);
      estrellas.geometria.dispose();
      (estrellas.puntos.material as THREE.Material).dispose();
      liberarEscena(escena, renderer);
    };
  }, [audioRef, menosMovimiento]);

  return <div ref={contenedor} aria-hidden="true" className="pointer-events-none fixed inset-0" />;
}
