"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ConvexGeometry } from "three/examples/jsm/geometries/ConvexGeometry.js";
import type { RefObject } from "react";
import type { Energia } from "./_escena";

const VERDE = 0x8cff59;
const FI = (1 + Math.sqrt(5)) / 2;

/** Pelota de fútbol (icosaedro truncado): 12 pentágonos y 20 hexágonos. */
function crearPelota() {
  const base: THREE.Vector3[] = [];
  for (const a of [-1, 1]) {
    for (const b of [-FI, FI]) {
      base.push(new THREE.Vector3(0, a, b), new THREE.Vector3(a, b, 0), new THREE.Vector3(b, 0, a));
    }
  }
  const puntos: THREE.Vector3[] = [];
  for (let i = 0; i < base.length; i++) {
    for (let j = i + 1; j < base.length; j++) {
      if (Math.abs(base[i].distanceTo(base[j]) - 2) > 1e-3) continue;
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

/**
 * La pelota alien de la escena, iluminada por el rayo: la luz verde de arriba y el rebote de la
 * lava de abajo siguen la intensidad del rayo (energia.current.haz), así cuando el rayo parpadea o pega
 * un pico, la pelota lo acusa. Se pausa fuera de pantalla y con la pestaña oculta.
 */
export default function PelotaRayo({
  energia,
  quieto,
}: {
  energia: RefObject<Energia>;
  quieto: boolean;
}) {
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    const lienzo = renderer.domElement;
    lienzo.className = "torneo-escena-pelota-gl";
    el.appendChild(lienzo);

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camara.position.set(0, 0.25, 6.2);
    camara.lookAt(0, 0, 0);

    const { casco, pentagonos, hexagonos } = crearPelota();
    const grupo = new THREE.Group();
    const matPentagono = new THREE.MeshStandardMaterial({
      color: 0x0c1f08,
      emissive: VERDE,
      emissiveIntensity: 0.9,
      roughness: 0.35,
      flatShading: true,
    });
    const matHexagono = new THREE.MeshStandardMaterial({
      color: 0x22332a,
      roughness: 0.32,
      metalness: 0.6,
      flatShading: true,
    });
    grupo.add(new THREE.Mesh(pentagonos, matPentagono), new THREE.Mesh(hexagonos, matHexagono));
    const matCostura = new THREE.LineBasicMaterial({
      color: VERDE,
      transparent: true,
      opacity: 0.5,
    });
    grupo.add(new THREE.LineSegments(new THREE.EdgesGeometry(casco, 1), matCostura));
    escena.add(grupo);

    const matAnillo = new THREE.MeshBasicMaterial({
      color: VERDE,
      transparent: true,
      opacity: 0.6,
    });
    const anillo = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.01, 6, 160), matAnillo);
    anillo.rotation.x = Math.PI / 2.25;
    escena.add(anillo);

    // El rayo viene de arriba; la lava rebota desde abajo; el rojo es la alarma de la base.
    const luzRayo = new THREE.SpotLight(VERDE, 0, 14, Math.PI / 7, 0.6, 1.2);
    luzRayo.position.set(0, 6, 1.2);
    luzRayo.target.position.set(0, 0, 0);
    const luzLava = new THREE.PointLight(VERDE, 0, 9, 1.6);
    luzLava.position.set(0, -2.6, 1.4);
    const luzContra = new THREE.DirectionalLight(0xd6ffc2, 0);
    luzContra.position.set(-1.5, 1.2, -3);
    const luzAlarma = new THREE.PointLight(0xff3b4e, 6, 10, 1.6);
    luzAlarma.position.set(3, -1.2, 2.4);
    escena.add(luzRayo, luzRayo.target, luzLava, luzContra, luzAlarma);
    escena.add(new THREE.AmbientLight(0x5f7f58, 0.55));

    const tamano = () => {
      const { width } = el.getBoundingClientRect();
      if (width > 0) renderer.setSize(width, width, false);
    };

    let pintada = false;
    const dibujar = (t: number) => {
      const haz = energia.current.haz;
      grupo.rotation.y = t * 0.42;
      grupo.rotation.x = 0.32 + Math.sin(t * 0.55) * 0.09;
      anillo.rotation.z = t * 0.45;
      luzRayo.intensity = 30 * haz;
      luzLava.intensity = 9 * haz;
      luzContra.intensity = 1.6 * haz;
      matPentagono.emissiveIntensity = 0.35 + 0.6 * haz + Math.sin(t * 2.1) * 0.12;
      matCostura.opacity = 0.25 + 0.35 * Math.min(haz, 1);
      matAnillo.opacity = 0.2 + 0.45 * Math.min(haz, 1);
      renderer.render(escena, camara);
      if (!pintada) {
        pintada = true;
        lienzo.dataset.listo = "1"; // dispara el fade-in del CSS
      }
    };

    const observador = new ResizeObserver(() => {
      tamano();
      if (quieto) dibujar(2.2);
    });
    observador.observe(el);
    tamano();

    let cuadro = 0;
    let io: IntersectionObserver | null = null;
    if (quieto) {
      dibujar(2.2);
    } else {
      let enPantalla = true;
      io = new IntersectionObserver(([e]) => {
        enPantalla = e.isIntersecting;
      });
      io.observe(el);
      const inicio = performance.now();
      let ultimo = 0;
      const bucle = (ahora: number) => {
        cuadro = requestAnimationFrame(bucle);
        if (document.hidden || !enPantalla) return;
        if (ahora - ultimo < 15.5) return;
        ultimo = ahora;
        dibujar((ahora - inicio) / 1000);
      };
      cuadro = requestAnimationFrame(bucle);
    }

    return () => {
      cancelAnimationFrame(cuadro);
      observador.disconnect();
      io?.disconnect();
      escena.traverse((obj) => {
        const malla = obj as THREE.Mesh;
        malla.geometry?.dispose();
        const mat = malla.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      });
      casco.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      lienzo.remove();
    };
  }, [energia, quieto]);

  return <div ref={contenedor} className="torneo-escena-pelota-lienzo" />;
}
