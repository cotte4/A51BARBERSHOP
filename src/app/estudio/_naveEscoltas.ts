import * as THREE from "three";
import type { ModeloNave } from "@/lib/estudio-naves";
import { COLOR_NAVE, crearNave, MEDIDAS_NAVE, prepararFlota, vaivenDe, type Nave, type Vaiven } from "./_naveFlota";
import { suave, type Kit } from "./_naveKit";
import type { Musica } from "./_naveShow";

// Lo que acompaña a la nave en el juego:
// - Escoltas: con racha alta se suman dos naves chicas (del mismo modelo que la tuya) a los
//   costados. Agarran las estrellas que les pasan cerca (suman para vos) y, si chocás, se van volando.
// - Drones del enjambre: dos drones fijos a los costados; cada uno se interpone en un golpe y se va.
//
// Las naves se arman al empezar la partida y quedan escondidas: que aparezcan no traba nada.

/** Tamaño de una escolta al lado de la nave del juego (que mide 0,85). */
const ESCALA_ESCOLTA = 0.42;
const ENTRA = 0.9;
const SE_VA = 1.3;

type Fase = "fuera" | "entra" | "vuela" | "seVa";

/** Los que tienen la nariz en +x: vuelan con la nariz hacia adelante (al fondo), un poco abiertos. */
const CON_NARIZ: readonly ModeloNave[] = ["cigarro", "triangulo"];

export function crearEscoltas(kit: Kit) {
  const grupo = new THREE.Group();
  let modelo: ModeloNave | null = null;
  const escoltas: { nave: Nave; lado: 1 | -1; fase: Fase; desde: number; pos: THREE.Vector3; vel: THREE.Vector3; giro: number; vaiven: Vaiven }[] = [];
  const meta = new THREE.Vector3();
  const inicio = new THREE.Vector3();
  let escala = 1;

  const soltar = () => {
    for (const e of escoltas) {
      grupo.remove(e.nave.grupo);
      e.nave.liberar();
    }
    escoltas.length = 0;
    modelo = null;
  };

  /** Dónde va cada escolta: al costado, un poco abajo y adelante (no tapa a la nave). */
  const metaDe = (lado: 1 | -1, nave: THREE.Vector3, ancho: number) =>
    meta.set(nave.x + lado * (ancho + 1.7 * escala), nave.y - 0.35 * escala, nave.z + 0.5);

  return {
    obj: grupo,

    /** Arma las dos escoltas del modelo de la partida (si ya estaban de ese modelo, las deja). */
    preparar: (nuevo: ModeloNave) => {
      if (modelo === nuevo) return;
      soltar();
      modelo = nuevo;
      for (const lado of [-1, 1] as const) {
        const nave = crearNave(kit, nuevo);
        nave.grupo.visible = false;
        // Sin rayo: son cazas, no abducen.
        nave.rayo.visible = false;
        grupo.add(nave.grupo);
        escoltas.push({ nave, lado, fase: "fuera", desde: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), giro: 0, vaiven: { x: 0, y: 0, giroY: 0, giroZ: 0 } });
      }
    },

    /** true mientras alguna está entrando o volando con vos. */
    get volando() {
      return escoltas.some((e) => e.fase === "entra" || e.fase === "vuela");
    },

    sumar: (reloj: number) => {
      for (const e of escoltas) {
        if (e.fase === "entra" || e.fase === "vuela") continue;
        e.fase = "entra";
        e.desde = reloj;
        e.giro = 0;
      }
    },

    /** Chocaste: se van volando, cada una para su lado, dando vueltas. */
    echar: (reloj: number) => {
      for (const e of escoltas) {
        if (e.fase !== "entra" && e.fase !== "vuela") continue;
        e.fase = "seVa";
        e.desde = reloj;
        e.vel.set(e.lado * 9 * escala, 4 * escala, -5);
      }
    },

    /**
     * Si alguna escolta que vuela agarra algo que cruza en (x, y) con radio `radio`: devuelve dónde
     * está (para el cartelito), si no null.
     */
    agarra: (x: number, y: number, radio: number): THREE.Vector3 | null => {
      if (!modelo) return null;
      const alcance = MEDIDAS_NAVE[modelo].alcance * ESCALA_ESCOLTA * escala * 1.3;
      for (const e of escoltas) {
        if (e.fase !== "vuela") continue;
        if (Math.hypot(x - e.pos.x, y - e.pos.y) < alcance + radio) return e.pos;
      }
      return null;
    },

    /** `ancho`: medio ancho del choque de la nave (las escoltas se ponen afuera). */
    actualizar: (m: Musica, reloj: number, dt: number, nave: THREE.Vector3, escalaNave: number, ancho: number) => {
      escala = escalaNave;
      for (const e of escoltas) {
        const grupoNave = e.nave.grupo;
        if (e.fase === "fuera") {
          grupoNave.visible = false;
          continue;
        }
        grupoNave.visible = true;
        const k = (reloj - e.desde) / (e.fase === "entra" ? ENTRA : SE_VA);
        let tam = 1;
        metaDe(e.lado, nave, ancho);
        if (e.fase === "entra") {
          // Entran desde abajo y de afuera, como si vinieran de atrás de la cámara.
          inicio.set(meta.x + e.lado * 7 * escala, meta.y - 4 * escala, meta.z + 5);
          const s = suave(Math.min(1, k));
          e.pos.lerpVectors(inicio, meta, s);
          tam = suave(Math.min(1, k * 1.5));
          if (k >= 1) e.fase = "vuela";
        } else if (e.fase === "vuela") {
          // Siguen a la nave con un poco de retraso: se ven volar, no pegadas.
          e.pos.lerp(meta, Math.min(1, dt * 7));
        } else {
          e.vel.y += 6 * escala * dt;
          e.pos.addScaledVector(e.vel, dt);
          e.giro += e.lado * 9 * dt;
          tam = 1 - suave(Math.min(1, k));
          if (k >= 1) {
            e.fase = "fuera";
            grupoNave.visible = false;
            continue;
          }
        }

        const v = vaivenDe(e.nave.modelo, reloj, e.lado * 1.9, e.vaiven);
        const escalaEscolta = ESCALA_ESCOLTA * escala;
        grupoNave.position.set(e.pos.x + v.x * escalaEscolta, e.pos.y + v.y * escalaEscolta, e.pos.z);
        grupoNave.scale.setScalar(escalaEscolta * Math.max(tam, 1e-3));
        // Se inclinan hacia donde van (como la nodriza) y muestran un poco el techo.
        const inclina = THREE.MathUtils.clamp((meta.x - e.pos.x) * -0.25, -0.5, 0.5);
        const base = CON_NARIZ.includes(e.nave.modelo) ? Math.PI / 2 + e.lado * 0.35 : 0;
        grupoNave.rotation.set(0.18, base + v.giroY, v.giroZ + inclina + e.giro);
        e.nave.animar(m.reloj, m.espectro);
      }
    },

    ocultar: () => {
      for (const e of escoltas) {
        e.fase = "fuera";
        e.nave.grupo.visible = false;
      }
    },

    liberar: soltar,
  };
}

// ————————————————————————————— Drones del enjambre —————————————————————————————

const DRON_CHOCA = 0.12;
const DRON_SE_VA = 1.1;
/** Cuánto más grande que los drones de la ronda: estos son los guardianes, se tienen que distinguir. */
const ESCALA_DRON = 1.7;

type FaseDron = "listo" | "choca" | "seVa" | "fuera";

export function crearDrones(kit: Kit) {
  const grupo = new THREE.Group();
  const color = new THREE.Color(COLOR_NAVE.enjambre);
  // Propios (no del kit): el aro del enjambre vive en kit.tintes solo si ya hay un enjambre armado.
  const materialAro = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.03), emissive: color, emissiveIntensity: 1.2 });
  const materialLuz = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).lerp(color, 0.42) });
  const materialHalo = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide });
  const geometriaHalo = new THREE.SphereGeometry(1, 16, 12);
  const drones: { obj: THREE.Group; lado: 1 | -1; fase: FaseDron; desde: number; pos: THREE.Vector3; hacia: THREE.Vector3; vel: THREE.Vector3; giro: number }[] = [];
  const meta = new THREE.Vector3();
  let escala = 1;

  /** Los arma la primera vez con la geometría del dron del enjambre (kit.moldes). */
  const armar = () => {
    if (drones.length > 0) return;
    prepararFlota(kit, ["enjambre"]);
    const dron = kit.moldes.get("enjambre")?.dron;
    if (!dron) return;
    for (const lado of [-1, 1] as const) {
      const obj = new THREE.Group();
      const luz = new THREE.Mesh(kit.geo.luz, materialLuz);
      luz.position.y = 0.15;
      luz.scale.setScalar(1.6);
      const halo = new THREE.Mesh(geometriaHalo, materialHalo);
      halo.scale.setScalar(0.4);
      obj.add(new THREE.Mesh(dron.casco, kit.casco), new THREE.Mesh(dron.aro, materialAro), luz, halo);
      obj.visible = false;
      grupo.add(obj);
      drones.push({ obj, lado, fase: "fuera", desde: 0, pos: new THREE.Vector3(), hacia: new THREE.Vector3(), vel: new THREE.Vector3(), giro: 0 });
    }
  };

  // Afuera de la ronda de drones chicos del enjambre (que llega a ~1,6 del centro): no se mezclan.
  const metaDe = (lado: 1 | -1, nave: THREE.Vector3, ancho: number) => meta.set(nave.x + lado * (ancho + 1.45 * escala), nave.y - 0.1 * escala, nave.z + 0.6);

  return {
    obj: grupo,

    /** Los dos listos (al empezar una partida con el enjambre). */
    preparar: () => {
      armar();
      for (const d of drones) {
        d.fase = "listo";
        d.giro = 0;
        d.pos.set(NaN, 0, 0);
      }
    },

    get listos() {
      return drones.filter((d) => d.fase === "listo").length;
    },

    /** Un golpe en `donde`: el dron más cercano se interpone y se va. false si no queda ninguno. */
    usar: (donde: THREE.Vector3, reloj: number): boolean => {
      let elegido: (typeof drones)[number] | null = null;
      for (const d of drones) {
        if (d.fase !== "listo") continue;
        if (!elegido || d.pos.distanceToSquared(donde) < elegido.pos.distanceToSquared(donde)) elegido = d;
      }
      if (!elegido) return false;
      elegido.fase = "choca";
      elegido.desde = reloj;
      elegido.hacia.copy(donde);
      return true;
    },

    actualizar: (reloj: number, dt: number, nave: THREE.Vector3, escalaNave: number, ancho: number) => {
      escala = escalaNave;
      for (const d of drones) {
        if (d.fase === "fuera") {
          d.obj.visible = false;
          continue;
        }
        d.obj.visible = true;
        let tam = 1;
        if (d.fase === "listo") {
          metaDe(d.lado, nave, ancho);
          // Primer cuadro: arranca en su lugar (sin venir volando desde el centro).
          if (Number.isNaN(d.pos.x)) d.pos.copy(meta);
          d.pos.lerp(meta, Math.min(1, dt * 12));
          // Flotan alerta, con un vaivén chico desfasado entre los dos.
          d.obj.position.set(d.pos.x, d.pos.y + Math.sin(reloj * 3 + d.lado) * 0.12 * escala, d.pos.z);
          d.obj.rotation.set(0.25, reloj * 2.6, Math.sin(reloj * 1.7 + d.lado) * 0.15);
        } else if (d.fase === "choca") {
          // Se tira contra el meteorito.
          const k = Math.min(1, (reloj - d.desde) / DRON_CHOCA);
          d.obj.position.lerpVectors(d.pos, d.hacia, suave(k));
          if (k >= 1) {
            d.fase = "seVa";
            d.desde = reloj;
            d.pos.copy(d.hacia);
            d.vel.set(d.lado * 6 * escala, 3 * escala, -7);
          }
        } else {
          // Queda girando y se pierde para atrás.
          const k = (reloj - d.desde) / DRON_SE_VA;
          if (k >= 1) {
            d.fase = "fuera";
            d.obj.visible = false;
            continue;
          }
          d.vel.y -= 4 * escala * dt;
          d.pos.addScaledVector(d.vel, dt);
          d.giro += d.lado * 12 * dt;
          d.obj.position.copy(d.pos);
          d.obj.rotation.set(d.giro * 0.6, d.giro, d.giro * 0.3);
          tam = 1 - suave(k);
        }
        d.obj.scale.setScalar(ESCALA_DRON * escala * Math.max(tam, 1e-3));
      }
    },

    ocultar: () => {
      for (const d of drones) {
        d.fase = "fuera";
        d.obj.visible = false;
      }
    },

    liberar: () => {
      materialAro.dispose();
      materialLuz.dispose();
      materialHalo.dispose();
      geometriaHalo.dispose();
    },
  };
}
