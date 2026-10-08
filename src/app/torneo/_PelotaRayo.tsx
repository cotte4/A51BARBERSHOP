"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { RefObject } from "react";
import type { Energia } from "./_escena";
import { crearLimitador60 } from "./_movimiento";
import { crearAnillo, crearPelota, liberarEscena, ROJO_3D, VERDE_3D } from "./_pelota3d";

/**
 * La pelota alien de la escena, iluminada por el rayo: la luz verde de arriba y el rebote de la
 * lava de abajo siguen la intensidad del rayo (energia.current.haz), así cuando el rayo parpadea o pega
 * un pico, la pelota lo acusa. Tope de 60 fps; se pausa fuera de pantalla y con la pestaña oculta.
 * Con movimiento reducido dibuja un solo cuadro quieto.
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

    const { grupo, matPentagono, matCostura } = crearPelota();
    escena.add(grupo);

    const { anillo, material: matAnillo } = crearAnillo(1.42, 0.01);
    anillo.rotation.x = Math.PI / 2.25;
    escena.add(anillo);

    // El rayo viene de arriba; la lava rebota desde abajo; el rojo es la alarma de la base.
    const luzRayo = new THREE.SpotLight(VERDE_3D, 0, 14, Math.PI / 7, 0.6, 1.2);
    luzRayo.position.set(0, 6, 1.2);
    luzRayo.target.position.set(0, 0, 0);
    const luzLava = new THREE.PointLight(VERDE_3D, 0, 9, 1.6);
    luzLava.position.set(0, -2.6, 1.4);
    const luzContra = new THREE.DirectionalLight(0xd6ffc2, 0);
    luzContra.position.set(-1.5, 1.2, -3);
    const luzAlarma = new THREE.PointLight(ROJO_3D, 6, 10, 1.6);
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
      const toca = crearLimitador60();
      const bucle = (ahora: number) => {
        cuadro = requestAnimationFrame(bucle);
        if (document.hidden || !enPantalla || !toca(ahora)) return;
        dibujar((ahora - inicio) / 1000);
      };
      cuadro = requestAnimationFrame(bucle);
    }

    return () => {
      cancelAnimationFrame(cuadro);
      observador.disconnect();
      io?.disconnect();
      liberarEscena(escena, renderer);
    };
  }, [energia, quieto]);

  return <div ref={contenedor} className="torneo-escena-pelota-lienzo" />;
}
