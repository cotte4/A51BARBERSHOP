"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";

const VERDE = 0x8cff59;
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

/** Pelota de fútbol (icosaedro truncado): 60 puntos, 12 pentágonos y 20 hexágonos. */
function crearPelota() {
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
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    const esPentagono = direcciones.some((d) => Math.abs(d.dot(normal)) > 0.99);
    (esPentagono ? pentagonos : hexagonos).push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  const armar = (datos: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(datos, 3));
    g.computeVertexNormals();
    return g;
  };
  return { casco, pentagonos: armar(pentagonos), hexagonos: armar(hexagonos) };
}

function crearHalo(): THREE.Sprite {
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 256;
  const ctx = lienzo.getContext("2d")!;
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, "rgba(140,255,89,0.55)");
  grad.addColorStop(0.45, "rgba(140,255,89,0.14)");
  grad.addColorStop(1, "rgba(140,255,89,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const material = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(lienzo),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.6, 3.6, 1);
  return sprite;
}

/**
 * Pelota alien en 3D: pentágonos verdes que brillan, hexágonos oscuros, un anillo orbital
 * y un halo. Flota y gira. Si el equipo no soporta WebGL, simplemente no se muestra.
 */
export default function PelotaAlien({ tamano = 520 }: { tamano?: number }) {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(tamano, tamano);
    el.appendChild(renderer.domElement);

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camara.position.set(0, 0.1, 5.4);

    const { casco, pentagonos, hexagonos } = crearPelota();
    const grupo = new THREE.Group();

    const matPentagono = new THREE.MeshStandardMaterial({
      color: 0x0a1a06,
      emissive: VERDE,
      emissiveIntensity: 1.1,
      roughness: 0.4,
      flatShading: true,
    });
    const matHexagono = new THREE.MeshStandardMaterial({
      color: 0x1a2a1f,
      roughness: 0.38,
      metalness: 0.55,
      flatShading: true,
    });
    grupo.add(new THREE.Mesh(pentagonos, matPentagono), new THREE.Mesh(hexagonos, matHexagono));
    const costuras = new THREE.LineSegments(
      new THREE.EdgesGeometry(casco, 1),
      new THREE.LineBasicMaterial({ color: VERDE, transparent: true, opacity: 0.55 }),
    );
    grupo.add(costuras);
    escena.add(grupo);

    const anillo = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.012, 8, 160),
      new THREE.MeshBasicMaterial({ color: VERDE, transparent: true, opacity: 0.75 }),
    );
    anillo.rotation.x = Math.PI / 2.4;
    escena.add(anillo);

    const halo = crearHalo();
    halo.position.z = -1;
    escena.add(halo);

    escena.add(new THREE.AmbientLight(0x6b8f63, 0.9));
    const luzVerde = new THREE.PointLight(VERDE, 40, 14);
    luzVerde.position.set(-3, 2.5, 3);
    const luzRoja = new THREE.PointLight(0xff3b4e, 7, 12);
    luzRoja.position.set(3.2, -2, 2.5);
    escena.add(luzVerde, luzRoja);

    let cuadro = 0;
    let visible = true;
    const inicio = performance.now();
    const alCambiarVisibilidad = () => {
      visible = !document.hidden;
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    const animar = () => {
      cuadro = requestAnimationFrame(animar);
      if (!visible) return;
      const t = (performance.now() - inicio) / 1000;
      grupo.rotation.y = t * 0.45;
      grupo.rotation.x = 0.35 + Math.sin(t * 0.6) * 0.08;
      grupo.position.y = Math.sin(t * 1.1) * 0.12;
      anillo.rotation.z = t * 0.5;
      anillo.position.y = grupo.position.y;
      matPentagono.emissiveIntensity = 1.05 + Math.sin(t * 2.2) * 0.35;
      halo.material.opacity = 0.85 + Math.sin(t * 2.2) * 0.15;
      renderer.render(escena, camara);
    };
    animar();

    return () => {
      cancelAnimationFrame(cuadro);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      escena.traverse((obj) => {
        const malla = obj as THREE.Mesh;
        malla.geometry?.dispose();
        const mat = malla.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      casco.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [tamano]);

  return <div ref={contenedor} aria-hidden="true" style={{ width: tamano, height: tamano }} />;
}
