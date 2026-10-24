import * as THREE from "three";
import { azar, mitadVisible, suave } from "./_naveKit";
import { conBorde, type ColorCompartido } from "./_naveMateriales";
import type { ControlNodriza, Musica } from "./_naveShow";

// El jueguito: la nodriza se achica, la manejás con el dedo o el mouse y esquivás los meteoritos
// que vienen del fondo al ritmo del tema (nacen en los bombos; en el drop, una lluvia con un hueco).
// Cada meteorito esquivado suma, pasar raspando suma uno más, los cristales suman cinco y la racha
// multiplica. La racha también llama más meteoritos: cuanto mejor vas, más denso se pone (y un
// choque la corta, así que se equilibra solo). Tres choques y se termina.
//
// Fotosensibilidad: el choque no titila. La nave queda con un escudo tenue que se apaga de a poco,
// y los meteoritos se achican antes de llegar a la cámara (nunca tapan la pantalla de golpe).

export type EstadoJuego = {
  puntos: number;
  vidas: number;
  multiplicador: number;
  /** Esquivados seguidos sin chocar. */
  racha: number;
  record: number;
  /** Se perdió la última vida: queda el cartel del final. */
  termino: boolean;
  recordNuevo: boolean;
};

export type EventosJuego = {
  alCambiar: (estado: EstadoJuego) => void;
  /** Un meteorito le pegó a la nave (para chispas, sacudida y que la nave gire). `donde` se reusa: copiarlo. */
  alChocar: (donde: THREE.Vector3) => void;
  /** Un cartelito que sale donde pasó algo: "+5", "¡Cerca!". */
  alSumar: (texto: string, donde: THREE.Vector3) => void;
};

const VIDAS = 3;
const METEORITOS = 44;
const ORBES = 6;
/** Radio del cristal en la compu (en el celu, más chico con la nave). */
const RADIO_ORBE = 0.6;
/** Cada tantos esquivados sin chocar, un meteorito más por bombo (hasta EXTRAS_MAX). */
const RACHA_POR_EXTRA = 10;
const EXTRAS_MAX = 3;
const Z_NACE = -64;
/** Desde acá hasta Z_SE_VA se achican: pasan al lado de la cámara sin taparla. */
const Z_ACHICA = -1;
const Z_SE_VA = 4;
const INVULNERABLE = 1.6;
/** Los primeros segundos no viene nada: da tiempo a leer la consigna y agarrar la nave. */
const CALMA_INICIAL = 2.5;
/** La racha sube el multiplicador cada tantos esquivados, hasta ×4. */
const RACHA_POR_NIVEL = 8;
const MULTIPLICADOR_MAX = 4;
const CLAVE_RECORD = "estudio:recordNave";
/** Radio de la nave del juego en la compu: los meteoritos se miden contra esto (en el celu, más chicos). */
const RADIO_NAVE_COMPU = 1.62 * 1.7 * 0.5;

function leerRecord(): number {
  try {
    return Number(localStorage.getItem(CLAVE_RECORD)) || 0;
  } catch {
    return 0;
  }
}

function guardarRecord(puntos: number) {
  try {
    localStorage.setItem(CLAVE_RECORD, String(puntos));
  } catch {
    // Navegación privada: el récord dura lo que dura la página.
  }
}

/** Ruido barato y determinístico: el mismo punto da siempre el mismo valor (las caras quedan cerradas). */
function ruido(x: number, y: number, z: number) {
  return Math.sin(x * 3.1 + y * 1.7) * 0.5 + Math.sin(y * 4.3 - z * 2.9) * 0.3 + Math.sin(z * 5.7 + x * 2.3) * 0.2;
}

/**
 * Roca de facetas: un icosaedro abollado. Sombreado plano: se lee como piedra, no como pelota. Las
 * caras hundidas quedan como brasa (color por vértice que multiplica el brillo propio): así se ve
 * desde lejos contra el fondo oscuro.
 */
function crearGeometriaRoca(): THREE.BufferGeometry {
  const geometria = new THREE.IcosahedronGeometry(1, 2);
  const pos = geometria.getAttribute("position");
  const brasa = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = ruido(v.x, v.y, v.z);
    v.multiplyScalar(1 + r * 0.22);
    pos.setXYZ(i, v.x, v.y, v.z * 0.85);
    brasa.fill(THREE.MathUtils.clamp(-r * 1.6, 0, 1), i * 3, i * 3 + 3);
  }
  geometria.setAttribute("color", new THREE.BufferAttribute(brasa, 3));
  geometria.computeVertexNormals();
  return geometria;
}

type Roca = { activa: boolean; pos: THREE.Vector3; radio: number; vel: number; giro: THREE.Euler; velGiro: THREE.Vector3; paso: boolean };
type Orbe = { activo: boolean; pos: THREE.Vector3; vel: number; paso: boolean; fase: number };

export function crearJuego(eventos: EventosJuego) {
  const grupo = new THREE.Group();

  const peligro: ColorCompartido = { value: new THREE.Color() };
  const geometriaRoca = crearGeometriaRoca();
  const materialRoca = conBorde(
    new THREE.MeshStandardMaterial({ color: 0x5a524c, roughness: 0.9, metalness: 0.08, flatShading: true, emissive: 0xffffff, emissiveIntensity: 0.9 }),
    peligro,
    1.8,
    1.6
  );
  // El color por vértice no tiñe la piedra: dice dónde va la brasa, que se pinta sobre el brillo propio
  // con el color de peligro (el mismo uniform del borde).
  materialRoca.vertexColors = true;
  const conBordeRoca = materialRoca.onBeforeCompile;
  materialRoca.onBeforeCompile = (shader, renderer) => {
    conBordeRoca(shader, renderer);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <color_fragment>", "vec3 brasa = vColor.rgb;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n totalEmissiveRadiance *= uColorBorde * brasa;");
  };
  // Programa propio: si no, three lo compartiría con otros materiales con el mismo borde.
  materialRoca.customProgramCacheKey = () => "roca-brasa";
  const rocas = new THREE.InstancedMesh(geometriaRoca, materialRoca, METEORITOS);
  // Halo del color de peligro: separa la piedra oscura del fondo oscuro.
  const geometriaHalo = new THREE.SphereGeometry(1.3, 20, 14);
  // Sin niebla: el halo se ve desde que nace, y avisa que algo viene aunque la piedra todavía no se lea.
  const materialHalo = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, fog: false });
  const halos = new THREE.InstancedMesh(geometriaHalo, materialHalo, METEORITOS);
  // Marca en el plano de la nave: dónde va a cruzar cada meteorito. Aparece a medida que se acerca.
  const geometriaMarca = new THREE.RingGeometry(0.86, 1, 48);
  const materialMarca = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const marcas = new THREE.InstancedMesh(geometriaMarca, materialMarca, METEORITOS);
  marcas.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(METEORITOS * 3), 3);

  // El cristal que suma: un octaedro estirado (no se confunde con una piedra) con un aro que gira,
  // del color del tema y sin niebla para que se vea venir desde el fondo. Su marca en el plano de la
  // nave es del mismo color: dice adónde ir, como la de los meteoritos dice de dónde salir.
  const geometriaOrbe = new THREE.OctahedronGeometry(0.5, 0);
  geometriaOrbe.scale(1, 1.35, 1);
  const materialOrbe = new THREE.MeshBasicMaterial({ fog: false });
  const orbes = new THREE.InstancedMesh(geometriaOrbe, materialOrbe, ORBES);
  const materialHaloOrbe = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, fog: false });
  const halosOrbe = new THREE.InstancedMesh(geometriaHalo, materialHaloOrbe, ORBES);
  const geometriaAro = new THREE.TorusGeometry(0.85, 0.045, 8, 48);
  const materialAro = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const aros = new THREE.InstancedMesh(geometriaAro, materialAro, ORBES);
  const marcasOrbe = new THREE.InstancedMesh(geometriaMarca, materialMarca, ORBES);
  marcasOrbe.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ORBES * 3), 3);

  const escudo = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 20),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  escudo.visible = false;

  const mallas = [rocas, halos, marcas, orbes, halosOrbe, aros, marcasOrbe];
  mallas.forEach((malla) => {
    malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    malla.frustumCulled = false;
    malla.count = 0;
  });
  grupo.add(...mallas, escudo);
  grupo.visible = false;

  const pool: Roca[] = Array.from({ length: METEORITOS }, () => ({
    activa: false,
    pos: new THREE.Vector3(),
    radio: 1,
    vel: 0,
    giro: new THREE.Euler(),
    velGiro: new THREE.Vector3(),
    paso: false,
  }));
  const poolOrbes: Orbe[] = Array.from({ length: ORBES }, () => ({ activo: false, pos: new THREE.Vector3(), vel: 0, paso: false, fase: 0 }));

  const estado: EstadoJuego = { puntos: 0, vidas: VIDAS, multiplicador: 1, racha: 0, record: 0, termino: false, recordNuevo: false };
  let activo = false;
  let jugado = 0;
  let invulnerableHasta = -Infinity;
  let reloj = 0;
  let aspecto = 1;
  let escalaNave = 1;
  const nave = new THREE.Vector3();
  const tmp = new THREE.Object3D();
  const donde = new THREE.Vector3();
  const tmpColor = new THREE.Color();

  const avisar = () => eventos.alCambiar({ ...estado });

  /** Lo que se ve del plano de la nave, con margen: ahí nacen los meteoritos. */
  const campo = () => {
    const m = mitadVisible(nave.z, aspecto);
    return { x: m.x * 0.85, abajo: -m.y * 0.6, arriba: m.y * 0.75 };
  };

  const lanzar = (x: number, y: number, m: Musica) => {
    const roca = pool.find((r) => !r.activa);
    if (!roca) return;
    roca.activa = true;
    roca.paso = false;
    // En el celu todo es más chico: la escala acompaña a la de la nave.
    roca.radio = azar(0.55, 1.05) * escalaNave;
    roca.pos.set(x, y, Z_NACE);
    // Más rápido cuanto más fuerte suena, cuanto más dura la partida y cuanto más larga la racha.
    roca.vel = 18 + m.energia * 12 + Math.min(jugado, 90) * 0.12 + Math.min(estado.racha, 40) * 0.08;
    roca.giro.set(azar(0, 6), azar(0, 6), azar(0, 6));
    roca.velGiro.set(azar(-2, 2), azar(-2, 2), azar(-2, 2));
  };

  const lanzarCerca = (m: Musica, apuntar: boolean) => {
    const c = campo();
    // Apuntado no es exacto: quedarse quieto no garantiza el choque, pero tampoco salva.
    const error = 1.7 * escalaNave;
    if (apuntar) lanzar(THREE.MathUtils.clamp(nave.x + azar(-error, error), -c.x, c.x), THREE.MathUtils.clamp(nave.y + azar(-error, error), c.abajo, c.arriba), m);
    else lanzar(azar(-c.x, c.x), azar(c.abajo, c.arriba), m);
  };

  /** Meteoritos de más por bombo según la racha. */
  const extras = () => Math.min(EXTRAS_MAX, Math.floor(estado.racha / RACHA_POR_EXTRA));

  /** Un cristal en (x, y) del plano de la nave. Más lento que las piedras: da tiempo a ir a buscarlo. */
  const lanzarOrbe = (x: number, y: number) => {
    const orbe = poolOrbes.find((o) => !o.activo);
    if (!orbe) return;
    orbe.activo = true;
    orbe.paso = false;
    orbe.fase = azar(0, Math.PI * 2);
    orbe.pos.set(x, y, Z_NACE);
    orbe.vel = 16;
  };

  const lanzarOrbeSuelto = () => {
    const c = campo();
    lanzarOrbe(azar(-c.x, c.x) * 0.85, azar(c.abajo, c.arriba) * 0.85);
  };

  const chocar = (roca: Roca) => {
    roca.activa = false;
    estado.racha = 0;
    estado.multiplicador = 1;
    estado.vidas--;
    invulnerableHasta = reloj + INVULNERABLE;
    eventos.alChocar(donde.copy(nave));
    if (estado.vidas <= 0) {
      estado.termino = true;
      if (estado.puntos > estado.record) {
        estado.record = estado.puntos;
        estado.recordNuevo = true;
        guardarRecord(estado.puntos);
      }
    }
    avisar();
  };

  const esquivar = (roca: Roca, distancia: number, radioNave: number) => {
    const extrasAntes = extras();
    estado.racha++;
    estado.multiplicador = Math.min(MULTIPLICADOR_MAX, 1 + Math.floor(estado.racha / RACHA_POR_NIVEL));
    estado.puntos += estado.multiplicador;
    if (distancia < (roca.radio + radioNave) * 1.5) {
      estado.puntos += estado.multiplicador;
      eventos.alSumar("¡Cerca!", donde.copy(roca.pos).setZ(nave.z));
    }
    // Avisa cuando la racha llama más meteoritos: que se entienda por qué se puso denso.
    if (extras() > extrasAntes) eventos.alSumar(`¡Racha ${estado.racha}!`, donde.copy(nave));
    avisar();
  };

  const ocultarTodo = () => {
    pool.forEach((r) => (r.activa = false));
    poolOrbes.forEach((o) => (o.activo = false));
    mallas.forEach((malla) => (malla.count = 0));
  };

  return {
    obj: grupo,
    get activo() {
      return activo;
    },
    get termino() {
      return estado.termino;
    },

    empezar: () => {
      ocultarTodo();
      activo = true;
      jugado = 0;
      invulnerableHasta = -Infinity;
      Object.assign(estado, { puntos: 0, vidas: VIDAS, multiplicador: 1, racha: 0, record: leerRecord(), termino: false, recordNuevo: false });
      grupo.visible = true;
      avisar();
    },

    terminar: () => {
      activo = false;
      ocultarTodo();
      escudo.visible = false;
      grupo.visible = false;
    },

    /**
     * En cada bombo puede salir un meteorito (o dos, si pega fuerte y ya pasó un rato). Arranca
     * tranquilo y se pone denso: a los ~40 s sale en casi todos los bombos. La racha suma: más
     * chances y, cada RACHA_POR_EXTRA esquivados, uno más por bombo (sin apuntar).
     */
    alGolpear: (fuerza: number, m: Musica) => {
      if (!activo || estado.termino || jugado < CALMA_INICIAL) return;
      // Hay temas con pocos redoblantes: si no hay un cristal a la vista, a veces sale en el bombo.
      if (!poolOrbes.some((o) => o.activo) && Math.random() < 0.1) lanzarOrbeSuelto();
      if (Math.random() > Math.min(0.95, 0.3 + jugado / 70 + estado.racha * 0.015)) return;
      lanzarCerca(m, jugado > 8 && Math.random() < 0.35);
      if (fuerza > 0.8 && jugado > 25 && Math.random() < 0.4) lanzarCerca(m, false);
      for (let i = extras(); i > 0; i--) if (Math.random() < 0.7) lanzarCerca(m, false);
    },

    /** En los redoblantes, seguido, un cristal que suma. */
    alChasquear: () => {
      if (!activo || estado.termino || jugado < CALMA_INICIAL || Math.random() > 0.35) return;
      lanzarOrbeSuelto();
    },

    /**
     * El drop: una lluvia de meteoritos con un hueco cerca de la nave. Hay que encontrarlo, y atrás
     * de la lluvia viene un cristal justo en el hueco. Con racha, la lluvia es más tupida.
     */
    alDropear: (m: Musica) => {
      if (!activo || estado.termino || jugado < CALMA_INICIAL) return;
      const c = campo();
      const huecoX = THREE.MathUtils.clamp(nave.x + azar(-2, 2), -c.x * 0.8, c.x * 0.8);
      const huecoY = THREE.MathUtils.clamp(nave.y + azar(-1.5, 1.5), c.abajo * 0.8, c.arriba * 0.8);
      const hueco = 2.6 * escalaNave + 1;
      lanzarOrbe(huecoX, huecoY);
      const lluvia = 8 + extras() * 2;
      for (let i = 0, puestos = 0; i < 60 && puestos < lluvia; i++) {
        const x = azar(-c.x, c.x);
        const y = azar(c.abajo, c.arriba);
        if (Math.hypot(x - huecoX, y - huecoY) < hueco) continue;
        lanzar(x, y, m);
        puestos++;
      }
    },

    /**
     * Mueve todo y mira los cruces con el plano de la nave. `avanza` es false con el tema en pausa:
     * el juego queda congelado.
     */
    actualizar: (m: Musica, control: ControlNodriza, avanza: boolean) => {
      if (!activo) return;
      aspecto = m.aspecto;
      nave.copy(control.posicion);
      escalaNave = control.radio / RADIO_NAVE_COMPU;
      const radioNave = control.radio * 0.85;
      const dt = avanza ? m.dt : 0;
      reloj += dt;
      if (!estado.termino) jugado += dt;

      peligro.value.copy(m.colorB);
      materialHalo.color.copy(m.colorB);
      materialOrbe.color.copy(m.colorA).lerp(tmpColor.set(0xffffff), 0.45);
      materialAro.color.copy(m.colorA).lerp(tmpColor.set(0xffffff), 0.6);
      materialHaloOrbe.color.copy(m.colorA);
      const radioOrbe = RADIO_ORBE * escalaNave;

      let n = 0;
      for (const roca of pool) {
        if (!roca.activa) continue;
        const antes = roca.pos.z;
        roca.pos.z += roca.vel * dt;
        roca.giro.x += roca.velGiro.x * dt;
        roca.giro.y += roca.velGiro.y * dt;
        roca.giro.z += roca.velGiro.z * dt;
        // Cruzó el plano de la nave en este cuadro: o le pegó, o lo esquivaste.
        if (!roca.paso && antes < nave.z && roca.pos.z >= nave.z) {
          roca.paso = true;
          const distancia = Math.hypot(roca.pos.x - nave.x, roca.pos.y - nave.y);
          // El platillo es ancho y finito: el choque se mide con una elipse, no con un círculo.
          const dx = (roca.pos.x - nave.x) / (roca.radio + radioNave);
          const dy = (roca.pos.y - nave.y) / (roca.radio + radioNave * 0.45);
          if (!estado.termino) {
            if (dx * dx + dy * dy < 1 && reloj >= invulnerableHasta) {
              chocar(roca);
              continue;
            }
            esquivar(roca, distancia, radioNave);
          }
        }
        if (roca.pos.z > Z_SE_VA) {
          roca.activa = false;
          continue;
        }
        const achica = roca.pos.z > Z_ACHICA ? 1 - suave((roca.pos.z - Z_ACHICA) / (Z_SE_VA - Z_ACHICA)) : 1;
        tmp.position.copy(roca.pos);
        tmp.rotation.copy(roca.giro);
        tmp.scale.setScalar(roca.radio * achica);
        tmp.updateMatrix();
        rocas.setMatrixAt(n, tmp.matrix);
        halos.setMatrixAt(n, tmp.matrix);

        // La marca: se prende en los últimos ~25 metros antes del plano de la nave.
        const falta = nave.z - roca.pos.z;
        const prende = roca.paso ? 0 : THREE.MathUtils.clamp(1 - falta / 25, 0, 1);
        tmp.position.set(roca.pos.x, roca.pos.y, nave.z);
        tmp.rotation.set(0, 0, 0);
        tmp.scale.setScalar((roca.radio + 0.15) * (prende > 0 ? 1.6 - prende * 0.6 : 0));
        tmp.updateMatrix();
        marcas.setMatrixAt(n, tmp.matrix);
        marcas.setColorAt(n, tmpColor.copy(m.colorB).multiplyScalar(prende));
        n++;
      }
      rocas.count = halos.count = marcas.count = n;
      rocas.instanceMatrix.needsUpdate = true;
      halos.instanceMatrix.needsUpdate = true;
      marcas.instanceMatrix.needsUpdate = true;
      if (marcas.instanceColor) marcas.instanceColor.needsUpdate = true;

      let o = 0;
      for (const orbe of poolOrbes) {
        if (!orbe.activo) continue;
        const antes = orbe.pos.z;
        orbe.pos.z += orbe.vel * dt;
        if (!orbe.paso && antes < nave.z && orbe.pos.z >= nave.z) {
          orbe.paso = true;
          // Agarrarlo es generoso (un círculo, no la elipse del choque): ir a buscarlo tiene que salir.
          if (!estado.termino && Math.hypot(orbe.pos.x - nave.x, orbe.pos.y - nave.y) < radioOrbe + radioNave) {
            orbe.activo = false;
            const suma = 5 * estado.multiplicador;
            estado.puntos += suma;
            eventos.alSumar(`+${suma}`, donde.copy(nave));
            avisar();
            continue;
          }
        }
        if (orbe.pos.z > Z_SE_VA) {
          orbe.activo = false;
          continue;
        }
        const achica = orbe.pos.z > Z_ACHICA ? 1 - suave((orbe.pos.z - Z_ACHICA) / (Z_SE_VA - Z_ACHICA)) : 1;
        const escala = escalaNave * achica * (1 + Math.sin(reloj * 4 + orbe.fase) * 0.08);
        tmp.position.copy(orbe.pos);
        tmp.rotation.set(0, reloj * 2.2 + orbe.fase, 0);
        tmp.scale.setScalar(escala);
        tmp.updateMatrix();
        orbes.setMatrixAt(o, tmp.matrix);
        tmp.scale.setScalar(escala * 0.75);
        tmp.updateMatrix();
        halosOrbe.setMatrixAt(o, tmp.matrix);
        // El aro gira inclinado alrededor del cristal, cabeceando un poco.
        tmp.rotation.set(1.1 + Math.sin(reloj * 1.3 + orbe.fase) * 0.3, reloj * 1.7 + orbe.fase, 0);
        tmp.scale.setScalar(escala);
        tmp.updateMatrix();
        aros.setMatrixAt(o, tmp.matrix);

        // Su marca se prende antes que la de los meteoritos: hay que tener tiempo de llegar.
        const falta = nave.z - orbe.pos.z;
        const prende = orbe.paso ? 0 : THREE.MathUtils.clamp(1 - falta / 32, 0, 1);
        tmp.position.set(orbe.pos.x, orbe.pos.y, nave.z);
        tmp.rotation.set(0, 0, 0);
        tmp.scale.setScalar((radioOrbe + 0.15) * (prende > 0 ? 1.6 - prende * 0.6 : 0));
        tmp.updateMatrix();
        marcasOrbe.setMatrixAt(o, tmp.matrix);
        marcasOrbe.setColorAt(o, tmpColor.copy(m.colorA).multiplyScalar(prende));
        o++;
      }
      orbes.count = halosOrbe.count = aros.count = marcasOrbe.count = o;
      orbes.instanceMatrix.needsUpdate = true;
      halosOrbe.instanceMatrix.needsUpdate = true;
      aros.instanceMatrix.needsUpdate = true;
      marcasOrbe.instanceMatrix.needsUpdate = true;
      if (marcasOrbe.instanceColor) marcasOrbe.instanceColor.needsUpdate = true;

      // Escudo después de un choque: tenue y se apaga de a poco, sin titilar.
      const queda = (invulnerableHasta - reloj) / INVULNERABLE;
      escudo.visible = queda > 0;
      if (queda > 0) {
        escudo.position.copy(nave);
        escudo.scale.setScalar(control.radio * 1.25);
        const mat = escudo.material as THREE.MeshBasicMaterial;
        mat.color.copy(m.colorA);
        mat.opacity = 0.14 * suave(Math.min(1, queda * 2));
      }
    },

    liberar: () => {
      geometriaRoca.dispose();
      materialRoca.dispose();
      geometriaHalo.dispose();
      materialHalo.dispose();
      geometriaMarca.dispose();
      materialMarca.dispose();
      geometriaOrbe.dispose();
      materialOrbe.dispose();
      materialHaloOrbe.dispose();
      geometriaAro.dispose();
      materialAro.dispose();
      escudo.geometry.dispose();
      (escudo.material as THREE.Material).dispose();
      mallas.forEach((malla) => malla.dispose());
    },
  };
}

export type Juego = ReturnType<typeof crearJuego>;
