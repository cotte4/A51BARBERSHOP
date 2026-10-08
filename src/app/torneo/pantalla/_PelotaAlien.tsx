"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { crearLimitador60, usarMovimientoReducido } from "../_movimiento";
import { crearAnillo, crearPelota, liberarEscena, ROJO_3D, VERDE_3D } from "../_pelota3d";

function crearHalo(): THREE.Sprite {
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 256;
  const ctx = lienzo.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    grad.addColorStop(0, "rgba(140,255,89,0.55)");
    grad.addColorStop(0.45, "rgba(140,255,89,0.14)");
    grad.addColorStop(1, "rgba(140,255,89,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
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
 * y un halo. Flota y gira a 60 fps como máximo; se pausa con la pestaña oculta o fuera de
 * pantalla, y con movimiento reducido queda quieta (un solo cuadro). Si el equipo no soporta
 * WebGL, simplemente no se muestra.
 */
export default function PelotaAlien({ tamano = 520 }: { tamano?: number }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const quieto = usarMovimientoReducido();

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
    renderer.setSize(tamano, tamano);
    el.appendChild(renderer.domElement);

    const escena = new THREE.Scene();
    const camara = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camara.position.set(0, 0.1, 5.4);

    const { grupo, matPentagono } = crearPelota();
    escena.add(grupo);

    const { anillo } = crearAnillo(1.45, 0.012);
    anillo.rotation.x = Math.PI / 2.4;
    escena.add(anillo);

    const halo = crearHalo();
    halo.position.z = -1;
    escena.add(halo);

    escena.add(new THREE.AmbientLight(0x6b8f63, 0.9));
    const luzVerde = new THREE.PointLight(VERDE_3D, 40, 14);
    luzVerde.position.set(-3, 2.5, 3);
    const luzRoja = new THREE.PointLight(ROJO_3D, 7, 12);
    luzRoja.position.set(3.2, -2, 2.5);
    escena.add(luzVerde, luzRoja);

    const dibujar = (t: number) => {
      grupo.rotation.y = t * 0.45;
      grupo.rotation.x = 0.35 + Math.sin(t * 0.6) * 0.08;
      grupo.position.y = Math.sin(t * 1.1) * 0.12;
      anillo.rotation.z = t * 0.5;
      anillo.position.y = grupo.position.y;
      matPentagono.emissiveIntensity = 1.05 + Math.sin(t * 2.2) * 0.35;
      halo.material.opacity = 0.85 + Math.sin(t * 2.2) * 0.15;
      renderer.render(escena, camara);
    };

    let cuadro = 0;
    let io: IntersectionObserver | null = null;
    if (quieto) {
      dibujar(1.2);
    } else {
      let enPantalla = true;
      io = new IntersectionObserver(([e]) => {
        enPantalla = e.isIntersecting;
      });
      io.observe(el);
      const inicio = performance.now();
      const toca = crearLimitador60();
      const animar = (ahora: number) => {
        cuadro = requestAnimationFrame(animar);
        if (document.hidden || !enPantalla || !toca(ahora)) return;
        dibujar((ahora - inicio) / 1000);
      };
      cuadro = requestAnimationFrame(animar);
    }

    return () => {
      cancelAnimationFrame(cuadro);
      io?.disconnect();
      // Incluye la textura del halo, que el material no suelta solo.
      liberarEscena(escena, renderer);
    };
  }, [tamano, quieto]);

  return <div ref={contenedor} aria-hidden="true" style={{ width: tamano, height: tamano }} />;
}
