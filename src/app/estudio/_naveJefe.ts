import * as THREE from "three";
import { MODELOS, type ModeloNave } from "@/lib/estudio-naves";
import type { Chispas } from "./_naveChispas";
import { crearNave, MEDIDAS_NAVE, prepararFlota, vaivenDe, type Nave, type Vaiven } from "./_naveFlota";
import { azar, elegir, mitadVisible, suave, type Kit } from "./_naveKit";
import type { Musica } from "./_naveShow";

// El jefe del drop: una nave grande y roja (de la flota del tema) entra desde el fondo, se planta
// arriba y tira meteoritos en patrones al ritmo de los bombos. A los ~12 s se va sola. Con láser se
// le pega: si se le acaba la vida, explota en chispas (sin flash) y se va el premio grande.
//
// Este archivo dibuja y mueve al jefe y dice dónde caen sus patrones; los meteoritos que tira son
// los del juego (mismo pool, mismo choque), así se esquivan igual que los demás.

export const ROJO_JEFE = 0xff3b3b;
/** Donde se planta: más cerca que donde nacen los meteoritos, y bien lejos de la nave. */
export const Z_JEFE = -26;
const Z_ENTRA = -95;
const ENTRA = 2.4;
const PELEA = 12;
const SE_VA = 2;
const EXPLOTA = 1.2;
/** Después de la primera, dos tandas más de chispas en otros puntos del casco (s desde que explota). */
const TANDAS_EXPLOSION = [0.3, 0.6] as const;
/** Tamaño en la compu (en el celu, con la escala de la nave). Normalizado por el alcance de cada modelo. */
const ESCALA = 5;
const ALCANCE_TIPO = 1.65;

export type FaseJefe = "fuera" | "entra" | "pelea" | "seVa" | "explota";
export type Campo = { x: number; abajo: number; arriba: number };
export type Objetivo = { x: number; y: number };

/** Los que tienen la nariz en +x: el jefe los apunta hacia vos. */
const CON_NARIZ: readonly ModeloNave[] = ["cigarro", "triangulo"];

const NARANJA = new THREE.Color(0xff8a4a);
const AMARILLO = new THREE.Color(0xffd27a);

/**
 * Dónde cruzan el plano de la nave los meteoritos del disparo número `n`. Rotan cuatro patrones y
 * todos dejan salida: la fila se esquiva subiendo o bajando (o por su hueco), la columna yendo de
 * costado, el anillo quedándose quieto en el medio y la diagonal saliendo para cualquier lado.
 * Devuelve cuántos puso en `salida`.
 */
export function patronJefe(n: number, nave: THREE.Vector3, campo: Campo, escala: number, salida: Objetivo[]): number {
  let k = 0;
  // Lo que cae afuera del campo no se tira (achicarlo al borde podría tapar la salida).
  const poner = (x: number, y: number) => {
    if (k >= salida.length || Math.abs(x) > campo.x || y < campo.abajo || y > campo.arriba) return;
    salida[k].x = x;
    salida[k].y = y;
    k++;
  };
  switch (n % 4) {
    case 0: {
      // Fila a tu altura con un hueco cerca tuyo.
      const paso = 2.3 * escala;
      const hueco = nave.x + azar(-1.5, 1.5) * escala;
      const y = nave.y + azar(-0.3, 0.3) * escala;
      for (let x = -campo.x; x <= campo.x; x += paso) if (Math.abs(x - hueco) > paso * 0.95) poner(x, y);
      break;
    }
    case 1: {
      // Anillo alrededor tuyo: el medio es seguro.
      const r = 3.4 * escala;
      const giro = azar(0, Math.PI * 2);
      for (let i = 0; i < 6; i++) poner(nave.x + Math.cos(giro + (i * Math.PI) / 3) * r, nave.y + Math.sin(giro + (i * Math.PI) / 3) * r);
      break;
    }
    case 2: {
      // Columna en tu x: correrse de costado.
      const paso = 2.1 * escala;
      const x = nave.x + azar(-0.3, 0.3) * escala;
      for (let y = campo.abajo; y <= campo.arriba; y += paso) poner(x, y);
      break;
    }
    default: {
      // Diagonal que pasa por vos.
      const dx = 1.5 * escala * (Math.random() < 0.5 ? 1 : -1);
      const dy = 1.1 * escala;
      for (let i = -2; i <= 2; i++) poner(nave.x + dx * i, nave.y + dy * i);
    }
  }
  return k;
}

export type Jefe = ReturnType<typeof crearJefe>;

export function crearJefe(kit: Kit, chispas: Chispas) {
  const grupo = new THREE.Group();
  let nave: Nave | null = null;
  let evitar: ModeloNave | null = null;
  let fase: FaseJefe = "fuera";
  let desde = 0;
  let vida = 1;
  let sacudida = 0;
  let escala = 1;
  let escalaNave = 1;
  let ultimoHumo = 0;
  let semilla = 0;
  // La pelea, en la compu: de dónde a dónde va y a qué altura.
  let centroX = 0;
  let ampX = 1;
  let altura = 1;
  const pos = new THREE.Vector3();
  const desdePos = new THREE.Vector3();
  const vaiven: Vaiven = { x: 0, y: 0, giroY: 0, giroZ: 0 };
  const tmp = new THREE.Vector3();

  const elegirModelo = (): ModeloNave => {
    const flota = evitar ? kit.flota.filter((m) => m !== evitar) : kit.flota;
    if (flota.length > 0) return elegir(flota);
    return elegir(MODELOS.filter((m) => m !== evitar));
  };

  /** Arma la próxima nave del jefe (escondida): así el drop no tiene que armar nada. */
  const armar = () => {
    if (nave) return;
    const modelo = elegirModelo();
    prepararFlota(kit, [modelo]);
    nave = crearNave(kit, modelo, { color: ROJO_JEFE, piloto: false });
    nave.grupo.visible = false;
    nave.matRayo.uniforms.uColor.value.set(ROJO_JEFE);
    grupo.add(nave.grupo);
  };

  const soltar = () => {
    if (!nave) return;
    grupo.remove(nave.grupo);
    nave.liberar();
    nave = null;
  };

  /** Se terminó: suelta la nave y deja armada la próxima (que puede ser de otro modelo). */
  const terminar = () => {
    fase = "fuera";
    soltar();
    armar();
  };

  /** Escala total del modelo: todos los jefes miden más o menos lo mismo. */
  const escalaDe = (n: Nave) => ESCALA * escalaNave * (ALCANCE_TIPO / MEDIDAS_NAVE[n.modelo].alcance);

  /** Dónde está en la pelea, a los `t` segundos de pelear. */
  const enPelea = (t: number, salida: THREE.Vector3) =>
    salida.set(centroX + Math.sin(t * 0.42 + semilla) * ampX, altura + Math.sin(t * 0.8 + semilla * 1.7) * 0.7 * escalaNave, Z_JEFE);

  return {
    obj: grupo,
    get fase() {
      return fase;
    },
    get vida() {
      return vida;
    },
    /** Entrando o peleando: mientras, no hay lluvia ni meteoritos sueltos (no se mezclan con los suyos). */
    get presente() {
      return fase === "entra" || fase === "pelea";
    },
    get peleando() {
      return fase === "pelea";
    },
    /** Dónde está ahora (para el cartelito del premio). */
    get posicion() {
      return pos;
    },

    /** Deja armada la nave del próximo jefe, de un modelo distinto del tuyo si se puede. */
    preparar: (modeloJugador: ModeloNave) => {
      if (evitar !== modeloJugador && nave?.modelo === modeloJugador) soltar();
      evitar = modeloJugador;
      armar();
    },

    aparecer: (reloj: number, escalaDeLaNave: number, aspecto: number) => {
      armar();
      if (!nave) return;
      escalaNave = escalaDeLaNave;
      escala = escalaDe(nave);
      const m = mitadVisible(Z_JEFE, aspecto);
      ampX = m.x * 0.38;
      centroX = azar(-0.15, 0.15) * m.x;
      altura = 0.6 + m.y * 0.4;
      semilla = azar(0, Math.PI * 2);
      vida = 1;
      sacudida = 0;
      fase = "entra";
      desde = reloj;
      nave.grupo.visible = true;
      // Entra desde arriba y de un costado, desde el fondo.
      desdePos.set(centroX + azar(-1, 1) * m.x * 0.5, altura + m.y * 0.6, Z_ENTRA);
      pos.copy(desdePos);
      nave.grupo.position.copy(pos);
      nave.grupo.scale.setScalar(escala);
    },

    /** Por dónde salen sus meteoritos: la panza (de donde sale el rayo), un poco adelante. */
    boca: (salida: THREE.Vector3) => {
      const bajo = nave ? MEDIDAS_NAVE[nave.modelo].bajo : -0.34;
      return salida.set(pos.x, pos.y + bajo * escala * 0.8, pos.z + 1.2 * escala * 0.3);
    },

    /** Un punto del casco para apuntarle el láser. */
    blanco: (salida: THREE.Vector3) => {
      const radio = nave ? MEDIDAS_NAVE[nave.modelo].radio * escala : 1;
      return salida.set(pos.x + azar(-0.45, 0.45) * radio, pos.y + azar(-0.15, 0.2) * radio, pos.z + radio * 0.3);
    },

    /** Le pegó el láser en `punto`. Devuelve true si lo rompió (arranca la explosión). */
    golpear: (dano: number, punto: THREE.Vector3, reloj: number): boolean => {
      if (fase !== "pelea" && fase !== "entra") return false;
      vida = Math.max(0, vida - dano);
      sacudida = 1;
      chispas.explotar(punto, { cantidad: 14, color: NARANJA, velocidad: 6 * escalaNave, dura: 0.6, tam: 0.9 * escalaNave, radio: 0.2, blanco: 0.6 });
      if (vida > 0) return false;
      fase = "explota";
      desde = reloj;
      desdePos.copy(pos);
      // La primera tanda de chispas: repartidas en el casco, no en un punto (sin fogonazo).
      const radio = nave ? MEDIDAS_NAVE[nave.modelo].radio * escala : 2;
      chispas.explotar(pos, { cantidad: 70, color: NARANJA, velocidad: 9 * escalaNave, dura: 1.4, tam: 1.3 * escalaNave, radio: radio * 0.6, blanco: 0.35 });
      return true;
    },

    /** Se va ya (perdiste mientras estaba). */
    retirar: (reloj: number) => {
      if (fase !== "entra" && fase !== "pelea") return;
      fase = "seVa";
      desde = reloj;
      desdePos.copy(pos);
    },

    /** `objetivo`: la nave del juego (los que tienen nariz la apuntan). */
    actualizar: (m: Musica, reloj: number, dt: number, objetivo: THREE.Vector3) => {
      if (fase === "fuera" || !nave) return;
      const g = nave.grupo;
      const t = reloj - desde;
      sacudida *= Math.exp(-dt * 7);

      if (fase === "entra") {
        const k = Math.min(1, t / ENTRA);
        // Llega frenando: sale de la niebla del fondo y se planta donde arranca la pelea.
        const s = 1 - (1 - k) * (1 - k) * (1 - k);
        pos.lerpVectors(desdePos, enPelea(0, tmp), s);
        if (k >= 1) {
          fase = "pelea";
          desde = reloj;
        }
      } else if (fase === "pelea") {
        enPelea(t, pos);
        if (t >= PELEA) {
          fase = "seVa";
          desde = reloj;
          desdePos.copy(pos);
        }
      } else if (fase === "seVa") {
        // Acelera para arriba y al fondo.
        const k = Math.min(1, t / SE_VA);
        pos.set(desdePos.x, desdePos.y + 16 * escalaNave * k * k, desdePos.z - 60 * k * k);
        if (k >= 1) {
          terminar();
          return;
        }
      } else {
        // Explota: gira cada vez más rápido, cae un poco y se achica; dos tandas más de chispas.
        const k = Math.min(1, t / EXPLOTA);
        pos.set(desdePos.x, desdePos.y - 2.5 * escalaNave * k * k, desdePos.z);
        const radio = MEDIDAS_NAVE[nave.modelo].radio * escala;
        for (const cuando of TANDAS_EXPLOSION) {
          if (t - dt < cuando && t >= cuando) {
            tmp.set(pos.x + azar(-0.6, 0.6) * radio, pos.y + azar(-0.2, 0.3) * radio, pos.z);
            chispas.explotar(tmp, { cantidad: 40, color: cuando < 0.5 ? AMARILLO : NARANJA, velocidad: 7 * escalaNave, dura: 1.1, tam: 1.1 * escalaNave, radio: radio * 0.3, blanco: 0.3 });
          }
        }
        if (k >= 1) {
          terminar();
          return;
        }
      }

      const v = vaivenDe(nave.modelo, reloj, semilla, vaiven);
      g.position.set(
        pos.x + v.x * escala + (Math.random() - 0.5) * sacudida * 0.5 * escalaNave,
        pos.y + v.y * escala + (Math.random() - 0.5) * sacudida * 0.5 * escalaNave,
        pos.z
      );
      let tam = escala;
      let giroExtra = 0;
      if (fase === "explota") {
        const k = Math.min(1, t / EXPLOTA);
        tam = escala * (1 - suave(k));
        giroExtra = k * k * 9;
      }
      g.scale.setScalar(Math.max(tam, 1e-3));
      if (CON_NARIZ.includes(nave.modelo)) {
        // La nariz te apunta (y baja un poco hacia vos).
        const yaw = Math.atan2(-(objetivo.z - g.position.z), objetivo.x - g.position.x);
        g.rotation.set(0, yaw + giroExtra, -0.22 + v.giroZ * 0.5);
      } else {
        g.rotation.set(0.12, v.giroY + giroExtra, v.giroZ);
      }
      nave.animar(m.reloj, m.espectro);
      // El rayo de la panza apenas prendido (sigue al brillo, lento): avisa de dónde salen.
      nave.matRayo.uniforms.uOpacidad.value = fase === "pelea" || fase === "entra" ? 0.05 + m.brillo * 0.08 : 0;

      // Herido: le salen chispitas sueltas del casco.
      if (vida < 0.5 && fase === "pelea" && reloj - ultimoHumo > 0.12) {
        ultimoHumo = reloj;
        const radio = MEDIDAS_NAVE[nave.modelo].radio * escala;
        tmp.set(pos.x + azar(-0.5, 0.5) * radio, pos.y + azar(-0.1, 0.2) * radio, pos.z + radio * 0.2);
        chispas.explotar(tmp, { cantidad: 2, color: NARANJA, velocidad: 2 * escalaNave, dura: 0.7, tam: 0.8 * escalaNave, radio: 0.1 });
      }
    },

    ocultar: () => {
      if (fase !== "fuera") terminar();
    },

    liberar: soltar,
  };
}
