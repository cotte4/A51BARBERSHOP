import * as THREE from "three";
import { azar, type Actor } from "./_naveKit";

// Lo que hace el dedo (o el mouse) con los actores sueltos: empujarlos, patearlos y que reaccionen.
// Cada actor sigue su recorrido (`mover`) y encima se le suma un desvío con resorte: lo empujás, se
// corre, y de a poco vuelve a su camino. La pelota es la excepción: al tocarla pasa a física de
// verdad (gravedad, paredes) y hay que hacerle jueguitos para que no se caiga.
//
// Orden por cuadro en _Nave.tsx: quitar() → actor.mover() → aplicar(). Quitar saca lo que se sumó
// el cuadro anterior, así funciona igual con actores que se ubican de cero en cada cuadro y con los
// que no.

const GRAVEDAD = 15;
/** Resorte flojo y bastante freno: el empujón se nota, pero vuelve a su camino sin rebotar. */
const RESORTE = 1.6;
const FRENO = 2.4;
const FRENO_GIRO = 1.4;
/** Velocidad del pique hacia arriba en cada toque de la pelota. */
const PIQUE = 9.5;

type Estado = {
  desvio: THREE.Vector3;
  vel: THREE.Vector3;
  giro: THREE.Vector3;
  velGiro: THREE.Vector3;
  /** Lo que se le sumó en el último aplicar (para sacarlo antes del próximo mover). */
  sumado: THREE.Vector3;
  sumadoGiro: THREE.Vector3;
  /** La pelota en física: la posición es propia, ya no sigue su parábola. */
  libre: boolean;
  pos: THREE.Vector3;
  toques: number;
};

/** Paredes de la pelota en física: medio ancho visible a su profundidad, el techo y el piso de la pantalla. */
export type Limites = { x: number; arriba: number; abajo: number };

const tmp = new THREE.Vector3();

export function crearToques() {
  const estados = new WeakMap<Actor, Estado>();

  const estadoDe = (actor: Actor): Estado => {
    let e = estados.get(actor);
    if (!e) {
      e = {
        desvio: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        giro: new THREE.Vector3(),
        velGiro: new THREE.Vector3(),
        sumado: new THREE.Vector3(),
        sumadoGiro: new THREE.Vector3(),
        libre: false,
        pos: new THREE.Vector3(),
        toques: 0,
      };
      estados.set(actor, e);
    }
    return e;
  };

  return {
    /** Saca lo sumado el cuadro anterior. Va antes de `actor.mover`. */
    quitar: (actor: Actor) => {
      const e = estados.get(actor);
      if (!e) return;
      actor.obj.position.sub(e.sumado);
      actor.obj.rotation.x -= e.sumadoGiro.x;
      actor.obj.rotation.y -= e.sumadoGiro.y;
      actor.obj.rotation.z -= e.sumadoGiro.z;
    },

    /** Suma el desvío y el giro de este cuadro. Va después de `actor.mover`. */
    aplicar: (actor: Actor, dt: number, limites: (z: number) => Limites) => {
      const e = estados.get(actor);
      if (!e) return;
      if (e.libre) {
        e.vel.y -= GRAVEDAD * dt;
        e.pos.addScaledVector(e.vel, dt);
        const { x, arriba, abajo } = limites(e.pos.z);
        if (Math.abs(e.pos.x) > x) {
          e.pos.x = Math.sign(e.pos.x) * x;
          e.vel.x *= -0.7;
        }
        // Techo blando: un toque fuerte no la saca de la pantalla, rebota y vuelve a bajar.
        if (e.pos.y > arriba) {
          e.pos.y = arriba;
          e.vel.y = -Math.abs(e.vel.y) * 0.35;
        }
        // Se cayó por abajo: se va (la vida en 0 hace que _Nave la saque).
        if (e.pos.y < abajo) actor.vida = 1e-6;
        // La parábola de mover no cuenta más: la posición es la de la física.
        e.sumado.subVectors(e.pos, actor.obj.position);
        actor.obj.position.copy(e.pos);
      } else {
        e.vel.addScaledVector(e.desvio, -RESORTE * dt);
        e.vel.multiplyScalar(Math.exp(-FRENO * dt));
        e.desvio.addScaledVector(e.vel, dt);
        e.sumado.copy(e.desvio);
        actor.obj.position.add(e.desvio);
      }
      e.velGiro.multiplyScalar(Math.exp(-FRENO_GIRO * dt));
      e.giro.addScaledVector(e.velGiro, dt);
      e.sumadoGiro.copy(e.giro);
      actor.obj.rotation.x += e.giro.x;
      actor.obj.rotation.y += e.giro.y;
      actor.obj.rotation.z += e.giro.z;
    },

    /** Un empujón suave (mouse que pasa cerca, dedo que barre, la ondita de un toque en el vacío). */
    empujar: (actor: Actor, fuerza: THREE.Vector3) => {
      estadoDe(actor).vel.add(fuerza);
    },

    /**
     * Tocaron al actor en `punto` (mundo). Cada clase reacciona a su manera. Devuelve un texto para
     * mostrar al lado (los toques de la pelota, el muu de la vaca) o null.
     */
    tocar: (actor: Actor, punto: THREE.Vector3, t: number): string | null => {
      const e = estadoDe(actor);
      // Para dónde sale despedido: lejos del dedo, en el plano de la pantalla.
      const lejos = tmp.subVectors(actor.obj.position, punto).setZ(0);
      if (lejos.lengthSq() < 1e-4) lejos.set(azar(-1, 1), 1, 0);
      lejos.normalize();
      actor.reaccionar?.(t);

      switch (actor.clase) {
        case "pelota": {
          if (!e.libre) {
            e.libre = true;
            e.pos.copy(actor.obj.position);
            e.vel.set(0, 0, 0);
            e.desvio.set(0, 0, 0);
            // Mientras la sigan pateando no se va.
            actor.vida = Number.MAX_VALUE;
          }
          e.toques++;
          // Como un jueguito: el pie le pega abajo y sale para arriba, corrida al lado contrario del toque.
          e.vel.set(lejos.x * 3.2 + azar(-0.5, 0.5), PIQUE + azar(0, 1.5), 0);
          e.velGiro.set(azar(-9, 9), azar(-9, 9), azar(-5, 5));
          return e.toques > 1 ? String(e.toques) : null;
        }
        case "alien":
          // Salta de contento y da una vuelta (los brazos los levanta él, en reaccionar).
          e.vel.y += 4.5;
          e.vel.addScaledVector(lejos, 1.2);
          e.velGiro.y += (Math.random() < 0.5 ? -1 : 1) * 8;
          return null;
        case "ovni":
          // Tirabuzón y se corre del dedo.
          e.vel.addScaledVector(lejos, 3.5);
          e.vel.y += 1.5;
          e.velGiro.z += (lejos.x < 0 ? 1 : -1) * 14;
          return null;
        case "planeta":
          e.vel.addScaledVector(lejos, 1.6);
          e.velGiro.y += 5;
          return null;
        case "vaca":
          e.vel.addScaledVector(lejos, 2);
          e.velGiro.set(azar(-4, 4), 10, azar(-4, 4));
          return "¡Muu!";
        case "efecto":
          return null;
        default:
          e.vel.addScaledVector(lejos, 2.5);
          e.velGiro.set(azar(-3, 3), 7, azar(-3, 3));
          return null;
      }
    },

    /** Cuántos toques lleva la pelota en el aire (0 si no está en física). */
    toques: (actor: Actor) => {
      const e = estados.get(actor);
      return e?.libre ? e.toques : 0;
    },
  };
}

export type Toques = ReturnType<typeof crearToques>;

const ONDITAS = 4;
const VIDA_ONDITA = 0.7;

/**
 * La ondita de un toque en el vacío: un aro chico que se abre bajo el dedo y se apaga. Entra en
 * 60 ms y nunca pasa de 0,4 de opacidad: es una respuesta al dedo, no un destello.
 */
export function crearOnditas(geometria: THREE.BufferGeometry) {
  const grupo = new THREE.Group();
  const pool = Array.from({ length: ONDITAS }, () => {
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const malla = new THREE.Mesh(geometria, material);
    malla.visible = false;
    grupo.add(malla);
    return { malla, material, desde: -10 };
  });
  let siguiente = 0;

  return {
    obj: grupo,
    lanzar: (donde: THREE.Vector3, color: THREE.Color, t: number) => {
      const o = pool[siguiente];
      siguiente = (siguiente + 1) % ONDITAS;
      o.malla.position.copy(donde);
      o.material.color.copy(color);
      o.desde = t;
      o.malla.visible = true;
    },
    actualizar: (t: number) => {
      for (const o of pool) {
        if (!o.malla.visible) continue;
        const p = (t - o.desde) / VIDA_ONDITA;
        if (p >= 1 || p < 0) {
          o.malla.visible = false;
          continue;
        }
        o.malla.scale.setScalar(0.25 + (1 - (1 - p) * (1 - p)) * 1.6);
        o.material.opacity = 0.4 * Math.min(1, p / 0.08) * (1 - p);
      }
    },
    liberar: () => pool.forEach((o) => o.material.dispose()),
  };
}
