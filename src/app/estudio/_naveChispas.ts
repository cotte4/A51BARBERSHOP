import * as THREE from "three";
import { azar } from "./_naveKit";

// Chispas del juego: el meteorito que rompe el láser, lo que absorbe el escudo o un dron, los
// golpes al jefe y su explosión. Un solo Points con un pool fijo: una llamada de dibujo para todo.
//
// Fotosensibilidad: nada de flash. Cada chispa entra en ENTRA segundos (no aparece de golpe), nace
// ya repartida en una esfera (no todas en el mismo punto, que el bloom convertiría en un fogonazo)
// y se apaga de a poco.

const MAX_CHISPAS = 360;
/** Lo que tarda una chispa en prenderse del todo. */
const ENTRA = 0.06;
/** Freno del aire: salen rápido y se quedan flotando. */
const FRENO = 2.4;

export type OpcionesChispas = {
  cantidad: number;
  color: THREE.Color;
  /** Velocidad de salida (unidades por segundo); cada chispa sale con algo menos, al azar. */
  velocidad: number;
  /** Cuánto viven (s), más o menos. */
  dura: number;
  /** Tamaño del punto (como `size` de PointsMaterial). */
  tam: number;
  /** Radio de la esfera donde nacen. */
  radio?: number;
  /** Hasta cuánto se mezcla cada chispa con blanco (0..1, al azar): el centro de la explosión es más claro. */
  blanco?: number;
};

export type Chispas = ReturnType<typeof crearChispas>;

export function crearChispas(textura: THREE.Texture) {
  const posiciones = new Float32Array(MAX_CHISPAS * 3);
  const colores = new Float32Array(MAX_CHISPAS * 3);
  const tamanos = new Float32Array(MAX_CHISPAS);
  const velocidades = new Float32Array(MAX_CHISPAS * 3);
  const base = new Float32Array(MAX_CHISPAS * 3);
  const tamBase = new Float32Array(MAX_CHISPAS);
  const edad = new Float32Array(MAX_CHISPAS);
  /** 0 = libre. */
  const vida = new Float32Array(MAX_CHISPAS);

  const geometria = new THREE.BufferGeometry();
  const atributoPos = new THREE.BufferAttribute(posiciones, 3).setUsage(THREE.DynamicDrawUsage);
  const atributoColor = new THREE.BufferAttribute(colores, 3).setUsage(THREE.DynamicDrawUsage);
  const atributoTam = new THREE.BufferAttribute(tamanos, 1).setUsage(THREE.DynamicDrawUsage);
  geometria.setAttribute("position", atributoPos);
  geometria.setAttribute("color", atributoColor);
  geometria.setAttribute("aTamano", atributoTam);

  const material = new THREE.PointsMaterial({
    size: 1,
    map: textura,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    // Sin niebla: las del jefe están lejos y se tienen que ver.
    fog: false,
  });
  // Tamaño por chispa (como las estrellas del kit).
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aTamano;")
      .replace("gl_PointSize = size;", "gl_PointSize = size * aTamano;");
  };
  material.customProgramCacheKey = () => "chispas-juego";
  const puntos = new THREE.Points(geometria, material);
  // Siempre se dibuja (las libres miden 0 y son negras, que sumado no se ve): así el programa se
  // compila al empezar la partida y no en la primera explosión.
  puntos.frustumCulled = false;

  const dir = new THREE.Vector3();
  let siguiente = 0;
  let vivas = 0;
  let sucio = false;

  const explotar = (donde: THREE.Vector3, o: OpcionesChispas) => {
    const radio = o.radio ?? 0.12;
    const blanco = o.blanco ?? 0.4;
    for (let k = 0; k < o.cantidad; k++) {
      const i = siguiente;
      siguiente = (siguiente + 1) % MAX_CHISPAS;
      if (vida[i] <= 0) vivas++;
      // Dirección al azar en la esfera (rechazo: parejo en todas las direcciones).
      do dir.set(azar(-1, 1), azar(-1, 1), azar(-1, 1));
      while (dir.lengthSq() > 1 || dir.lengthSq() < 1e-4);
      dir.normalize();
      const lejos = radio * Math.random();
      posiciones[i * 3] = donde.x + dir.x * lejos;
      posiciones[i * 3 + 1] = donde.y + dir.y * lejos;
      posiciones[i * 3 + 2] = donde.z + dir.z * lejos;
      const v = o.velocidad * azar(0.35, 1);
      velocidades[i * 3] = dir.x * v;
      velocidades[i * 3 + 1] = dir.y * v;
      velocidades[i * 3 + 2] = dir.z * v;
      const mezcla = Math.random() * blanco;
      base[i * 3] = o.color.r + (1 - o.color.r) * mezcla;
      base[i * 3 + 1] = o.color.g + (1 - o.color.g) * mezcla;
      base[i * 3 + 2] = o.color.b + (1 - o.color.b) * mezcla;
      tamBase[i] = o.tam * azar(0.6, 1.25);
      edad[i] = 0;
      vida[i] = o.dura * azar(0.6, 1.1);
    }
    sucio = true;
  };

  const apagar = (i: number) => {
    vida[i] = 0;
    tamanos[i] = 0;
    colores[i * 3] = colores[i * 3 + 1] = colores[i * 3 + 2] = 0;
  };

  return {
    obj: puntos,
    explotar,

    /** `dt` = 0 con el tema en pausa: quedan congeladas. */
    actualizar: (dt: number) => {
      if (vivas === 0 && !sucio) return;
      if (dt > 0) {
        const freno = Math.exp(-FRENO * dt);
        for (let i = 0; i < MAX_CHISPAS; i++) {
          if (vida[i] <= 0) continue;
          edad[i] += dt;
          const k = edad[i] / vida[i];
          if (k >= 1) {
            apagar(i);
            vivas--;
            continue;
          }
          velocidades[i * 3] *= freno;
          velocidades[i * 3 + 1] *= freno;
          velocidades[i * 3 + 2] *= freno;
          posiciones[i * 3] += velocidades[i * 3] * dt;
          posiciones[i * 3 + 1] += velocidades[i * 3 + 1] * dt;
          posiciones[i * 3 + 2] += velocidades[i * 3 + 2] * dt;
          // Entra en ENTRA y se apaga con una curva suave hasta el final.
          const luz = Math.min(1, edad[i] / ENTRA) * (1 - k) * (1 - k * 0.5);
          colores[i * 3] = base[i * 3] * luz;
          colores[i * 3 + 1] = base[i * 3 + 1] * luz;
          colores[i * 3 + 2] = base[i * 3 + 2] * luz;
          tamanos[i] = tamBase[i] * (0.35 + 0.65 * (1 - k));
        }
      }
      sucio = false;
      atributoPos.needsUpdate = true;
      atributoColor.needsUpdate = true;
      atributoTam.needsUpdate = true;
    },

    /** Apaga todas (al empezar o terminar una partida). */
    limpiar: () => {
      for (let i = 0; i < MAX_CHISPAS; i++) apagar(i);
      vivas = 0;
      sucio = true;
    },

    liberar: () => {
      geometria.dispose();
      material.dispose();
    },
  };
}
