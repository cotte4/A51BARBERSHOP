"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent as TeclaReact } from "react";
import * as THREE from "three";
import { crearLimitador60, usarMovimientoReducido } from "@/app/torneo/_movimiento";
import {
  conLaNave,
  FICHAS,
  MODELOS,
  NAVE_INICIAL,
  navesDesbloqueadas,
  siguienteDesbloqueo,
  type Habilidad,
  type ModeloNave,
} from "@/lib/estudio-naves";
import { COLOR_NAVE, crearNave, MEDIDAS_NAVE, vaivenDe, type Nave, type Vaiven } from "./_naveFlota";
import { crearKit, liberarKit, ROSA_3D, VERDE_3D } from "./_naveKit";
import { crearEntorno } from "./_naveMateriales";

// El hangar: se elige la nave que va a ser tu nodriza (en el show y en el juego). Arriba la nave
// elegida girando en una vitrina three.js propia y chica; abajo las seis, las bloqueadas en sombra
// con el récord que las destraba. Se abre desde el cartel de fin del juego.

const HABILIDAD: Record<Habilidad, string> = {
  pareja: "Pareja",
  escudo: "Escudo",
  iman: "Imán",
  finita: "Finita",
  laser: "Láser",
  drones: "Drones",
};

/** El color de la nave en CSS, con transparencia. */
function rgba(color: number, alfa: number): string {
  return `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, ${alfa})`;
}

const SOMBRA_CSS = 0x71717a;

// ————————————————————————————— Iconos —————————————————————————————
// La silueta de cada nave para las tarjetas: una vitrina 3D por tarjeta serían seis contextos WebGL.

function IconoNave({ modelo, className, style }: { modelo: ModeloNave; className?: string; style?: CSSProperties }) {
  const cuerpo = { fill: "currentColor", fillOpacity: 0.2 };
  const vidrio = { fill: "currentColor", fillOpacity: 0.1 };
  return (
    <svg
      viewBox="0 0 48 32"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {modelo === "platillo" ? (
        <>
          <path d="M16.5 15.5a7.5 6.5 0 0 1 15 0" {...vidrio} />
          <ellipse cx="24" cy="18" rx="19" ry="4.5" {...cuerpo} />
          <path d="M16.5 22.2 19 25.2h10l2.5-3" />
        </>
      ) : modelo === "trompo" ? (
        <>
          <path d="M19.5 10.4a4.5 4 0 0 1 9 0" {...vidrio} />
          <path d="M8.5 13.6Q24 7.6 39.5 13.6Q35 21.5 24.8 29.2h-1.6Q13 21.5 8.5 13.6Z" {...cuerpo} />
          <path d="M12.4 17.6h23.2" />
        </>
      ) : modelo === "anillo" ? (
        <>
          <circle cx="24" cy="14.6" r="11.4" {...vidrio} />
          <circle cx="24" cy="14.6" r="7" />
          <circle cx="24" cy="14.6" r="2.6" {...cuerpo} />
          <path d="M24 12V7.6M21.75 15.9l-3.8 2.2M26.25 15.9l3.8 2.2" />
          <circle cx="24" cy="28.4" r="1.4" fill="currentColor" />
        </>
      ) : modelo === "cigarro" ? (
        <>
          <path d="M22 11.6a4 3.6 0 0 1 8 0" {...vidrio} />
          <path d="M7 16c0-2.8 1.2-4.4 3.5-4.4h21c5.5 0 9.5 2.4 11 4.4-1.5 2-5.5 4.4-11 4.4h-21C8.2 20.4 7 18.8 7 16Z" {...cuerpo} />
          <path d="m11.6 11.6-4-5.1h3.2l4.6 5.1M11.6 20.4l-4 5.1h3.2l4.6-5.1" />
          {[17, 21, 25, 29].map((x) => (
            <circle key={x} cx={x} cy="16" r="0.9" fill="currentColor" stroke="none" />
          ))}
        </>
      ) : modelo === "triangulo" ? (
        <>
          <path d="M10 6.5 41 16 10 25.5Z" {...cuerpo} />
          <circle cx="20.5" cy="16" r="3.6" {...vidrio} />
          {[
            [12.2, 9.4],
            [37.4, 16],
            [12.2, 22.6],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.3" fill="currentColor" stroke="none" />
          ))}
        </>
      ) : (
        <>
          <path d="M20 14.4a4 3.5 0 0 1 8 0" {...vidrio} />
          <ellipse cx="24" cy="16.6" rx="7.5" ry="2.6" {...cuerpo} />
          <path d="m18.6 18.8 2.2 2.8h6.4l2.2-2.8" />
          {[
            [7.5, 9],
            [40.5, 9],
            [8.5, 25],
            [39.5, 25],
          ].map(([x, y]) => (
            <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="3.4" ry="1.3" {...cuerpo} />
          ))}
        </>
      )}
    </svg>
  );
}

function CandadoIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" strokeLinecap="round" />
    </svg>
  );
}

function CerrarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

// ————————————————————————————— Vitrina 3D —————————————————————————————

const FOV_VITRINA = 30;
/** La cámara mira un poco desde arriba: se ve la cúpula sin perder el perfil. */
const ELEVACION = 0.26;
/** Todas las naves se llevan a este tamaño (lo más lejos que llega cada una), en unidades del mundo. */
const TAM_NAVE = 1.5;
/** Aire alrededor para que el giro, el vaivén y la entrada no la corten. */
const MARGEN = 1.22;
/** Radianes por segundo de la vuelta sola. */
const GIRO_AUTO = 0.45;
const VEL_MAX = 9;
/** El anillo y el cigarro no dan la vuelta (de perfil se ven finitos): se mecen de 3/4 con esta amplitud. */
const MECIDA = 0.5;
const GIRA_LIBRE: Record<ModeloNave, boolean> = {
  platillo: true,
  trompo: true,
  anillo: false,
  cigarro: false,
  triangulo: true,
  enjambre: true,
};
/** Cómo entra cada una: de 3/4. El cigarro y el triángulo con la nariz hacia adelante a la derecha. */
const ANGULO_BASE: Record<ModeloNave, number> = {
  platillo: -0.5,
  trompo: -0.5,
  anillo: 0,
  cigarro: -0.55,
  triangulo: -0.6,
  enjambre: -0.5,
};
const ENTRADA_SEG = 0.55;
/** El plano (z) al que mira el piloto cuando hay dedo o mouse: adelante de la nave. */
const Z_MIRADA = 3;

/** Sube y se pasa apenas: la nave nueva "aterriza" en la vitrina. */
function salidaConRebote(x: number) {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
}

type Encuadre = { escala: number; y: number };
type ApiVitrina = { mostrar: (modelo: ModeloNave, enSombra: boolean) => void; despertar: () => void };

type PropsVitrina = {
  modelo: ModeloNave;
  bloqueada: boolean;
  menosMovimiento: boolean;
  etiqueta: string;
};

function Vitrina({ modelo, bloqueada, menosMovimiento, etiqueta }: PropsVitrina) {
  const contenedor = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ApiVitrina | null>(null);
  const quietoRef = useRef(menosMovimiento);
  const [sin3d, setSin3d] = useState(false);

  useEffect(() => {
    quietoRef.current = menosMovimiento;
    apiRef.current?.despertar();
  }, [menosMovimiento]);

  // Un solo renderer para toda la vida del hangar; cambiar de nave cambia solo la nave.
  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setSin3d(true);
      return;
    }
    // Lienzo chico: con MSAA del navegador alcanza, sin bloom ni composer. El halo lo pone el CSS.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    const lienzo = renderer.domElement;
    lienzo.style.cssText = "display:block;width:100%;height:100%;opacity:0;transition:opacity 420ms ease-out";
    el.appendChild(lienzo);

    const escena = new THREE.Scene();
    const entorno = crearEntorno(renderer);
    escena.environment = entorno;
    escena.environmentIntensity = 0.8;
    const camara = new THREE.PerspectiveCamera(FOV_VITRINA, 1, 0.1, 60);
    // Las mismas luces que el show, más cerca: el verde y el rosa pintan los bordes del cromo.
    escena.add(new THREE.AmbientLight(0x8fa88a, 0.3));
    const luzA = new THREE.PointLight(VERDE_3D, 16, 30);
    luzA.position.set(-5, 4, 5);
    const luzB = new THREE.PointLight(ROSA_3D, 11, 30);
    luzB.position.set(5, -2.5, 4);
    const luzBlanca = new THREE.DirectionalLight(0xffffff, 0.9);
    luzBlanca.position.set(2, 6, 8);
    escena.add(luzA, luzB, luzBlanca);

    const kit = crearKit();
    // La bloqueada se ve en sombra: la silueta sola, recortada contra el halo gris de atrás.
    const sombra = new THREE.MeshBasicMaterial({ color: 0x0a0c0f });
    // El pedestal gira, se mece y hace la entrada; adentro, la nave centrada y a escala.
    const pedestal = new THREE.Group();
    escena.add(pedestal);
    const encuadres = new Map<ModeloNave, Encuadre>();
    const caja = new THREE.Box3();
    const vaiven: Vaiven = { x: 0, y: 0, giroY: 0, giroZ: 0 };
    const rayoMirada = new THREE.Vector3();

    let nave: Nave | null = null;
    let actual: ModeloNave = NAVE_INICIAL;
    let escalaActual = 1;
    let vivo = true;
    let listo = false;
    let sucio = true;
    let reloj = 0;
    let entrada = 1;
    let angulo = 0;
    let vel = 0;
    let mecida = 0;
    let arrastre: { id: number; x: number; ultimo: number } | null = null;

    /** Escala y altura para que cada modelo llene la vitrina igual, medidas una vez por modelo. */
    const encuadreDe = (n: Nave): Encuadre => {
      let encuadre = encuadres.get(n.modelo);
      if (!encuadre) {
        // Se mide suelta (sin pedestal), así la caja queda en sus unidades.
        caja.setFromObject(n.grupo);
        const medioAlto = (caja.max.y - caja.min.y) / 2;
        const escala = TAM_NAVE / Math.max(MEDIDAS_NAVE[n.modelo].alcance, medioAlto, 0.1);
        encuadre = { escala, y: -((caja.max.y + caja.min.y) / 2) * escala };
        encuadres.set(n.modelo, encuadre);
      }
      return encuadre;
    };

    const mecidaActual = () => (GIRA_LIBRE[actual] ? 0 : MECIDA * mecida * Math.sin(reloj * 0.55));

    const ajustar = () => {
      const ancho = el.clientWidth;
      const alto = el.clientHeight;
      if (ancho === 0 || alto === 0) return;
      renderer.setSize(ancho, alto, false);
      camara.aspect = ancho / alto;
      // Que entre una esfera del tamaño de la nave, sea la vitrina ancha o angosta.
      const medioV = THREE.MathUtils.degToRad(FOV_VITRINA / 2);
      const medioH = Math.atan(Math.tan(medioV) * camara.aspect);
      const distancia = (TAM_NAVE * MARGEN) / Math.sin(Math.min(medioV, medioH));
      camara.position.set(0, Math.sin(ELEVACION) * distancia, Math.cos(ELEVACION) * distancia);
      camara.lookAt(0, 0, 0);
      camara.updateProjectionMatrix();
      sucio = true;
    };
    const observador = new ResizeObserver(ajustar);
    observador.observe(el);
    ajustar();

    // Compilaciones en curso y, si el hangar se cerró mientras tanto, lo que queda por soltar.
    let compilando = 0;
    let soltarPendiente: (() => void) | null = null;
    const prender = () => {
      // Compilar antes de mostrar: el primer cuadro no traba y la vitrina aparece de una.
      compilando++;
      void renderer
        .compileAsync(escena, camara)
        .catch(() => undefined)
        .then(() => {
          compilando--;
          if (!vivo) {
            if (compilando === 0) soltarPendiente?.();
            return;
          }
          listo = true;
          sucio = true;
          lienzo.style.opacity = "1";
        });
    };

    const mostrar = (modelo: ModeloNave, enSombra: boolean) => {
      escena.overrideMaterial = enSombra ? sombra : null;
      sucio = true;
      if (nave && nave.modelo === modelo) return;
      if (nave) {
        pedestal.remove(nave.grupo);
        nave.liberar();
      }
      nave = crearNave(kit, modelo);
      // En el hangar no chupa nada: el rayo sobra (su material lo suelta nave.liberar()).
      nave.grupo.remove(nave.rayo);
      const { escala, y } = encuadreDe(nave);
      nave.grupo.scale.setScalar(escala);
      nave.grupo.position.y = y;
      pedestal.add(nave.grupo);
      actual = modelo;
      escalaActual = escala;
      // Cada una entra de 3/4, sin heredar el giro de la anterior.
      angulo = ANGULO_BASE[modelo];
      vel = GIRA_LIBRE[modelo] ? GIRO_AUTO : 0;
      mecida = 0;
      entrada = quietoRef.current ? 1 : 0;
      if (!listo) prender();
    };

    const actualizar = (dt: number) => {
      const quieto = quietoRef.current;
      if (quieto) {
        entrada = 1;
      } else {
        reloj += dt;
        entrada = Math.min(1, entrada + dt / ENTRADA_SEG);
      }
      if (!arrastre && !quieto) {
        if (GIRA_LIBRE[actual]) {
          // Lo que quedó del empujón se apaga hasta la vuelta de siempre, para el lado que la tiraron.
          const meta = vel < 0 ? -GIRO_AUTO : GIRO_AUTO;
          vel += (meta - vel) * Math.min(1, dt * 1.6);
          angulo += vel * dt;
        } else {
          vel *= Math.exp(-dt * 3.5);
          angulo += vel * dt;
          // Vuelve a su 3/4 por el camino corto y se empieza a mecer de a poco.
          const base = ANGULO_BASE[actual] + Math.round((angulo - ANGULO_BASE[actual]) / (Math.PI * 2)) * Math.PI * 2;
          angulo += (base - angulo) * Math.min(1, dt * 1.8);
          mecida = Math.min(1, mecida + dt * 0.6);
        }
      }
      if (!nave) return;
      vaivenDe(actual, reloj, 0, vaiven);
      const llegada = salidaConRebote(entrada);
      pedestal.rotation.y = angulo + mecidaActual();
      pedestal.rotation.z = vaiven.giroZ * 0.7;
      pedestal.position.y = vaiven.y * escalaActual * 0.7 + (1 - Math.min(1, llegada)) * 0.4;
      pedestal.scale.setScalar(0.86 + 0.14 * llegada);
      nave.animar(reloj);
    };

    const limitador = crearLimitador60();
    let previo = 0;
    let raf = 0;
    const cuadro = (ahora: number) => {
      raf = requestAnimationFrame(cuadro);
      if (!limitador(ahora)) return;
      const dt = previo === 0 ? 0 : Math.min(0.1, (ahora - previo) / 1000);
      previo = ahora;
      if (!listo || !nave) return;
      // Con menos movimiento la vitrina queda quieta: se dibuja solo cuando algo cambia.
      if (quietoRef.current && !sucio) return;
      sucio = false;
      actualizar(dt);
      renderer.render(escena, camara);
    };
    raf = requestAnimationFrame(cuadro);

    // El piloto mira al dedo o al mouse (kit.mirada, como en el show).
    const apuntar = (evento: PointerEvent) => {
      if (quietoRef.current) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      rayoMirada
        .set(((evento.clientX - r.left) / r.width) * 2 - 1, -((evento.clientY - r.top) / r.height) * 2 + 1, 0.5)
        .unproject(camara)
        .sub(camara.position)
        .normalize();
      if (rayoMirada.z > -0.05) return;
      kit.mirada.punto.copy(camara.position).addScaledVector(rayoMirada, (Z_MIRADA - camara.position.z) / rayoMirada.z);
      kit.mirada.activa = true;
    };

    // Arrastrar la gira (con inercia); al soltarla vuelve sola a lo suyo.
    const alApretar = (evento: PointerEvent) => {
      if (evento.pointerType === "mouse" && evento.button !== 0) return;
      arrastre = { id: evento.pointerId, x: evento.clientX, ultimo: evento.timeStamp };
      el.setPointerCapture(evento.pointerId);
      // La mecida pasa a ser parte del ángulo: agarrarla no la hace saltar.
      angulo += mecidaActual();
      mecida = 0;
      vel = 0;
      apuntar(evento);
    };
    const alMover = (evento: PointerEvent) => {
      apuntar(evento);
      if (!arrastre || evento.pointerId !== arrastre.id) return;
      const giro = ((evento.clientX - arrastre.x) / Math.max(1, el.clientWidth)) * Math.PI * 1.6;
      const dt = Math.max(0.008, (evento.timeStamp - arrastre.ultimo) / 1000);
      arrastre.x = evento.clientX;
      arrastre.ultimo = evento.timeStamp;
      angulo += giro;
      vel = THREE.MathUtils.clamp(giro / dt, -VEL_MAX, VEL_MAX);
      sucio = true;
    };
    const alSoltar = (evento: PointerEvent) => {
      if (!arrastre || evento.pointerId !== arrastre.id) return;
      // Si el dedo quedó quieto antes de soltar, no hay tiro.
      if (quietoRef.current || evento.timeStamp - arrastre.ultimo > 90) vel = 0;
      arrastre = null;
      if (evento.pointerType !== "mouse") kit.mirada.activa = false;
    };
    const alSalir = (evento: PointerEvent) => {
      if (evento.pointerType === "mouse" && !arrastre) kit.mirada.activa = false;
    };
    el.addEventListener("pointerdown", alApretar);
    el.addEventListener("pointermove", alMover);
    el.addEventListener("pointerup", alSoltar);
    el.addEventListener("pointercancel", alSoltar);
    el.addEventListener("pointerleave", alSalir);

    apiRef.current = {
      mostrar,
      despertar: () => {
        sucio = true;
      },
    };

    return () => {
      vivo = false;
      apiRef.current = null;
      cancelAnimationFrame(raf);
      observador.disconnect();
      el.removeEventListener("pointerdown", alApretar);
      el.removeEventListener("pointermove", alMover);
      el.removeEventListener("pointerup", alSoltar);
      el.removeEventListener("pointercancel", alSoltar);
      el.removeEventListener("pointerleave", alSalir);
      const soltar = () => {
        nave?.liberar();
        escena.overrideMaterial = null;
        liberarKit(kit);
        sombra.dispose();
        entorno.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        lienzo.remove();
      };
      // compileAsync sigue mirando los materiales hasta que terminan de compilar: soltarlos antes rompe
      // su chequeo (un error suelto). Pasa al cerrar el hangar enseguida y en el doble montaje de desarrollo.
      if (compilando > 0) soltarPendiente = soltar;
      else soltar();
    };
  }, []);

  useEffect(() => {
    apiRef.current?.mostrar(modelo, bloqueada);
  }, [modelo, bloqueada]);

  return (
    <div ref={contenedor} role="img" aria-label={etiqueta} className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing">
      {sin3d ? (
        <div className="flex h-full items-center justify-center">
          <IconoNave modelo={modelo} className="h-24 w-36" style={{ color: bloqueada ? "#3f3f46" : rgba(COLOR_NAVE[modelo], 1) }} />
        </div>
      ) : null}
    </div>
  );
}

// ————————————————————————————— El hangar —————————————————————————————

type Props = {
  /** La nave que usa ahora (la de la base). */
  elegida: ModeloNave;
  /** Su mejor récord en cualquier tema: es lo que destraba naves. */
  mejorRecord: number;
  /**
   * "Usar esta". Si devuelve una promesa, el botón espera ("Guardando…") y, si se rechaza, muestra el
   * mensaje del error. Cerrar o no el hangar después lo decide quien lo abre.
   */
  onElegir: (modelo: ModeloNave) => void | Promise<void>;
  onCerrar: () => void;
};

const PASO_TECLA: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

function mensajeDe(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "No se pudo guardar. Probá de nuevo.";
}

export default function Hangar({ elegida, mejorRecord, onElegir, onCerrar }: Props) {
  const ids = useId();
  const menosMovimiento = usarMovimientoReducido();
  const raiz = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const radios = useRef<(HTMLButtonElement | null)[]>([]);
  const onCerrarRef = useRef(onCerrar);
  const [vista, setVista] = useState<ModeloNave>(elegida);
  const [visible, setVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    onCerrarRef.current = onCerrar;
  }, [onCerrar]);

  // Entra con un fundido corto (el cuadro siguiente, para que la transición arranque).
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Al abrir, el foco va a la nave en uso; al cerrar, vuelve a donde estaba (el botón del cartel).
  const elegidaAlAbrir = useRef(elegida);
  useEffect(() => {
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    radios.current[MODELOS.indexOf(elegidaAlAbrir.current)]?.focus({ preventScroll: true });
    return () => previo?.focus({ preventScroll: true });
  }, []);

  // Teclado en captura: Esc cierra el hangar y nada más (no sale del modo nave), y Tab no se escapa.
  useEffect(() => {
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        evento.stopPropagation();
        onCerrarRef.current();
        return;
      }
      const caja = panel.current;
      if (evento.key !== "Tab" || !caja) return;
      const focos = Array.from(caja.querySelectorAll<HTMLButtonElement>("button:not([disabled])")).filter((b) => b.tabIndex >= 0);
      if (focos.length === 0) return;
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      const activo = document.activeElement;
      if (!caja.contains(activo)) {
        evento.preventDefault();
        primero.focus();
      } else if (evento.shiftKey && activo === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };
    window.addEventListener("keydown", alTeclear, true);
    return () => window.removeEventListener("keydown", alTeclear, true);
  }, []);

  // Los toques del hangar no llegan a la nave de atrás (que se arrastra y arranca el juego) ni a la
  // barra del player. Nativo: la nave escucha con addEventListener, antes que React.
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const cortar = (evento: Event) => evento.stopPropagation();
    const tipos = ["pointerdown", "pointermove", "pointerup", "pointercancel", "wheel"] as const;
    tipos.forEach((tipo) => el.addEventListener(tipo, cortar));
    return () => tipos.forEach((tipo) => el.removeEventListener(tipo, cortar));
  }, []);

  const desbloqueadas = navesDesbloqueadas(mejorRecord);
  const bloqueada = !desbloqueadas.includes(vista);
  const enUso = vista === elegida;
  const ficha = FICHAS[vista];
  const color = COLOR_NAVE[vista];
  const tono = bloqueada ? SOMBRA_CSS : color;
  const siguiente = siguienteDesbloqueo(mejorRecord);
  const faltanVista = Math.max(0, ficha.recordParaDesbloquear - Math.max(0, mejorRecord));

  // Cuánto del camino hasta la próxima nave ya está hecho (desde la última que se destrabó).
  const ultimaDestrabada = desbloqueadas[desbloqueadas.length - 1] ?? NAVE_INICIAL;
  const desde = FICHAS[ultimaDestrabada].recordParaDesbloquear;
  const progreso = siguiente
    ? Math.min(1, Math.max(0, (mejorRecord - desde) / Math.max(1, FICHAS[siguiente.modelo].recordParaDesbloquear - desde)))
    : 1;

  const mirar = (modelo: ModeloNave) => {
    setVista(modelo);
    setError(null);
    setAviso("");
  };

  const moverConTeclas = (evento: TeclaReact<HTMLButtonElement>, i: number) => {
    const paso = PASO_TECLA[evento.key];
    const destino = paso ? (i + paso + MODELOS.length) % MODELOS.length : evento.key === "Home" ? 0 : evento.key === "End" ? MODELOS.length - 1 : null;
    if (destino === null) return;
    evento.preventDefault();
    mirar(MODELOS[destino]);
    radios.current[destino]?.focus();
  };

  const puedeUsar = !bloqueada && !enUso && !guardando;

  async function usar() {
    if (!puedeUsar) return;
    const modelo = vista;
    setError(null);
    try {
      const resultado = onElegir(modelo);
      if (resultado instanceof Promise) {
        setGuardando(true);
        await resultado;
      }
      setAviso(`Listo: ahora volás ${conLaNave(modelo)}.`);
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setGuardando(false);
    }
  }

  const etiquetaBoton = guardando
    ? "Guardando…"
    : enUso
      ? "La estás usando"
      : bloqueada
        ? `Récord ${ficha.recordParaDesbloquear} · te faltan ${faltanVista}`
        : "Usar esta";

  return (
    <div
      ref={raiz}
      className="fixed inset-0 z-50 flex justify-center bg-black/50 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-[max(env(safe-area-inset-top),12px)] sm:items-center sm:p-6"
      onClick={onCerrar}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-titulo`}
        aria-describedby={`${ids}-detalle`}
        onClick={(evento) => evento.stopPropagation()}
        className={`relative flex h-full w-full max-w-md flex-col overflow-y-auto overscroll-contain rounded-[28px] border border-white/10 bg-zinc-950/80 backdrop-blur transition-[opacity,transform] duration-300 ease-out sm:h-auto sm:max-h-full ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.98] opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100"
        }`}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={`${ids}-titulo`} className="font-display text-2xl font-semibold text-white">
              Hangar
            </h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              {mejorRecord > 0 ? (
                <>
                  Tu récord <span className="font-semibold tabular-nums text-white">{mejorRecord}</span>
                  {siguiente ? (
                    <>
                      {" "}
                      · faltan <span className="tabular-nums">{siguiente.faltan}</span> para el {FICHAS[siguiente.modelo].nombre}
                    </>
                  ) : (
                    " · tenés todas"
                  )}
                </>
              ) : (
                "Jugá para destrabar naves"
              )}
            </p>
            {siguiente ? (
              <div className="mt-2 h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                <div className="h-full rounded-full bg-[#8cff59]" style={{ width: `${Math.round(progreso * 100)}%` }} />
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar el hangar"
            className="shrink-0 rounded-full border border-white/15 bg-zinc-950/60 p-2.5 text-zinc-200 hover:text-[#8cff59]"
          >
            <CerrarIcon />
          </button>
        </div>

        <div className="relative mx-3 mt-2 min-h-[170px] flex-1 sm:h-[290px] sm:flex-none">
          {/* El halo toma el color de la nave (gris si está bloqueada) y cambia despacio, sin destellos. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-[color] duration-500 ease-out motion-reduce:transition-none"
            style={{ color: rgba(tono, 1) }}
          >
            <div
              className="absolute left-1/2 top-1/2 aspect-square h-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30"
              style={{ background: "radial-gradient(closest-side, currentColor, transparent)" }}
            />
            <div
              className="absolute bottom-[6%] left-1/2 h-[16%] w-[64%] -translate-x-1/2 rounded-[50%] opacity-25"
              style={{ background: "radial-gradient(closest-side, currentColor, transparent)" }}
            />
          </div>
          <Vitrina
            modelo={vista}
            bloqueada={bloqueada}
            menosMovimiento={menosMovimiento}
            etiqueta={bloqueada ? `${ficha.nombre}, en sombra: todavía bloqueada` : `${ficha.nombre} girando`}
          />
        </div>

        <div className="px-5 pt-1 text-center">
          <div className="flex items-center justify-center gap-2.5">
            <h3 className="font-display text-3xl font-bold leading-tight text-white">{ficha.nombre}</h3>
            <span
              className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ borderColor: rgba(tono, 0.45), color: rgba(tono, 1), backgroundColor: rgba(tono, 0.1) }}
            >
              {HABILIDAD[ficha.habilidad]}
            </span>
          </div>
          <p id={`${ids}-detalle`} className="mx-auto mt-1 min-h-10 max-w-[32ch] text-sm text-zinc-400">
            {ficha.descripcion}
          </p>
        </div>

        <div className="px-3 pt-3">
          <div role="radiogroup" aria-label="Naves" className="grid grid-cols-3 gap-2">
            {MODELOS.map((modelo, i) => {
              const suya = modelo === elegida;
              const enSombra = !desbloqueadas.includes(modelo);
              const activa = modelo === vista;
              const { nombre, habilidad, recordParaDesbloquear } = FICHAS[modelo];
              const colorTarjeta = COLOR_NAVE[modelo];
              return (
                <button
                  key={modelo}
                  ref={(nodo) => {
                    radios.current[i] = nodo;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={activa}
                  aria-label={`${nombre}${suya ? ", en uso" : enSombra ? `, bloqueada: se destraba con un récord de ${recordParaDesbloquear}` : ""}`}
                  tabIndex={activa ? 0 : -1}
                  onClick={() => mirar(modelo)}
                  onKeyDown={(evento) => moverConTeclas(evento, i)}
                  className={`relative flex flex-col items-center gap-1 rounded-[20px] border px-1.5 pb-2.5 pt-3 text-center active:scale-[0.97] motion-reduce:active:scale-100 ${
                    activa ? "bg-white/[0.07]" : "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.05]"
                  }`}
                  style={
                    activa
                      ? {
                          borderColor: rgba(enSombra ? SOMBRA_CSS : colorTarjeta, 0.6),
                          boxShadow: `0 0 22px ${rgba(enSombra ? SOMBRA_CSS : colorTarjeta, 0.16)}`,
                        }
                      : undefined
                  }
                >
                  {suya ? (
                    <span aria-hidden="true" className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#8cff59] shadow-[0_0_8px_#8cff59]" />
                  ) : null}
                  <IconoNave
                    modelo={modelo}
                    className={`h-8 w-12 ${enSombra ? "opacity-70" : ""}`}
                    style={{ color: enSombra ? "#52525b" : rgba(colorTarjeta, 1) }}
                  />
                  <span className={`text-[13px] font-semibold leading-tight ${enSombra ? "text-zinc-500" : "text-white"}`}>{nombre}</span>
                  <span className={`flex items-center gap-1 text-[11px] leading-none ${suya ? "text-[#8cff59]" : "text-zinc-500"}`}>
                    {suya ? (
                      "En uso"
                    ) : enSombra ? (
                      <>
                        <CandadoIcon /> Récord {recordParaDesbloquear}
                      </>
                    ) : (
                      HABILIDAD[habilidad]
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-3 pb-3 pt-3">
          {error ? (
            <p role="alert" className="mb-2 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}
          {/* Un solo botón que cambia de cara: aria-disabled y no disabled, así el foco no se pierde
              cuando pasa a "La estás usando". */}
          <button
            type="button"
            onClick={() => void usar()}
            aria-disabled={!puedeUsar}
            className={`flex w-full items-center justify-center gap-2 rounded-[20px] px-5 py-3.5 font-semibold ${
              puedeUsar ? "neon-button" : "cursor-default border border-white/10 bg-white/[0.04] text-zinc-400"
            }`}
          >
            {bloqueada && !guardando ? <CandadoIcon className="h-4 w-4" /> : null}
            {etiquetaBoton}
          </button>
          <p aria-live="polite" className="sr-only">
            {aviso}
          </p>
        </div>
      </div>
    </div>
  );
}
