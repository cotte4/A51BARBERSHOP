"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { crearLimitador60, usarMovimientoReducido } from "@/app/torneo/_movimiento";
import { liberarEscena, VERDE_3D } from "@/app/torneo/_pelota3d";
import type { ResumenJuego } from "@/lib/estudio-juego";
import { MODELOS, nuevasDesbloqueadas, type ModeloNave } from "@/lib/estudio-naves";
import { analizarTema, BANDAS, CUADROS_POR_SEG, primerEventoDesde, type Analisis } from "./_analisis";
import Hangar from "./_Hangar";
import Marcador from "./_Marcador";
import { crearFormacion, crearNebulosa, ESCENAS_GRANDES, nacerEscena, SORTEO_COSTADO, type TextoFormacion } from "./_naveEscenas";
import { crearNave, prepararFlota } from "./_naveFlota";
import { crearJuego, type EstadoJuego, type OpcionesPartida, type ResultadoPartida } from "./_naveJuego";
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
import { mundoDeTema, PALETAS, type MundoTema } from "./_naveMundo";
import { crearLaseres, crearNodriza, crearRave, crearTunel, type Musica } from "./_naveShow";
import { crearTerreno } from "./_naveTerreno";
import { crearOnditas, crearToques, type Limites } from "./_naveToque";

// La nave del Estudio: aparece al dar play y se va al pausar. Un show armado con el tema que
// suena (ver _analisis.ts): la nodriza con el espectro alrededor, el túnel, el terreno, la rave
// de aliens y los láseres, más ovnis, aliens, la pelota alien y planetas que salen al azar en
// los bombos. En cada drop cambia la paleta, la flota escribe "51" o "A" en el cielo y explota todo.
//
// Cada tema tiene su mundo (_naveMundo.ts): arranca con su paleta, su bioma y sus naves dominantes.
// La nodriza es la nave que cada uno eligió en el hangar, en el show y en el juego.
//
// En modo nave (pantalla completa) se toca todo: los actores reaccionan (_naveToque.ts), el mouse
// que pasa o el dedo que barre los empuja, la gente mira al puntero, la nodriza se arrastra y,
// mantenida apretada, arranca el jueguito de esquivar meteoritos (_naveJuego.ts). Al terminar, el
// cartel guarda el récord del tema y abre el hangar.

const FONDO = 0x040705;
const MAX_ACTORES = 12;
// Escenas de los costados (_naveEscenas.ts): llevan su propio tope, así no le quitan lugar a los del
// centro. Las grandes (cada una trae naves o un alien) van de a dos como mucho.
const MAX_ESCENAS = 4;
const MAX_ESCENAS_GRANDES = 2;
/** Cuadros que se dibujan las naves de muestra (invisibles) para que three compile sus programas al arrancar. */
const CUADROS_PRECALENTAR = 2;
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

// Puntero. Mantener apretada la nodriza: el aro empieza a llenarse a los 150 ms (un toque corto no
// lo muestra) y se llena en 600 ms más. Si el dedo se mueve más de 10 px antes, es arrastrar.
const CARGA_DEMORA = 0.15;
const CARGA_DURA = 0.6;
const TOLERANCIA_ARRASTRE = 10;
/** Margen extra (px) para acertarle a algo: el dedo es más gordo que el mouse. */
const TOLERANCIA = { mouse: 6, dedo: 22 };
/** Hasta dónde llega el empujón del mouse que pasa o del dedo que barre (px). */
const RADIO_EMPUJE = { mouse: 130, dedo: 110 };
/** Profundidades: la ondita de un toque en el vacío, y el punto al que mira la gente (adelante). */
const Z_ONDITA = -2;
const Z_MIRADA = 5;
/** El plano donde vive la nodriza (y la nave del juego). */
const Z_NODRIZA = -6;
/** Juego con el dedo: la nave se mueve un poco más que el dedo, así no hace falta cruzar la pantalla. */
const GANANCIA_DEDO = 1.3;

type Modo = "nada" | "nodriza" | "arrastre" | "barrer" | "juego";

/**
 * Una banda del ecualizador: sube rápido (~50 ms) y baja despacio. No sube de golpe en un cuadro:
 * las barras son un área grande y un salto instantáneo en cada bombo se siente como destello.
 */
function seguirBanda(actual: number, meta: number, dt: number) {
  return meta > actual ? actual + (meta - actual) * Math.min(1, dt * 20) : Math.max(meta, actual - dt * 2.2);
}

/** Medio alto visible a una profundidad z (sin crear objetos: se usa en cada cuadro). */
function mitadAlto(z: number) {
  return Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * (CAMARA_Z - z);
}

type Props = {
  audioRef: RefObject<HTMLAudioElement | null>;
  temaId: string | null;
  sonando: boolean;
  /** Modo nave a pantalla completa: se puede tocar todo, arrastrar la nodriza y jugar. */
  interactiva: boolean;
  /** Avisa cuando empieza o termina el juego (mientras, la barra del player no sale). */
  onJuego?: (jugando: boolean) => void;
  /** El jueguito en la base: la nave elegida (la nodriza), el mejor récord y los récords de cada tema. */
  resumen: ResumenJuego;
  /**
   * Terminó una partida: la guarda sin frenar nada. Devuelve las naves que destrabó según la base,
   * o null si no se pudo guardar (el cartel se queda con la cuenta local).
   */
  onPartida: (temaId: string, resultado: ResultadoPartida) => Promise<ModeloNave[] | null>;
  /** "Usar esta" del hangar: cambia la nave al toque y la guarda; si no se pudo, rechaza con el motivo. */
  onElegirNave: (modelo: ModeloNave) => Promise<void>;
};

export default function Nave({ audioRef, temaId, sonando, interactiva, onJuego, resumen, onPartida, onElegirNave }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const capaEtiquetas = useRef<HTMLDivElement>(null);
  // La nave es lo que se viene a ver y solo corre con play, así que se muestra aunque el sistema pida
  // menos movimiento (Windows lo pide con "Efectos de animación" apagado). Lo que se saca es lo que
  // más marea: la sacudida y el vaivén de cámara.
  const menosMovimiento = usarMovimientoReducido();
  const analisisRef = useRef<Analisis | null>(null);
  // Mientras se analiza el tema el hilo principal está ocupado: esos cuadros no cuentan para medir.
  const analizandoRef = useRef(false);
  const sonandoRef = useRef(sonando);
  const despertarRef = useRef<(() => void) | null>(null);
  const interactivaRef = useRef(interactiva);
  const onJuegoRef = useRef(onJuego);
  // El efecto de three lee estos en cada cuadro (el tema, la nave elegida) o al terminar una partida.
  const temaIdRef = useRef(temaId);
  const resumenRef = useRef(resumen);
  const onPartidaRef = useRef(onPartida);
  const hangarRef = useRef(false);
  // Los botones del marcador (React) llaman al juego, que vive adentro del efecto de three.
  const accionesRef = useRef<{ salir: () => void; otraVez: () => void } | null>(null);
  const [juego, setJuego] = useState<EstadoJuego | null>(null);
  // Las naves que destrabó la partida que acaba de terminar (el cartel las anuncia).
  const [desbloqueos, setDesbloqueos] = useState<ModeloNave[]>([]);
  const [hangar, setHangar] = useState(false);
  const cerrarHangar = useCallback(() => setHangar(false), []);
  // Solo existe en modo nave y desde el cartel del juego.
  const hangarAbierto = hangar && interactiva && juego !== null;

  useEffect(() => {
    sonandoRef.current = sonando;
    if (sonando) despertarRef.current?.();
  }, [sonando]);

  useEffect(() => {
    interactivaRef.current = interactiva;
  }, [interactiva]);

  useEffect(() => {
    onJuegoRef.current = onJuego;
  }, [onJuego]);

  useEffect(() => {
    resumenRef.current = resumen;
  }, [resumen]);

  useEffect(() => {
    onPartidaRef.current = onPartida;
  }, [onPartida]);

  useEffect(() => {
    hangarRef.current = hangarAbierto;
  }, [hangarAbierto]);

  useEffect(() => {
    temaIdRef.current = temaId;
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
    // El mundo del tema que suena (paleta, bioma y flota) está desde el primer cuadro.
    const mundoInicial = temaIdRef.current ? mundoDeTema(temaIdRef.current) : null;
    if (mundoInicial) kit.flota = mundoInicial.flota;
    // Las geometrías de los 6 modelos se arman ahora, mientras la nave aparece: el show saca naves de
    // cualquier modelo y armar una en medio de un tema es un tirón (el triángulo es la más cara).
    prepararFlota(kit);
    const estrellas = crearEstrellas(1400, kit.puntoRedondo);
    escena.add(estrellas.puntos);
    const halo = crearHalo();
    escena.add(halo);

    const nebulosa = crearNebulosa();
    const nodriza = crearNodriza(kit, resumenRef.current.naveElegida);
    const tunel = crearTunel();
    const terreno = crearTerreno(kit, mundoInicial?.bioma);
    const rave = crearRave(kit);
    const laseres = crearLaseres();
    const formacion = crearFormacion(kit);
    const piezas = [nebulosa, tunel, terreno, nodriza, rave, laseres, formacion];
    piezas.forEach((p) => escena.add(p.obj));

    // Una nave de cada modelo, tan chica que no se ve y detrás de la nodriza: en los primeros cuadros
    // three compila sus programas (el enjambre trae uno propio) y después se sueltan. Así la primera
    // nave de cada modelo que cruza el show no traba.
    const navesMuestra = MODELOS.map((modelo) => crearNave(kit, modelo));
    const precalentar = new THREE.Group();
    precalentar.position.set(0, 1.6, -8);
    precalentar.scale.setScalar(0.001);
    navesMuestra.forEach((muestra) => precalentar.add(muestra.grupo));
    escena.add(precalentar);
    let cuadrosPrecalentados = 0;
    const soltarMuestras = () => {
      if (!precalentar.parent) return;
      escena.remove(precalentar);
      navesMuestra.forEach((muestra) => muestra.liberar());
    };
    let actores: Actor[] = [];
    const toques = crearToques();
    const onditas = crearOnditas(kit.geo.onda);
    escena.add(onditas.obj);

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
      // Con el hangar abierto tampoco: la nave anda a media marcha a propósito y el hangar dibuja lo suyo.
      if (analizandoRef.current || hangarRef.current || dt >= 0.1) {
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

    let paleta = mundoInicial?.paleta ?? 0;
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
      colorA: new THREE.Color(PALETAS[paleta][0]),
      colorB: new THREE.Color(PALETAS[paleta][1]),
      aspecto: camara.aspect,
    };
    // Los actores que nacen antes del primer cuadro de la nodriza (que lo apunta siempre) ya tienen ecualizador.
    kit.sonido = musica;
    const metaA = new THREE.Color(PALETAS[paleta][0]);
    const metaB = new THREE.Color(PALETAS[paleta][1]);
    const cambiarPaleta = () => {
      paleta = (paleta + 1 + Math.floor(Math.random() * (PALETAS.length - 1))) % PALETAS.length;
      metaA.set(PALETAS[paleta][0]);
      metaB.set(PALETAS[paleta][1]);
    };

    // Cambió el tema: su mundo entra de a poco (la paleta se funde en ~1 s, el bioma llega desde el
    // horizonte) y las naves que más se ven pasan a ser las suyas.
    let temaDelMundo = temaIdRef.current;
    const aplicarMundo = (mundo: MundoTema) => {
      kit.flota = mundo.flota;
      paleta = mundo.paleta;
      metaA.set(PALETAS[paleta][0]);
      metaB.set(PALETAS[paleta][1]);
      terreno.cambiarBioma(mundo.bioma);
    };

    const destellos: number[] = [];
    const puedeDestellar = () => {
      while (destellos.length > 0 && musica.reloj - destellos[0] > 1) destellos.shift();
      if (destellos.length >= MAX_DESTELLOS_POR_SEG) return false;
      destellos.push(musica.reloj);
      return true;
    };

    /** Suma un actor si hay lugar (`forzar` lo suma igual: las chispas de un choque del juego). */
    const sumar = (tipo: string, forzar = false): Actor | null => {
      if (!forzar && actores.length >= MAX_ACTORES) return null;
      const actor = nacerActor(tipo, kit, musica.reloj, camara.aspect);
      // Se ubica antes de dibujarse: si no, el primer cuadro sale en el centro (un fogonazo).
      actor.mover(0, musica.reloj, musica.brillo);
      escena.add(actor.obj);
      actores.push(actor);
      return actor;
    };

    // Escenas de los costados: una cada 4–7 s (más seguido si suena fuerte), alternando el lado.
    const escenas = new WeakSet<Actor>();
    const grandes = new WeakSet<Actor>();
    let ladoEscena: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    let proximaEscena = 3;
    const sumarEscena = () => {
      let enCurso = 0;
      let grandesEnCurso = 0;
      for (const actor of actores) {
        if (escenas.has(actor)) enCurso++;
        if (grandes.has(actor)) grandesEnCurso++;
      }
      if (enCurso >= MAX_ESCENAS) return;
      // ESCENAS_GRANDES incluye la batalla: 2 o 3 naves completas también cuentan para el tope.
      let tipo = elegir(SORTEO_COSTADO);
      const grande = ESCENAS_GRANDES.includes(tipo);
      if (grande && grandesEnCurso >= MAX_ESCENAS_GRANDES) tipo = Math.random() < 0.5 ? "cometa" : "fugaces";
      const actor = nacerEscena(tipo, kit, musica.reloj, camara.aspect, ladoEscena);
      ladoEscena = ladoEscena === 1 ? -1 : 1;
      actor.mover(0, musica.reloj, musica.brillo);
      escena.add(actor.obj);
      actores.push(actor);
      escenas.add(actor);
      if (ESCENAS_GRANDES.includes(tipo)) grandes.add(actor);
    };

    // ————— Etiquetas: textos chiquitos que salen donde pasó algo ("¡Muu!", "+5", los toques de la pelota) —————
    const VIDA_ETIQUETA = 1.1;
    const proyectado = new THREE.Vector3();
    const spans = Array.from(capaEtiquetas.current?.querySelectorAll<HTMLSpanElement>("[data-etiqueta]") ?? []);
    const etiquetas = spans.map((span) => ({ span, mundo: new THREE.Vector3(), desde: -10, viva: false }));
    const spanPelota = capaEtiquetas.current?.querySelector<HTMLSpanElement>("[data-pelota]") ?? null;
    let siguienteEtiqueta = 0;
    const mostrarEtiqueta = (texto: string, donde: THREE.Vector3) => {
      const etiqueta = etiquetas[siguienteEtiqueta];
      if (!etiqueta) return;
      siguienteEtiqueta = (siguienteEtiqueta + 1) % etiquetas.length;
      etiqueta.span.textContent = texto;
      etiqueta.mundo.copy(donde);
      etiqueta.desde = musica.reloj;
      etiqueta.viva = true;
    };
    const ponerEnPantalla = (span: HTMLSpanElement, mundo: THREE.Vector3, subir: number, opacidad: number) => {
      proyectado.copy(mundo).project(camara);
      if (proyectado.z > 1) {
        span.style.opacity = "0";
        return;
      }
      const x = ((proyectado.x + 1) / 2) * window.innerWidth;
      const y = ((1 - proyectado.y) / 2) * window.innerHeight - subir;
      span.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      span.style.opacity = opacidad.toFixed(2);
    };

    // ————— Puntero: dónde está el dedo o el mouse y qué está haciendo —————
    const p = {
      presente: false,
      mouse: true,
      apretado: false,
      id: -1,
      x: 0,
      y: 0,
      antesX: 0,
      antesY: 0,
      inicioX: 0,
      inicioY: 0,
      inicio: 0,
      modo: "nada" as Modo,
    };
    const rayo = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const punto = new THREE.Vector3();
    const agarre = new THREE.Vector3();
    const naveInicio = new THREE.Vector3();
    const destinoNodriza = new THREE.Vector3();
    const fuerza = new THREE.Vector3();
    const centro = new THREE.Vector3();
    const pantalla = { x: 0, y: 0, adelante: true };

    /** El punto del mundo bajo (x, y) de la pantalla, a la profundidad z. */
    const aMundo = (x: number, y: number, z: number, destino: THREE.Vector3) => {
      ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
      rayo.setFromCamera(ndc, camara);
      const { origin, direction } = rayo.ray;
      return destino.copy(origin).addScaledVector(direction, (z - origin.z) / direction.z);
    };
    const aPantalla = (mundo: THREE.Vector3) => {
      proyectado.copy(mundo).project(camara);
      pantalla.x = ((proyectado.x + 1) / 2) * window.innerWidth;
      pantalla.y = ((1 - proyectado.y) / 2) * window.innerHeight;
      pantalla.adelante = proyectado.z < 1;
      return pantalla;
    };
    /** Cuántos píxeles mide una unidad del mundo a la distancia de `mundo`. */
    const pxPorUnidad = (mundo: THREE.Vector3) =>
      window.innerHeight / 2 / (camara.position.distanceTo(mundo) * Math.tan(THREE.MathUtils.degToRad(camara.fov / 2)));
    /** Qué tan cerca está (x, y) de una esfera vista en pantalla, en radios: menos de 1 = adentro. */
    const cercania = (mundo: THREE.Vector3, radio: number, x: number, y: number, tolerancia: number) => {
      const r = radio * pxPorUnidad(mundo) + tolerancia;
      const s = aPantalla(mundo);
      return s.adelante ? Math.hypot(s.x - x, s.y - y) / r : Infinity;
    };
    const buscarActor = (x: number, y: number, tolerancia: number): Actor | null => {
      let mejor: Actor | null = null;
      let mejorCercania = 1;
      for (const actor of actores) {
        if (actor.radio <= 0) continue;
        const c = cercania(actor.obj.position, actor.radio * actor.obj.scale.x, x, y, tolerancia);
        if (c < mejorCercania) {
          mejorCercania = c;
          mejor = actor;
        }
      }
      return mejor;
    };
    const buscarBailarin = (x: number, y: number, tolerancia: number): number => {
      let mejor = -1;
      let mejorCercania = 1;
      const c = rave.cabezas;
      for (let i = 0; i < c.length; i += 4) {
        if (c[i + 3] <= 0) continue;
        const k = cercania(centro.set(c[i], c[i + 1], c[i + 2]), c[i + 3], x, y, tolerancia);
        if (k < mejorCercania) {
          mejorCercania = k;
          mejor = i / 4;
        }
      }
      return mejor;
    };
    // Con el alcance (no el radio del casco): los drones del enjambre también son la nave.
    const tocaNodriza = (x: number, y: number, tolerancia: number) => cercania(nodriza.control.posicion, nodriza.control.alcance, x, y, tolerancia) < 1;
    /** Lo que se ve del plano de la nodriza, con margen: de ahí no se la puede sacar. */
    const limitarAlCampo = (v: THREE.Vector3) => {
      const alto = mitadAlto(v.z);
      const ancho = alto * camara.aspect;
      v.x = THREE.MathUtils.clamp(v.x, -ancho * 0.88, ancho * 0.88);
      v.y = THREE.MathUtils.clamp(v.y, -alto * 0.62, alto * 0.8);
      return v;
    };
    const limites: Limites = { x: 0, arriba: 0, abajo: 0 };
    const limitesPelota = (z: number) => {
      const alto = mitadAlto(z);
      limites.x = alto * camara.aspect * 0.9;
      limites.arriba = alto * 0.82;
      limites.abajo = -alto - 2;
      return limites;
    };

    // ————— Juego —————
    let sacudidaJuego = 0;
    // El tema de la partida en curso: el récord es de ese tema aunque en el medio empiece otro.
    let temaPartida: string | null = null;
    // Para no pisar el cartel de una partida nueva con la respuesta (tardía) de la base sobre la anterior.
    let numeroPartida = 0;
    const partida = crearJuego(
      {
        alCambiar: (estado) => setJuego(estado),
        alChocar: (donde) => {
          sacudidaJuego = 1;
          nodriza.girar();
          if (puedeDestellar()) sumar("chispas", true)?.obj.position.copy(donde);
        },
        alSumar: (texto, donde) => mostrarEtiqueta(texto, donde),
        alTerminar: (resultado) => {
          const tema = temaPartida;
          const esta = numeroPartida;
          // El cartel anuncia al toque lo que se destrabó, con la cuenta local; cuando contesta la base
          // (que sabe de las partidas en otros equipos), manda la base.
          const antes = resumenRef.current.mejorRecord;
          setDesbloqueos(nuevasDesbloqueadas(antes, Math.max(antes, resultado.puntos)));
          if (!tema) return;
          void onPartidaRef.current(tema, resultado).then((nuevas) => {
            if (nuevas && esta === numeroPartida) setDesbloqueos((previas) => (mismasNaves(previas, nuevas) ? previas : nuevas));
          });
        },
      },
      kit
    );
    escena.add(partida.obj);

    /** Con qué se juega: tu nave del hangar, tu récord y el del otro en el tema que suena. */
    const opcionesPartida = (): OpcionesPartida => {
      const { naveElegida, records } = resumenRef.current;
      const record = temaPartida ? records[temaPartida] : undefined;
      return { modelo: naveElegida, record: record?.mio ?? null, rival: record?.rival ?? null };
    };
    /**
     * Arranca una partida (la primera o "Otra vez"). Siempre con las opciones de ahora: si en el cartel se
     * eligió otra nave o empezó otro tema, la partida nueva ya es con eso (y el récord, el recién hecho).
     */
    const arrancar = () => {
      temaPartida = temaIdRef.current;
      numeroPartida++;
      setDesbloqueos([]);
      setHangar(false);
      const opciones = opcionesPartida();
      // La nodriza tiene que ser la nave con la que se juega (si ya lo es, no hace nada).
      nodriza.cambiarModelo(opciones.modelo);
      partida.empezar(opciones);
    };

    const empezarPartida = () => {
      arrancar();
      // El cielo queda para el juego: sin texto de la flota ni naves bajando sobre la gente.
      formacion.deshacer();
      rave.abducirSola(false);
      p.modo = "juego";
      nodriza.control.carga = 0;
      // La nave arranca donde estaba: con el dedo, se mueve desde ahí.
      destinoNodriza.copy(nodriza.control.posicion);
      nodriza.control.meta = destinoNodriza;
      naveInicio.copy(destinoNodriza);
      p.inicioX = p.x;
      p.inicioY = p.y;
      if ("vibrate" in navigator) navigator.vibrate(25);
      onJuegoRef.current?.(true);
    };
    const terminarPartida = () => {
      partida.terminar();
      nodriza.control.meta = null;
      rave.abducirSola(true);
      if (p.modo === "juego") p.modo = "nada";
      setJuego(null);
      setHangar(false);
      onJuegoRef.current?.(false);
    };
    accionesRef.current = {
      salir: terminarPartida,
      otraVez: () => {
        arrancar();
        naveInicio.copy(nodriza.control.posicion);
      },
    };

    // ————— Lo que hace el dedo —————
    const disparar = () => {
      if (!puedeDestellar()) return;
      destino.set(azar(-9, 9), azar(-4.5, -3), azar(-14, 2));
      laseres.disparar(elegir(nodriza.luces()), destino, Math.random() < 0.5 ? musica.colorA : musica.colorB, musica.reloj);
    };

    /** Empujón en ronda (la ondita de un toque en el vacío). */
    const empujarAlrededor = (desde: THREE.Vector3, radio: number, fuerzaMax: number) => {
      for (const actor of actores) {
        if (actor.radio <= 0) continue;
        fuerza.subVectors(actor.obj.position, desde).setZ(0);
        const d = fuerza.length();
        if (d >= radio || d < 1e-3) continue;
        toques.empujar(actor, fuerza.multiplyScalar(((1 - d / radio) * fuerzaMax) / d));
      }
    };

    /** Si hay un actor o un bailarín bajo el dedo, reacciona. */
    const tocarAlgo = (x: number, y: number, tolerancia: number) => {
      const actor = buscarActor(x, y, tolerancia);
      if (actor) {
        aMundo(x, y, actor.obj.position.z, punto);
        const texto = toques.tocar(actor, punto, musica.reloj);
        // Los toques de la pelota se muestran pegados a ella (ver abajo), no como cartelito suelto.
        if (texto && actor.clase !== "pelota") mostrarEtiqueta(texto, actor.obj.position);
        return true;
      }
      const bailarin = buscarBailarin(x, y, tolerancia);
      if (bailarin >= 0) {
        rave.tocar(bailarin, musica.reloj);
        return true;
      }
      return false;
    };

    let opacidad = 0;
    const alApretar = (evento: PointerEvent) => {
      // Con la nave apagada (en pausa) no hay nada que tocar.
      if (!interactivaRef.current || opacidad < 0.5) return;
      const mouse = evento.pointerType === "mouse";
      if (mouse && evento.button !== 0) return;
      evento.preventDefault();
      const tolerancia = mouse ? TOLERANCIA.mouse : TOLERANCIA.dedo;
      // Un segundo dedo solo toca cosas; los gestos son del primero.
      if (!evento.isPrimary || p.apretado) {
        if (!partida.activo) tocarAlgo(evento.clientX, evento.clientY, tolerancia);
        return;
      }
      try {
        el.setPointerCapture(evento.pointerId);
      } catch {
        // Sin captura el gesto sigue andando mientras el dedo no salga del lienzo.
      }
      Object.assign(p, {
        presente: true,
        mouse,
        apretado: true,
        id: evento.pointerId,
        x: evento.clientX,
        y: evento.clientY,
        antesX: evento.clientX,
        antesY: evento.clientY,
        inicioX: evento.clientX,
        inicioY: evento.clientY,
        inicio: performance.now() / 1000,
      });
      if (partida.activo) {
        p.modo = "juego";
        naveInicio.copy(nodriza.control.meta ?? nodriza.control.posicion);
        return;
      }
      if (tocaNodriza(p.x, p.y, tolerancia)) {
        p.modo = "nodriza";
        // Se agarra de donde la tocaste, no del centro: así no pega un salto al empezar a arrastrar.
        agarre.subVectors(nodriza.control.posicion, aMundo(p.x, p.y, nodriza.control.posicion.z, punto));
        return;
      }
      p.modo = "barrer";
      if (tocarAlgo(p.x, p.y, tolerancia)) return;
      onditas.lanzar(aMundo(p.x, p.y, Z_ONDITA, punto), musica.colorA, musica.reloj);
      empujarAlrededor(punto, 3.5, 5);
    };

    const alMover = (evento: PointerEvent) => {
      if (!interactivaRef.current) return;
      const mouse = evento.pointerType === "mouse";
      if (p.apretado ? evento.pointerId !== p.id : !mouse) return;
      p.presente = true;
      p.mouse = mouse;
      p.x = evento.clientX;
      p.y = evento.clientY;
      if (p.modo === "nodriza" && Math.hypot(p.x - p.inicioX, p.y - p.inicioY) > TOLERANCIA_ARRASTRE) {
        p.modo = "arrastre";
        nodriza.control.carga = 0;
      }
    };

    const alSoltar = (evento: PointerEvent) => {
      if (evento.pointerId !== p.id) return;
      // Fue un toque corto: la nodriza gira y tira un par de láseres.
      if (p.modo === "nodriza") {
        nodriza.girar();
        disparar();
        disparar();
      }
      if (p.modo === "arrastre") nodriza.control.meta = null;
      nodriza.control.carga = 0;
      p.apretado = false;
      p.id = -1;
      if (p.modo !== "juego") p.modo = "nada";
      if (evento.pointerType !== "mouse") p.presente = false;
    };

    const alSalirDelLienzo = (evento: PointerEvent) => {
      if (evento.pointerType === "mouse" && !p.apretado) p.presente = false;
    };

    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && partida.activo) terminarPartida();
    };

    el.addEventListener("pointerdown", alApretar);
    el.addEventListener("pointermove", alMover);
    el.addEventListener("pointerup", alSoltar);
    el.addEventListener("pointercancel", alSoltar);
    el.addEventListener("pointerleave", alSalirDelLienzo);
    window.addEventListener("keydown", alTeclear);

    let cursor = "";
    const ponerCursor = (valor: string) => {
      if (valor === cursor) return;
      cursor = valor;
      el.style.cursor = valor;
    };

    /** Cada cuadro: el aro de carga, el arrastre, la nave del juego, las miradas y los empujes. */
    const seguirPuntero = (dt: number, ahora: number) => {
      if (!interactivaRef.current) {
        if (partida.activo) terminarPartida();
        if (p.modo === "arrastre") nodriza.control.meta = null;
        p.presente = false;
        p.apretado = false;
        p.modo = "nada";
        nodriza.control.carga = 0;
        kit.mirada.activa = false;
        return;
      }

      if (p.modo === "nodriza") {
        const carga = (ahora - p.inicio - CARGA_DEMORA) / CARGA_DURA;
        nodriza.control.carga = Math.max(0, carga);
        if (carga >= 1) empezarPartida();
      } else if (p.modo === "arrastre") {
        nodriza.control.meta = limitarAlCampo(aMundo(p.x, p.y, Z_NODRIZA, destinoNodriza).add(agarre).setZ(Z_NODRIZA));
      }

      if (partida.activo && !partida.termino) {
        if (p.mouse && p.presente) {
          // Mouse: la nave va a donde está el cursor.
          nodriza.control.meta = limitarAlCampo(aMundo(p.x, p.y, Z_NODRIZA, destinoNodriza));
        } else if (p.modo === "juego" && p.apretado) {
          // Dedo: se mueve lo mismo que el dedo (un poco más), desde donde estaba. El dedo no la tapa.
          const unidadesPorPx = ((2 * mitadAlto(Z_NODRIZA)) / window.innerHeight) * GANANCIA_DEDO;
          destinoNodriza.set(naveInicio.x + (p.x - p.inicioX) * unidadesPorPx, naveInicio.y - (p.y - p.inicioY) * unidadesPorPx, Z_NODRIZA);
          nodriza.control.meta = limitarAlCampo(destinoNodriza);
        }
      }

      kit.mirada.activa = p.presente && !partida.activo;
      if (kit.mirada.activa) aMundo(p.x, p.y, Z_MIRADA, kit.mirada.punto);

      // El mouse que pasa cerca corre a los actores; el dedo que barre los arrastra en su dirección.
      const barriendo = p.modo === "barrer" && p.apretado;
      if (!partida.activo && p.presente && dt > 0 && (barriendo || (p.mouse && !p.apretado))) {
        const radio = p.mouse ? RADIO_EMPUJE.mouse : RADIO_EMPUJE.dedo;
        const velX = (p.x - p.antesX) / dt;
        const velY = (p.y - p.antesY) / dt;
        for (const actor of actores) {
          // La pelota en jueguitos solo responde a toques: si no, el mouse quieto abajo la sostiene.
          if (actor.radio <= 0 || toques.toques(actor) > 0) continue;
          const s = aPantalla(actor.obj.position);
          const dx = s.x - p.x;
          const dy = s.y - p.y;
          const d = Math.hypot(dx, dy);
          if (!s.adelante || d >= radio) continue;
          const cae = 1 - d / radio;
          const unidades = 1 / pxPorUnidad(actor.obj.position);
          const lejos = d > 1 ? 6 / d : 0;
          const arrastre = barriendo ? 1.5 * unidades : 0;
          fuerza.set(dx * lejos + velX * arrastre, -(dy * lejos + velY * arrastre), 0).multiplyScalar(cae * dt);
          toques.empujar(actor, fuerza);
        }
      }
      p.antesX = p.x;
      p.antesY = p.y;

      if (p.mouse) {
        if (partida.activo && !partida.termino) ponerCursor("none");
        else if (p.modo === "arrastre") ponerCursor("grabbing");
        else if (!p.presente || p.apretado) ponerCursor("default");
        else if (tocaNodriza(p.x, p.y, TOLERANCIA.mouse)) ponerCursor("grab");
        else ponerCursor(buscarActor(p.x, p.y, TOLERANCIA.mouse) || buscarBailarin(p.x, p.y, TOLERANCIA.mouse) >= 0 ? "pointer" : "default");
      }
    };

    let cuadro = 0;
    let corriendo = false;
    let tiempoAnterior = 0;
    let indiceGolpe = 0;
    let indiceChasquido = 0;
    let indiceDrop = 0;
    let golpesSinDrop = 0;
    let ultimaAparicion = 0;
    let ultimoPlaneta = -Infinity;
    let golpeFalso = -1;
    let textoFormacion: TextoFormacion = "51";
    // Con el hangar abierto en la compu, la nave de atrás dibuja un cuadro de cada dos.
    let salteo = 0;
    let relojAnterior = performance.now();
    const toca = crearLimitador60();
    const destino = new THREE.Vector3();
    const paralaje = new THREE.Vector2();

    const alGolpear = (fuerzaGolpe: number) => {
      musica.golpe = 1;
      musica.golpeAhora = true;
      golpesSinDrop++;
      // Temas sin drop marcado: la paleta cambia igual cada tanto.
      if (golpesSinDrop > 48) {
        golpesSinDrop = 0;
        cambiarPaleta();
      }
      // Jugando, los bombos tiran meteoritos y el resto del show no suma actores (no confunde).
      if (partida.activo) {
        partida.alGolpear(fuerzaGolpe, musica);
        return;
      }
      if (fuerzaGolpe > 0.8 && puedeDestellar()) sumar(Math.random() < 0.6 ? "onda" : "chispas");
      if (Math.random() < 0.25 || musica.reloj - ultimaAparicion > 3.5) {
        sumar(elegir(TIPOS_GOLPE));
        ultimaAparicion = musica.reloj;
      }
    };

    const alChasquear = () => {
      musica.chasquido = 1;
      musica.chasquidoAhora = true;
      partida.alChasquear();
      if (Math.random() > 0.55) return;
      disparar();
    };

    const alDropear = () => {
      musica.drop = 1;
      golpesSinDrop = 0;
      // El cambio de paleta se funde en ~1 s: no es un destello. El piso pasa a otro bioma, que entra
      // desde el horizonte.
      cambiarPaleta();
      terreno.cambiarBioma();
      if (partida.activo) {
        partida.alDropear(musica);
        return;
      }
      // La flota escribe en el cielo, una vez "51" y otra "A" (si todavía hay una arriba, esta vez no).
      if (formacion.armar(textoFormacion)) textoFormacion = textoFormacion === "51" ? "A" : "51";
      if (puedeDestellar()) sumar("onda");
      sumar(elegir(["ovni-baja", "pelota"] as const));
      // Y una escena extra en el costado que toca.
      sumarEscena();
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
      // Con el hangar abierto hay dos lienzos 3D: la nave de atrás afloja. En el celu el hangar la tapa
      // entera, así que se queda quieta (y al cerrarlo la nave nueva entra a la vista); en la compu se
      // ve alrededor, así que sigue a media marcha.
      if (hangarRef.current) {
        if (celular) {
          relojAnterior = ahora;
          return;
        }
        salteo = 1 - salteo;
        if (salteo === 1) return;
      }
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
      if (activo && !partida.activo && musica.reloj >= proximaEscena) {
        sumarEscena();
        proximaEscena = musica.reloj + azar(4, 7) * (1 - musica.energia * 0.35);
      }

      seguirPuntero(dt, ahora / 1000);
      if (temaIdRef.current !== temaDelMundo) {
        temaDelMundo = temaIdRef.current;
        if (temaDelMundo) aplicarMundo(mundoDeTema(temaDelMundo));
      }
      // La nave del hangar: si cambió, la nodriza se transforma. En medio de una partida no (la habilidad
      // es la de la nave con la que empezó): espera al cartel del final.
      const elegida = resumenRef.current.naveElegida;
      if (elegida !== nodriza.control.modelo && (!partida.activo || partida.termino)) nodriza.cambiarModelo(elegida);
      // Al empezar el juego la nodriza se achica de a poco, y al terminar vuelve.
      nodriza.control.juego += ((partida.activo ? 1 : 0) - nodriza.control.juego) * Math.min(1, dt * 4);

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

      piezas.forEach((pieza) => pieza.actualizar(musica));
      partida.actualizar(musica, nodriza.control, activo);

      actores = actores.filter((actor) => {
        const progreso = (musica.reloj - actor.nace) / actor.vida;
        if (progreso >= 1) {
          escena.remove(actor.obj);
          actor.propios.forEach((m) => m.dispose());
          actor.geometria?.dispose();
          actor.liberar?.();
          return false;
        }
        toques.quitar(actor);
        actor.mover(progreso, musica.reloj, musica.brillo);
        toques.aplicar(actor, dt, limitesPelota);
        return true;
      });
      onditas.actualizar(musica.reloj);

      // Cartelitos: suben un poco y se apagan.
      for (const etiqueta of etiquetas) {
        if (!etiqueta.viva) continue;
        const k = (musica.reloj - etiqueta.desde) / VIDA_ETIQUETA;
        if (k >= 1) {
          etiqueta.viva = false;
          etiqueta.span.style.opacity = "0";
          continue;
        }
        ponerEnPantalla(etiqueta.span, etiqueta.mundo, 30 + k * 40, Math.min(1, k * 8) * (1 - k * k));
      }
      // Los jueguitos con la pelota: el número de toques va pegado arriba de ella.
      if (spanPelota) {
        const pelota = actores.find((actor) => toques.toques(actor) > 1);
        if (pelota) {
          const texto = String(toques.toques(pelota));
          if (spanPelota.textContent !== texto) spanPelota.textContent = texto;
          ponerEnPantalla(spanPelota, pelota.obj.position, pelota.obj.scale.x * pxPorUnidad(pelota.obj.position) + 8, 1);
        } else if (spanPelota.style.opacity !== "0") {
          spanPelota.style.opacity = "0";
        }
      }

      // Cámara: vaivén lento, golpe de zoom en el bombo y se inclina un poco hacia el puntero. Jugando
      // queda quieta (para apuntar) y solo se sacude cuando un meteorito pega.
      const libre = 1 - nodriza.control.juego;
      sacudidaJuego *= Math.exp(-dt * 6);
      if (menosMovimiento) {
        camara.position.set(0, 0.6, CAMARA_Z);
        camara.fov = FOV;
      } else {
        const hayPuntero = interactivaRef.current && p.presente && !partida.activo;
        paralaje.x += ((hayPuntero ? ((p.x / window.innerWidth) * 2 - 1) * 0.9 : 0) - paralaje.x) * Math.min(1, dt * 2.5);
        paralaje.y += ((hayPuntero ? -((p.y / window.innerHeight) * 2 - 1) * 0.5 : 0) - paralaje.y) * Math.min(1, dt * 2.5);
        const sacudida = (musica.golpe * 0.05 + musica.drop * 0.1) * libre + sacudidaJuego * 0.25;
        camara.position.set(
          Math.sin(musica.reloj * 0.21) * 1.4 * libre + paralaje.x + (Math.random() - 0.5) * sacudida,
          0.6 + Math.sin(musica.reloj * 0.13) * 0.5 * libre + paralaje.y + (Math.random() - 0.5) * sacudida,
          CAMARA_Z - musica.drop * 1.5 * libre
        );
        camara.fov = FOV - (musica.golpe * 3.5 + musica.drop * 6) * libre;
      }
      camara.updateProjectionMatrix();
      camara.lookAt(mira);
      // Sin flash de fondo en el drop, y el brillo neón apenas acompaña (curva lenta).
      bloom.strength = 0.55 + musica.brillo * 0.2;

      opacidad += ((activo ? 1 : 0) - opacidad) * 0.06;
      renderer.domElement.style.opacity = opacidad.toFixed(3);
      composer.render();
      if (cuadrosPrecalentados < CUADROS_PRECALENTAR && ++cuadrosPrecalentados === CUADROS_PRECALENTAR) soltarMuestras();

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
      accionesRef.current = null;
      cancelAnimationFrame(cuadro);
      window.removeEventListener("resize", alCambiarTamano);
      window.removeEventListener("keydown", alTeclear);
      el.removeEventListener("pointerdown", alApretar);
      el.removeEventListener("pointermove", alMover);
      el.removeEventListener("pointerup", alSoltar);
      el.removeEventListener("pointercancel", alSoltar);
      el.removeEventListener("pointerleave", alSalirDelLienzo);
      // Una partida a medias con puntos se guarda igual: terminar la avisa (liberar no).
      if (partida.activo) {
        partida.terminar();
        onJuegoRef.current?.(false);
      }
      setJuego(null);
      setHangar(false);
      soltarMuestras();
      for (const actor of actores) {
        actor.propios.forEach((m) => m.dispose());
        actor.geometria?.dispose();
        actor.liberar?.();
      }
      piezas.forEach((pieza) => pieza.liberar());
      partida.liberar();
      onditas.liberar();
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

  return (
    <>
      <div
        ref={contenedor}
        aria-hidden="true"
        className={`fixed inset-0 ${interactiva ? "pointer-events-auto touch-none select-none" : "pointer-events-none"}`}
      />
      <div ref={capaEtiquetas} aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            data-etiqueta=""
            className="absolute left-0 top-0 whitespace-nowrap font-display text-lg font-bold text-white opacity-0 drop-shadow-[0_0_10px_rgba(140,255,89,0.7)]"
          />
        ))}
        <span
          data-pelota=""
          className="absolute left-0 top-0 font-display text-3xl font-bold tabular-nums text-white opacity-0 drop-shadow-[0_0_12px_rgba(140,255,89,0.8)]"
        />
      </div>
      {juego ? (
        <Marcador
          estado={juego}
          sonando={sonando}
          desbloqueos={desbloqueos}
          onSalir={() => accionesRef.current?.salir()}
          onOtraVez={() => accionesRef.current?.otraVez()}
          onHangar={() => setHangar(true)}
        />
      ) : null}
      {/* El hangar va directo al body: así queda arriba de la barra del player y fuera de esta capa, que
          no recibe toques. Se monta solo mientras está abierto (al cerrarse suelta su lienzo 3D). */}
      {hangarAbierto
        ? createPortal(
            <Hangar elegida={resumen.naveElegida} mejorRecord={resumen.mejorRecord} onElegir={onElegirNave} onCerrar={cerrarHangar} />,
            document.body
          )
        : null}
    </>
  );
}

function mismasNaves(a: readonly ModeloNave[], b: readonly ModeloNave[]) {
  return a.length === b.length && a.every((modelo, i) => modelo === b[i]);
}
