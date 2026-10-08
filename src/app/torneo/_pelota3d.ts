import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";

// La pelota alien en three.js, compartida por la escena del OVNI (landing) y la tele: misma
// geometría, mismos materiales y mismo verde que la ruleta del sorteo (#8cff59).

export const VERDE_3D = 0x8cff59;
/** El rojo de alarma de la base: el mismo #ff3b4e del "VS" de los cruces. */
export const ROJO_3D = 0xff3b4e;
const FI = (1 + Math.sqrt(5)) / 2;

/** Los 12 vértices del icosaedro: apuntan al centro de cada pentágono de la pelota. */
function vertices12(): THREE.Vector3[] {
  const v: THREE.Vector3[] = [];
  for (const a of [-1, 1]) {
    for (const b of [-FI, FI]) {
      v.push(new THREE.Vector3(0, a, b), new THREE.Vector3(a, b, 0), new THREE.Vector3(b, 0, a));
    }
  }
  return v;
}

export type PelotaAlien3D = {
  grupo: THREE.Group;
  /** Pentágonos que brillan: su emissiveIntensity es el "pulso" de la pelota. */
  matPentagono: THREE.MeshStandardMaterial;
  matCostura: THREE.LineBasicMaterial;
};

/**
 * Pelota de fútbol (icosaedro truncado): 12 pentágonos verdes que brillan, 20 hexágonos oscuros
 * metalizados y las costuras en verde. Todo queda colgado del grupo: `liberarEscena` lo libera.
 */
export function crearPelota(): PelotaAlien3D {
  const base = vertices12();
  const puntos: THREE.Vector3[] = [];
  for (let i = 0; i < base.length; i++) {
    for (let j = i + 1; j < base.length; j++) {
      if (Math.abs(base[i].distanceTo(base[j]) - 2) > 1e-3) continue; // solo aristas
      puntos.push(base[i].clone().lerp(base[j], 1 / 3), base[i].clone().lerp(base[j], 2 / 3));
    }
  }
  const radio = puntos[0].length();
  for (const p of puntos) p.multiplyScalar(1 / radio);

  const casco = new ConvexGeometry(puntos);
  const pos = casco.getAttribute("position");
  const direcciones = base.map((v) => v.clone().normalize());
  const pentagonos: number[] = [];
  const hexagonos: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    const normal = ab.subVectors(b, a).cross(ac.subVectors(c, a)).normalize();
    const esPentagono = direcciones.some((d) => Math.abs(d.dot(normal)) > 0.99);
    (esPentagono ? pentagonos : hexagonos).push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  const armar = (datos: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(datos, 3));
    g.computeVertexNormals();
    return g;
  };
  const costuras = new THREE.EdgesGeometry(casco, 1);
  // El casco solo sirve para sacar caras y aristas: no se dibuja, se libera ya.
  casco.dispose();

  const matPentagono = new THREE.MeshStandardMaterial({
    color: 0x0c1f08,
    emissive: VERDE_3D,
    emissiveIntensity: 1,
    roughness: 0.38,
    flatShading: true,
  });
  const matHexagono = new THREE.MeshStandardMaterial({
    color: 0x1e2f24,
    roughness: 0.35,
    metalness: 0.58,
    flatShading: true,
  });
  const matCostura = new THREE.LineBasicMaterial({ color: VERDE_3D, transparent: true, opacity: 0.55 });

  const grupo = new THREE.Group();
  grupo.add(
    new THREE.Mesh(armar(pentagonos), matPentagono),
    new THREE.Mesh(armar(hexagonos), matHexagono),
    new THREE.LineSegments(costuras, matCostura),
  );
  return { grupo, matPentagono, matCostura };
}

/** Anillo orbital fino, del mismo verde. */
export function crearAnillo(radio: number, grosor: number): { anillo: THREE.Mesh; material: THREE.MeshBasicMaterial } {
  const material = new THREE.MeshBasicMaterial({ color: VERDE_3D, transparent: true, opacity: 0.7 });
  return { anillo: new THREE.Mesh(new THREE.TorusGeometry(radio, grosor, 8, 160), material), material };
}

function liberarMaterial(material: THREE.Material) {
  // Las texturas no se liberan con el material: hay que soltarlas una por una.
  for (const valor of Object.values(material)) {
    if (valor instanceof THREE.Texture) valor.dispose();
  }
  material.dispose();
}

/**
 * Suelta todo lo que la escena tiene en la GPU (geometrías, materiales y sus texturas), el
 * renderer y su contexto WebGL, y saca el lienzo del DOM. Llamarlo en el cleanup del efecto.
 */
export function liberarEscena(escena: THREE.Scene, renderer: THREE.WebGLRenderer) {
  escena.traverse((obj) => {
    // La geometría de los Sprite es una sola compartida por three: no se toca.
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) obj.geometry.dispose();
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Sprite) {
      const materiales = Array.isArray(obj.material) ? obj.material : [obj.material];
      materiales.forEach(liberarMaterial);
    }
  });
  escena.clear();
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
}
