"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { crearLimitador60, usarMovimientoReducido } from "@/app/torneo/_movimiento";
import { liberarEscena, VERDE_3D } from "@/app/torneo/_pelota3d";
import { analizarTema, BANDAS, CUADROS_POR_SEG, primerEventoDesde, type Analisis } from "./_analisis";
import {
  azar,
  CAMARA_Z,
  crearEstrellas,
  crearHalo,
  crearKit,
  elegir,
  FOV,
  liberarKit,
  nacerActor,
  ROSA_3D,
  TIPOS_GOLPE,
  type Actor,
} from "./_naveKit";
import { crearEntorno, SHADER_TERMINACION } from "./_naveMateriales";
import { crearLaseres, crearNodriza, crearRave, crearTerreno, crearTunel, type Musica } from "./_naveShow";

// La nave del Estudio: aparece al dar play y se va al pausar. Un show armado con el tema que
// suena (ver _analisis.ts): la nodriza con el espectro alrededor, el túnel, el terreno, la rave
// de aliens y los láseres, más ovnis, aliens, la pelota alien y planetas que salen al azar en
// los bombos. En cada drop cambia la paleta y explota todo.

const FONDO = 0x040705;
const MAX_ACTORES = 9;
// Fotosensibilidad (WCAG 2.3.1 pide no más de 3 destellos por segundo): láseres, ondas, chispas
// y drops comparten un tope de 2 por segundo; lo que se pasa, se saltea.
const MAX_DESTELLOS_POR_SEG = 2;
// Sin análisis (todavía bajando, o falló) se inventa un pulso de trap: 140 BPM.
const PERIODO_FALSO = 60 / 140;
// Resolución adaptativa: arranca alta y, si el equipo no llega a 45 cuadros por segundo durante
// 2 s seguidos, baja un escalón. Nunca vuelve a subir (así no oscila).
const CUADROS_MINIMOS = 45;
const VENTANA_MEDICION = 2;
const ESCALON_RESOLUCION = 0.25;
const RESOLUCION_MINIMA = 1;

const PALETAS: [number, number][] = [
  [VERDE_3D, ROSA_3D],
  [0x2de2ff, 0xa05bff],
  [ROSA_3D, 0xffd23f],
  [VERDE_3D, 0x2de2ff],
  // Sin rojos saturados: son los que más riesgo tienen en destellos.
  [0x7dffb2, 0x5b8cff],
];

/**
 * Una banda del ecualizador: sube rápido (~50 ms) y baja despacio. No sube de golpe en un cuadro:
 * las barras son un área grande y un salto instantáneo en cada bombo se siente como destello.
 */
function seguirBanda(actual: number, meta: number, dt: number) {
  return meta > actual ? actual + (meta - actual) * Math.min(1, dt * 20) : Math.max(meta, actual - dt * 2.2);
}

type Props = {
  audioRef: RefObject<HTMLAudioElement | null>;
  temaId: string | null;
  sonando: boolean;
};

export default function Nave({ audioRef, temaId, sonando }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  // La nave es lo que se viene a ver y solo corre con play, así que se muestra aunque el sistema pida
  // menos movimiento (Windows lo pide con "Efectos de animación" apagado). Lo que se saca es lo que
  // más marea: la sacudida y el vaivén de cámara.
  const menosMovimiento = usarMovimientoReducido();
  const analisisRef = useRef<Analisis | null>(null);
  // Mientras se analiza el tema el hilo principal está ocupado: esos cuadros no cuentan para medir.
  const analizandoRef = useRef(false);
  const sonandoRef = useRef(sonando);
  const despertarRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    sonandoRef.current = sonando;
    if (sonando) despertarRef.current?.();
  }, [sonando]);

  useEffect(() => {
    analisisRef.current = null;
    analizandoRef.current = false;
    if (!temaId) return;
    let vigente = true;
    analizandoRef.current = true;
    void analizarTema(temaId).then((analisis) => {
      if (!vigente) return;
      analisisRef.current = analisis;
      analizandoRef.current = false;
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
      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    } catch {
      return;
    }
    const celular = Math.min(window.innerWidth, window.innerHeight) < 600;
    let resolucion = Math.max(RESOLUCION_MINIMA, Math.min(window.devicePixelRatio || 1, celular ? 1.5 : 2));
    renderer.setPixelRatio(resolucion);
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Neutral (Khronos PBR Neutral): respeta el tono y la saturación del neón y solo comprime lo
    // que se pasa de blanco, en vez de quemarlo.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.opacity = "0";
    el.appendChild(renderer.domElement);

    const escena = new THREE.Scene();
    escena.background = new THREE.Color(FONDO);
    escena.fog = new THREE.Fog(FONDO, 22, 78);
    // Lo que reflejan los metales, los ojos y el vidrio. Se arma una vez.
    const entorno = crearEntorno(renderer);
    escena.environment = entorno;
    escena.environmentIntensity = 0.7;
    const camara = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.1, 120);
    camara.position.set(0, 0.6, CAMARA_Z);
    const mira = new THREE.Vector3(0, 0.6, -6);

    // Antialiasing de verdad (MSAA) en el buffer donde se dibuja la escena: sin esto los bordes
    // quedan serruchados. Media precisión (HalfFloat) para que el brillo neón no haga escalones.
    const muestras = Math.min(4, renderer.capabilities.maxSamples);
    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: muestras }));
    // El segundo buffer solo recibe pasos de pantalla completa: no necesita multisampling. Como hay
    // dos pasos que intercambian buffers (salida y terminación), la escena cae siempre en el primero.
    composer.renderTarget2.samples = 0;
    composer.setPixelRatio(resolucion);
    composer.setSize(window.innerWidth, window.innerHeight);
    composer.addPass(new RenderPass(escena, camara));
    // Brillo neón: lo que más brilla (barras, láseres, anillos) se derrama como luz. Umbral alto:
    // solo se derrama lo que es neón de verdad, no lo iluminado.
    const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.6, 0.4, 0.62);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const terminacion = new ShaderPass(SHADER_TERMINACION);
    composer.addPass(terminacion);

    // El entorno ya ilumina parejo: la luz ambiente queda baja y las de color pintan los bordes.
    escena.add(new THREE.AmbientLight(0x8fa88a, 0.25));
    const luzA = new THREE.PointLight(VERDE_3D, 22, 40);
    luzA.position.set(-6, 5, 6);
    const luzB = new THREE.PointLight(ROSA_3D, 14, 40);
    luzB.position.set(6, -3, 5);
    const luzBlanca = new THREE.DirectionalLight(0xffffff, 0.8);
    luzBlanca.position.set(2, 6, 8);
    escena.add(luzA, luzB, luzBlanca);

    const kit = crearKit();
    const estrellas = crearEstrellas(1400, kit.puntoRedondo);
    escena.add(estrellas.puntos);
    const halo = crearHalo();
    escena.add(halo);

    const nodriza = crearNodriza(kit);
    const tunel = crearTunel();
    const terreno = crearTerreno();
    const rave = crearRave(kit);
    const laseres = crearLaseres();
    const piezas = [tunel, terreno, nodriza, rave, laseres];
    piezas.forEach((p) => escena.add(p.obj));
    let actores: Actor[] = [];

    const alCambiarTamano = () => {
      camara.aspect = window.innerWidth / window.innerHeight;
      camara.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    let medidos = 0;
    let tiempoMedido = 0;
    const medirRendimiento = (dt: number) => {
      // Un cuadro trabado suelto (cambio de pestaña, el análisis) no es el equipo: se descarta la ventana.
      if (analizandoRef.current || dt >= 0.1) {
        medidos = 0;
        tiempoMedido = 0;
        return;
      }
      medidos++;
      tiempoMedido += dt;
      if (tiempoMedido < VENTANA_MEDICION) return;
      const cuadrosPorSeg = medidos / tiempoMedido;
      medidos = 0;
      tiempoMedido = 0;
      if (cuadrosPorSeg >= CUADROS_MINIMOS || resolucion <= RESOLUCION_MINIMA) return;
      resolucion = Math.max(RESOLUCION_MINIMA, resolucion - ESCALON_RESOLUCION);
      renderer.setPixelRatio(resolucion);
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setPixelRatio(resolucion);
    };
    window.addEventListener("resize", alCambiarTamano);

    const musica: Musica = {
      reloj: 0,
      dt: 0,
      energia: 0,
      graves: 0,
      medios: 0,
      agudos: 0,
      espectro: new Float32Array(BANDAS),
      brillo: 0,
      golpe: 0,
      chasquido: 0,
      drop: 0,
      golpeAhora: false,
      chasquidoAhora: false,
      colorA: new THREE.Color(PALETAS[0][0]),
      colorB: new THREE.Color(PALETAS[0][1]),
      aspecto: camara.aspect,
    };
    let paleta = 0;
    const metaA = new THREE.Color(PALETAS[0][0]);
    const metaB = new THREE.Color(PALETAS[0][1]);
    const cambiarPaleta = () => {
      paleta = (paleta + 1 + Math.floor(Math.random() * (PALETAS.length - 1))) % PALETAS.length;
      metaA.set(PALETAS[paleta][0]);
      metaB.set(PALETAS[paleta][1]);
    };

    const destellos: number[] = [];
    const puedeDestellar = () => {
      while (destellos.length > 0 && musica.reloj - destellos[0] > 1) destellos.shift();
      if (destellos.length >= MAX_DESTELLOS_POR_SEG) return false;
      destellos.push(musica.reloj);
      return true;
    };

    const sumar = (tipo: string) => {
      if (actores.length >= MAX_ACTORES) return;
      const actor = nacerActor(tipo, kit, musica.reloj, camara.aspect);
      // Se ubica antes de dibujarse: si no, el primer cuadro sale en el centro (un fogonazo).
      actor.mover(0, musica.reloj, musica.brillo);
      escena.add(actor.obj);
      actores.push(actor);
    };

    let cuadro = 0;
    let corriendo = false;
    let opacidad = 0;
    let tiempoAnterior = 0;
    let indiceGolpe = 0;
    let indiceChasquido = 0;
    let indiceDrop = 0;
    let golpesSinDrop = 0;
    let ultimaAparicion = 0;
    let ultimoPlaneta = -Infinity;
    let golpeFalso = -1;
    let relojAnterior = performance.now();
    const toca = crearLimitador60();
    const destino = new THREE.Vector3();

    const alGolpear = (fuerza: number) => {
      musica.golpe = 1;
      musica.golpeAhora = true;
      golpesSinDrop++;
      if (fuerza > 0.8 && puedeDestellar()) sumar(Math.random() < 0.6 ? "onda" : "chispas");
      if (Math.random() < 0.25 || musica.reloj - ultimaAparicion > 3.5) {
        sumar(elegir(TIPOS_GOLPE));
        ultimaAparicion = musica.reloj;
      }
      // Temas sin drop marcado: la paleta cambia igual cada tanto.
      if (golpesSinDrop > 48) {
        golpesSinDrop = 0;
        cambiarPaleta();
      }
    };

    const alChasquear = () => {
      musica.chasquido = 1;
      musica.chasquidoAhora = true;
      if (Math.random() > 0.55 || !puedeDestellar()) return;
      const luces = nodriza.luces();
      const desde = elegir(luces);
      destino.set(azar(-9, 9), azar(-4.5, -3), azar(-14, 2));
      laseres.disparar(desde, destino, Math.random() < 0.5 ? musica.colorA : musica.colorB, musica.reloj);
    };

    const alDropear = () => {
      musica.drop = 1;
      golpesSinDrop = 0;
      // El cambio de paleta se funde en ~1 s: no es un destello.
      cambiarPaleta();
      if (puedeDestellar()) sumar("onda");
      sumar(elegir(["ovni-baja", "pelota"] as const));
    };

    const leerMusica = (t: number, activo: boolean) => {
      const analisis = analisisRef.current;
      musica.golpeAhora = false;
      musica.chasquidoAhora = false;
      let e = 0;
      let g = 0;
      let me = 0;
      let ag = 0;

      if (analisis) {
        const i = Math.max(0, Math.min(analisis.energia.length - 1, Math.floor(t * CUADROS_POR_SEG)));
        e = analisis.energia[i] ?? 0;
        g = analisis.graves[i] ?? 0;
        me = analisis.medios[i] ?? 0;
        ag = analisis.agudos[i] ?? 0;
        for (let b = 0; b < BANDAS; b++) {
          const v = activo ? (analisis.espectro[i * BANDAS + b] ?? 0) : 0;
          musica.espectro[b] = seguirBanda(musica.espectro[b], v, musica.dt);
        }
        if (Math.abs(t - tiempoAnterior) > 0.6) {
          indiceGolpe = primerEventoDesde(analisis.golpes, t);
          indiceChasquido = primerEventoDesde(analisis.chasquidos, t);
          indiceDrop = primerEventoDesde(analisis.drops, t);
        }
        while (indiceGolpe < analisis.golpes.length && analisis.golpes[indiceGolpe] <= t) {
          if (activo) alGolpear(analisis.graves[Math.floor(analisis.golpes[indiceGolpe] * CUADROS_POR_SEG)] ?? 0);
          indiceGolpe++;
        }
        while (indiceChasquido < analisis.chasquidos.length && analisis.chasquidos[indiceChasquido] <= t) {
          if (activo) alChasquear();
          indiceChasquido++;
        }
        while (indiceDrop < analisis.drops.length && analisis.drops[indiceDrop] <= t) {
          if (activo) alDropear();
          indiceDrop++;
        }
      } else {
        const fase = (t % PERIODO_FALSO) / PERIODO_FALSO;
        g = Math.exp(-fase * 6);
        e = 0.45 + g * 0.3;
        me = 0.4 + Math.sin(t * 3) * 0.2;
        ag = Math.exp(-((fase + 0.5) % 1) * 8);
        for (let b = 0; b < BANDAS; b++) {
          const forma = b < 6 ? g : b > 22 ? ag : me;
          const v = activo ? forma * (0.55 + 0.45 * Math.sin(t * 7 + b)) : 0;
          musica.espectro[b] = seguirBanda(musica.espectro[b], v, musica.dt);
        }
        const n = Math.floor(t / PERIODO_FALSO);
        if (activo && n !== golpeFalso) {
          golpeFalso = n;
          alGolpear(n % 4 === 0 ? 0.9 : 0.5);
          if (n % 2 === 1) alChasquear();
        }
      }
      tiempoAnterior = t;

      const suavizar = (actual: number, meta: number, k: number) => actual + ((activo ? meta : 0) - actual) * k;
      musica.energia = suavizar(musica.energia, e, 0.2);
      musica.graves = suavizar(musica.graves, g, 0.35);
      musica.medios = suavizar(musica.medios, me, 0.2);
      musica.agudos = suavizar(musica.agudos, ag, 0.35);
      const metaBrillo = activo ? g : 0;
      musica.brillo += (metaBrillo - musica.brillo) * (metaBrillo > musica.brillo ? 0.1 : 0.05);
    };

    const animar = (ahora: number) => {
      cuadro = requestAnimationFrame(animar);
      if (document.hidden || !toca(ahora)) return;
      const dt = Math.min(0.1, (ahora - relojAnterior) / 1000);
      relojAnterior = ahora;
      if (sonandoRef.current) medirRendimiento(dt);
      musica.dt = dt;
      musica.reloj += dt;
      musica.aspecto = camara.aspect;

      const activo = sonandoRef.current;
      leerMusica(audioRef.current?.currentTime ?? 0, activo);
      musica.golpe *= 0.88;
      musica.chasquido *= 0.8;
      musica.drop *= 0.95;
      musica.colorA.lerp(metaA, 0.04);
      musica.colorB.lerp(metaB, 0.04);

      if (activo && musica.reloj - ultimoPlaneta > 20) {
        sumar("planeta");
        ultimoPlaneta = musica.reloj;
      }

      // Estrellas: viajan hacia la cámara más rápido cuanto más fuerte suena.
      const velocidad = (2 + musica.energia * 30) * dt;
      const pos = estrellas.posiciones;
      for (let i = 2; i < pos.length; i += 3) {
        pos[i] += velocidad;
        if (pos[i] > CAMARA_Z) pos[i] -= 70;
      }
      estrellas.geometria.attributes.position.needsUpdate = true;
      estrellas.puntos.rotation.z += dt * 0.02;

      halo.scale.setScalar(7 + musica.graves * 4 + musica.golpe * 2);
      halo.material.opacity = 0.14 + musica.brillo * 0.14;
      halo.material.color.copy(musica.colorA);
      luzA.color.copy(musica.colorA);
      luzB.color.copy(musica.colorB);

      piezas.forEach((p) => p.actualizar(musica));

      actores = actores.filter((actor) => {
        const p = (musica.reloj - actor.nace) / actor.vida;
        if (p >= 1) {
          escena.remove(actor.obj);
          actor.propios.forEach((m) => m.dispose());
          actor.geometria?.dispose();
          actor.liberar?.();
          return false;
        }
        actor.mover(p, musica.reloj, musica.brillo);
        return true;
      });

      // Cámara: vaivén lento, golpe de zoom en el bombo y flash en el drop.
      if (menosMovimiento) {
        camara.position.set(0, 0.6, CAMARA_Z);
        camara.fov = FOV;
      } else {
        const sacudida = musica.golpe * 0.05 + musica.drop * 0.1;
        camara.position.set(
          Math.sin(musica.reloj * 0.21) * 1.4 + (Math.random() - 0.5) * sacudida,
          0.6 + Math.sin(musica.reloj * 0.13) * 0.5 + (Math.random() - 0.5) * sacudida,
          CAMARA_Z - musica.drop * 1.5
        );
        camara.fov = FOV - musica.golpe * 3.5 - musica.drop * 6;
      }
      camara.updateProjectionMatrix();
      camara.lookAt(mira);
      // Sin flash de fondo en el drop, y el brillo neón apenas acompaña (curva lenta).
      bloom.strength = 0.55 + musica.brillo * 0.2;

      opacidad += ((activo ? 1 : 0) - opacidad) * 0.06;
      renderer.domElement.style.opacity = opacidad.toFixed(3);
      composer.render();

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
        actor.liberar?.();
      }
      piezas.forEach((p) => p.liberar());
      liberarKit(kit);
      estrellas.geometria.dispose();
      (estrellas.puntos.material as THREE.Material).dispose();
      entorno.dispose();
      bloom.dispose();
      terminacion.dispose();
      composer.dispose();
      liberarEscena(escena, renderer);
    };
  }, [audioRef, menosMovimiento]);

  return <div ref={contenedor} aria-hidden="true" className="pointer-events-none fixed inset-0" />;
}
