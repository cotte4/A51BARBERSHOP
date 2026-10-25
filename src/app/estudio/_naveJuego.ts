import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FICHAS, NAVE_INICIAL, type Habilidad, type ModeloNave } from "@/lib/estudio-naves";
import { COLOR_AYUDA, crearBurbuja, crearCampoIman, crearCapsula, crearLaserJuego, NOMBRE_AYUDA, RADIO_CAPSULA, TIPOS_AYUDA, type TipoAyuda } from "./_naveAyudas";
import { crearChispas } from "./_naveChispas";
import { crearDrones, crearEscoltas } from "./_naveEscoltas";
import { COLOR_NAVE, MEDIDAS_NAVE } from "./_naveFlota";
import { crearJefe, patronJefe, Z_JEFE, type Objetivo } from "./_naveJefe";
import { azar, elegir, mitadVisible, suave, type Kit } from "./_naveKit";
import { conBorde, type ColorCompartido } from "./_naveMateriales";
import type { ControlNodriza, Musica } from "./_naveShow";

export type { TipoAyuda } from "./_naveAyudas";

// El jueguito: la nodriza (tu nave del hangar) se achica, la manejás con el dedo o el mouse y
// esquivás los meteoritos que vienen del fondo al ritmo del tema (nacen en los bombos). Cada
// meteorito esquivado suma, pasar raspando suma uno más, las estrellas suman cinco y la racha
// multiplica. La racha también llama más meteoritos: cuanto mejor vas, más denso se pone (y un
// choque la corta, así que se equilibra solo). Tres choques y se termina.
//
// Meteoritos y estrellas tienen los colores del tema (cambian en cada drop), así que se distinguen
// por todo lo demás: la piedra es oscura, con brasa y un halo redondo, y su marca es una señal de
// prohibido; la estrella tiene puntas, núcleo blanco y un destello en cruz, y su marca es un blanco.
//
// La partida no termina con el tema: sigue en el que viene (con premio si aguantaste el tema hasta
// el final) y cuenta por cuántos pasó. El récord es del tema donde arrancó.
//
// Además:
// - Cada nave trae su habilidad (FICHAS): el trompo un escudo que se recarga, el anillo un imán, el
//   cigarro es más finita, el triángulo tira láser cada 4 bombos, el enjambre lleva dos drones.
// - Ayudas que se agarran (cápsulas): escudo, imán y láser por DURA_AYUDA segundos, más fuertes que
//   las habilidades. Salen a veces en los redoblantes y en los drops.
// - En el drop viene el jefe (_naveJefe.ts): tira patrones al ritmo; aguantarlo sin chocar da premio
//   y romperlo a tiros (con láser) da el premio grande. Mientras está, no hay lluvia.
// - Con racha alta se suman dos escoltas que agarran estrellas; si chocás, se van.
//
// Fotosensibilidad: el choque no titila. La nave queda con un escudo tenue que se apaga de a poco,
// los meteoritos se achican antes de llegar a la cámara, el láser va a 2 por segundo como mucho y
// las explosiones son chispas sin flash.

/** Un récord del tema: los puntos, con qué nave se hicieron y por cuántos temas pasó la partida. */
export type RecordJuego = { puntos: number; modelo: ModeloNave; temas: number };
/** El récord del otro (Was o Pinky) en este tema. */
export type RivalJuego = RecordJuego & { nombre: string };

export type OpcionesPartida = {
  /** Tu nave (la del hangar): es la nodriza y define la habilidad. */
  modelo: ModeloNave;
  /** Tu récord en este tema (de la base), o null si nunca jugaste. */
  record: RecordJuego | null;
  /** El récord del otro en este tema, o null. */
  rival: RivalJuego | null;
};

export type ResultadoPartida = { puntos: number; modelo: ModeloNave; temas: number };

export type EstadoJuego = {
  puntos: number;
  vidas: number;
  multiplicador: number;
  /** Esquivados seguidos sin chocar. */
  racha: number;
  /** Por cuántos temas pasó la partida (arranca en 1). */
  temas: number;
  /** La pausa del juego (el botón del marcador): todo quieto aunque el tema siga sonando. */
  pausa: boolean;
  /**
   * La leyenda del arranque (qué se esquiva y qué se agarra), con los colores que tienen ahora en
   * pantalla. null cuando ya pasó.
   */
  leyenda: { estrella: string; peligro: string } | null;
  /** La nave con la que se juega. */
  modelo: ModeloNave;
  /** Tu récord en este tema. Si lo pasás al perder, queda el nuevo (y `recordNuevo`). */
  record: RecordJuego | null;
  rival: RivalJuego | null;
  /** Se perdió la última vida: queda el cartel del final. */
  termino: boolean;
  recordNuevo: boolean;
  /** La ayuda que agarraste y cuánto le queda (1 → 0). */
  ayuda: { tipo: TipoAyuda; resta: number } | null;
  /** Solo el trompo: si el escudo está cargado. null = esta nave no tiene escudo. */
  escudoListo: boolean | null;
  /** El jefe del drop mientras está: su vida (1 → 0) y si se le puede pegar (con láser). */
  jefe: { vida: number; rompible: boolean } | null;
};

export type EventosJuego = {
  alCambiar: (estado: EstadoJuego) => void;
  /** Un meteorito le pegó a la nave (para chispas, sacudida y que la nave gire). `donde` se reusa: copiarlo. */
  alChocar: (donde: THREE.Vector3) => void;
  /** Un cartelito que sale donde pasó algo: "+5", "¡Cerca!". `donde` se reusa: copiarlo. */
  alSumar: (texto: string, donde: THREE.Vector3) => void;
  /**
   * Terminó una partida (para guardar el récord en la base). Se dispara UNA vez por partida: al
   * perder la última vida (siempre, aunque sean 0 puntos) o al dejarla antes con puntos > 0
   * (`terminar`, o `empezar` con una partida en curso). `liberar` no lo dispara: si hace falta
   * guardar al desmontar, llamar `terminar` antes.
   */
  alTerminar: (resultado: ResultadoPartida) => void;
};

const VIDAS = 3;
const METEORITOS = 56;
const ORBES = 6;
/** Radio de la estrella en la compu (en el celu, más chica con la nave). */
const RADIO_ORBE = 0.6;
/** Aguantar un tema hasta el final da premio, si la partida estuvo al menos TEMA_MINIMO segundos en él. */
const PREMIO_TEMA = 100;
const TEMA_MINIMO = 30;
/** La leyenda del arranque se ve los primeros segundos de juego (antes se iba con el primer punto). */
const LEYENDA_DURA = 6;
/** Al volver de la pausa, un ratito sin choques: lo que estaba por pegar no te agarra desprevenido. */
const GRACIA_PAUSA = 1;
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
/** Escala de la nodriza en el juego (1,7 en el show, a la mitad jugando): con el radio del modelo da su tamaño en la compu. */
const ESCALA_NAVE_JUEGO = 1.7 * 0.5;
/**
 * Forma del choque de cada nave: semiejes horizontal y vertical, en fracción de su radio (el choque
 * es una elipse). El platillo es ancho y finito; el anillo, una rueda parada; el cigarro, su
 * habilidad: más finito que todos.
 */
const CHOQUE: Record<ModeloNave, { x: number; y: number }> = {
  platillo: { x: 1, y: 0.45 },
  trompo: { x: 0.95, y: 0.75 },
  anillo: { x: 0.85, y: 0.75 },
  cigarro: { x: 0.75, y: 0.22 },
  triangulo: { x: 0.95, y: 0.4 },
  enjambre: { x: 1.05, y: 0.85 },
};
/**
 * La burbuja del escudo de cada nave: semiejes en radios de la nave. Envuelve el casco y la cúpula
 * (el trompo es alto, el cigarro y el triángulo finitos, el anillo una rueda parada).
 */
const BURBUJA: Record<ModeloNave, { x: number; y: number }> = {
  platillo: { x: 1.12, y: 0.72 },
  trompo: { x: 1.2, y: 1.1 },
  anillo: { x: 1.15, y: 1.15 },
  cigarro: { x: 1.1, y: 0.55 },
  triangulo: { x: 1.12, y: 0.6 },
  enjambre: { x: 1.5, y: 1.25 },
};
/** Lo que dura una ayuda agarrada. */
const DURA_AYUDA = 8;
/** El escudo del trompo vuelve solo después de gastarse. */
const RECARGA_ESCUDO = 15;
const RACHA_ESCOLTAS = 20;
/** Después de que algo absorbe un golpe, un ratito sin choques: dos piedras juntas no te sacan una vida igual. */
const GRACIA = 0.5;
/** Láser: como mucho dos por segundo (el tope de destellos del show). */
const LASER_ENTRE = 0.5;
/** Cuánta vida le saca al jefe cada tiro: el del triángulo pega más fuerte pero tira cada 4 bombos. */
const DANO_LASER = { habilidad: 0.25, ayuda: 0.12 };
const PREMIO_JEFE = { aguantar: 100, romper: 300 };
/** El jefe no viene en los primeros segundos ni dos veces seguidas: si no, el drop es lluvia. */
const JEFE_DESDE = 12;
const JEFE_CADA = 25;
/** Tiempo mínimo entre cápsulas (de juego). */
const CAPSULA_CADA = 12;
/** Imán: hasta dónde llega (radio) y cuánto acerca (unidades por segundo), en la compu. */
const IMAN = { habilidad: { radio: 3.4, fuerza: 5 }, ayuda: { radio: 6.5, fuerza: 12 } };
/** El destello en cruz de la estrella, en radios de la estrella: gira despacio y respira apenas. */
const DESTELLO = { tam: 3.4, giro: 0.5 };
/** Los meteoritos del jefe cuentan como esquivados solo si pasan cerca: una fila entera no son diez puntos. */
const CERCA_JEFE = 3;

const BLANCO = new THREE.Color(0xffffff);
const NARANJA = new THREE.Color(0xff8a4a);

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

/**
 * La estrella que suma: cinco puntas con volumen (una pirámide chata para cada lado del contorno). El
 * color por vértice oscurece las puntas: el centro queda más claro y se lee como algo que brilla.
 */
function crearGeometriaEstrella(): THREE.BufferGeometry {
  const PUNTAS = 5;
  const AFUERA = 0.62;
  const ADENTRO = 0.27;
  const HONDO = 0.2;
  const posiciones: number[] = [];
  const colores: number[] = [];
  const contorno = (k: number): [number, number] => {
    const a = Math.PI / 2 + (k / (PUNTAS * 2)) * Math.PI * 2;
    const r = k % 2 === 0 ? AFUERA : ADENTRO;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  for (const lado of [1, -1]) {
    for (let k = 0; k < PUNTAS * 2; k++) {
      const [x1, y1] = contorno(k);
      const [x2, y2] = contorno(k + 1);
      posiciones.push(0, 0, HONDO * lado, x1, y1, 0, x2, y2, 0);
      const tinta1 = k % 2 === 0 ? 0.6 : 0.82;
      const tinta2 = k % 2 === 0 ? 0.82 : 0.6;
      colores.push(1, 1, 1, tinta1, tinta1, tinta1, tinta2, tinta2, tinta2);
    }
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.Float32BufferAttribute(posiciones, 3));
  geometria.setAttribute("color", new THREE.Float32BufferAttribute(colores, 3));
  return geometria;
}

/** El destello en cruz de la estrella: cuatro rayos finitos que se afinan hacia la punta y un resplandor chico. */
function crearTexturaDestello(): THREE.CanvasTexture {
  const LADO = 128;
  const lienzo = document.createElement("canvas");
  lienzo.width = LADO;
  lienzo.height = LADO;
  const ctx = lienzo.getContext("2d");
  if (ctx) {
    const c = LADO / 2;
    const resplandor = ctx.createRadialGradient(c, c, 0, c, c, c * 0.38);
    resplandor.addColorStop(0, "rgba(255,255,255,0.85)");
    resplandor.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = resplandor;
    ctx.fillRect(0, 0, LADO, LADO);
    const ancho = 5;
    for (const vertical of [false, true]) {
      const rayo = vertical ? ctx.createLinearGradient(c, 0, c, LADO) : ctx.createLinearGradient(0, c, LADO, c);
      rayo.addColorStop(0, "rgba(255,255,255,0)");
      rayo.addColorStop(0.5, "rgba(255,255,255,0.95)");
      rayo.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = rayo;
      ctx.beginPath();
      if (vertical) {
        ctx.moveTo(c - ancho, c);
        ctx.lineTo(c, 0);
        ctx.lineTo(c + ancho, c);
        ctx.lineTo(c, LADO);
      } else {
        ctx.moveTo(c, c - ancho);
        ctx.lineTo(0, c);
        ctx.lineTo(c, c + ancho);
        ctx.lineTo(LADO, c);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

/** Marca de un meteorito en el plano de la nave: un aro con una cruz adentro (salí de ahí). */
function crearMarcaPeligro(): THREE.BufferGeometry {
  const piezas = [new THREE.RingGeometry(0.86, 1, 48), ...[Math.PI / 4, -Math.PI / 4].map((giro) => new THREE.PlaneGeometry(1.5, 0.13).rotateZ(giro))];
  const marca = mergeGeometries(piezas);
  piezas.forEach((g) => g.dispose());
  return marca;
}

/** Marca de una estrella: un blanco, aro y punto (andá ahí). */
function crearMarcaEstrella(): THREE.BufferGeometry {
  const piezas = [new THREE.RingGeometry(0.86, 1, 48), new THREE.CircleGeometry(0.34, 32)];
  const marca = mergeGeometries(piezas);
  piezas.forEach((g) => g.dispose());
  return marca;
}

type Roca = {
  activa: boolean;
  pos: THREE.Vector3;
  radio: number;
  vel: number;
  giro: THREE.Euler;
  velGiro: THREE.Vector3;
  paso: boolean;
  /** Corrimiento de costado por segundo: los del jefe van de su panza a tu plano. */
  deriva: THREE.Vector2;
  /** Dónde cruza el plano de la nave (ahí va su marca). */
  cruce: THREE.Vector2;
  nace: number;
  delJefe: boolean;
};
type Orbe = { activo: boolean; pos: THREE.Vector3; vel: number; paso: boolean; fase: number };

export function crearJuego(eventos: EventosJuego, kit: Kit) {
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
  // Marca en el plano de la nave: dónde va a cruzar cada meteorito (una señal de prohibido). Aparece a
  // medida que se acerca.
  const geometriaMarcaPeligro = crearMarcaPeligro();
  const materialMarca = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const marcas = new THREE.InstancedMesh(geometriaMarcaPeligro, materialMarca, METEORITOS);
  marcas.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(METEORITOS * 3), 3);

  // La estrella que suma: cinco puntas del color del tema con un núcleo blanco y un destello en cruz,
  // sin niebla para que se vea venir desde el fondo. Nada de halo redondo, que es de los meteoritos.
  // Su marca en el plano de la nave es un blanco del mismo color: dice adónde ir.
  const geometriaEstrella = crearGeometriaEstrella();
  const materialOrbe = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false });
  const orbes = new THREE.InstancedMesh(geometriaEstrella, materialOrbe, ORBES);
  const materialNucleo = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, fog: false });
  const nucleos = new THREE.InstancedMesh(geometriaEstrella, materialNucleo, ORBES);
  const texturaDestello = crearTexturaDestello();
  const geometriaDestello = new THREE.PlaneGeometry(1, 1);
  const materialDestello = new THREE.MeshBasicMaterial({
    map: texturaDestello,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const destellosOrbe = new THREE.InstancedMesh(geometriaDestello, materialDestello, ORBES);
  const geometriaMarcaEstrella = crearMarcaEstrella();
  const marcasOrbe = new THREE.InstancedMesh(geometriaMarcaEstrella, materialMarca, ORBES);
  marcasOrbe.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(ORBES * 3), 3);

  const escudo = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 20),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  escudo.visible = false;

  const mallas = [rocas, halos, marcas, orbes, nucleos, destellosOrbe, marcasOrbe];
  mallas.forEach((malla) => {
    malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    malla.frustumCulled = false;
    malla.count = 0;
  });

  // Lo de las habilidades, las ayudas, el jefe y las escoltas.
  const chispas = crearChispas(kit.puntoRedondo);
  const capsulaVista = crearCapsula();
  const burbuja = crearBurbuja();
  const campoIman = crearCampoIman();
  const laser = crearLaserJuego();
  const jefe = crearJefe(kit, chispas);
  const escoltas = crearEscoltas(kit);
  const drones = crearDrones(kit);

  grupo.add(...mallas, escudo, capsulaVista.obj, capsulaVista.marca, burbuja.obj, campoIman.obj, laser.obj, jefe.obj, escoltas.obj, drones.obj, chispas.obj);
  grupo.visible = false;

  const pool: Roca[] = Array.from({ length: METEORITOS }, () => ({
    activa: false,
    pos: new THREE.Vector3(),
    radio: 1,
    vel: 0,
    giro: new THREE.Euler(),
    velGiro: new THREE.Vector3(),
    paso: false,
    deriva: new THREE.Vector2(),
    cruce: new THREE.Vector2(),
    nace: 0,
    delJefe: false,
  }));
  const poolOrbes: Orbe[] = Array.from({ length: ORBES }, () => ({ activo: false, pos: new THREE.Vector3(), vel: 0, paso: false, fase: 0 }));
  const capsula = { activa: false, tipo: "escudo" as TipoAyuda, pos: new THREE.Vector3(), vel: 0, paso: false, fase: 0 };
  const objetivos: Objetivo[] = Array.from({ length: 12 }, () => ({ x: 0, y: 0 }));

  const estado: EstadoJuego = {
    puntos: 0,
    vidas: VIDAS,
    multiplicador: 1,
    racha: 0,
    temas: 1,
    pausa: false,
    leyenda: null,
    modelo: NAVE_INICIAL,
    record: null,
    rival: null,
    termino: false,
    recordNuevo: false,
    ayuda: null,
    escudoListo: null,
    jefe: null,
  };
  let activo = false;
  let pausa = false;
  let jugado = 0;
  /** Lo jugado en el tema que suena: aguantarlo da premio solo si la partida estuvo un rato en él. */
  let jugadoEnTema = 0;
  /** La leyenda toma los colores del primer cuadro de la partida. */
  let leyendaPendiente = false;
  let invulnerableHasta = -Infinity;
  let graciaHasta = -Infinity;
  let reloj = 0;
  let aspecto = 1;
  let escalaNave = 1;
  let radioNave = 1;
  /** Semiejes del choque de la nave, en el mundo. */
  let rx = 1;
  let ry = 1;

  let modelo: ModeloNave = NAVE_INICIAL;
  let habilidad: Habilidad = FICHAS[NAVE_INICIAL].habilidad;
  /** Ya se avisó el resultado de esta partida (alTerminar va una sola vez). */
  let reportado = true;
  let ayuda: { tipo: TipoAyuda; hasta: number } | null = null;
  let escudoListo = false;
  let recargaEscudo = 0;
  let bombos = 0;
  let ultimoLaser = -Infinity;
  let ultimaCapsula = -Infinity;
  let ultimoJefe = -Infinity;
  let jefeEnCurso = false;
  let chocoConJefe = false;
  let bombosJefe = 0;
  let disparosJefe = 0;

  const nave = new THREE.Vector3();
  const tmp = new THREE.Object3D();
  const donde = new THREE.Vector3();
  const tmpColor = new THREE.Color();
  const colorLaser = new THREE.Color();
  const colorBurbuja = new THREE.Color(COLOR_AYUDA.escudo);
  const metaBurbuja = new THREE.Color();
  const colorIman = new THREE.Color(COLOR_NAVE.anillo);
  const metaIman = new THREE.Color();
  const origen = new THREE.Vector3();
  const punto = new THREE.Vector3();
  const boca = new THREE.Vector3();

  const avisar = () => eventos.alCambiar({ ...estado });

  /** Lo que se ve del plano de la nave, con margen: ahí nacen los meteoritos. */
  const campo = () => {
    const m = mitadVisible(nave.z, aspecto);
    return { x: m.x * 0.85, abajo: -m.y * 0.6, arriba: m.y * 0.75 };
  };

  const tieneLaser = () => habilidad === "laser" || ayuda?.tipo === "laser";
  const imanActual = () => (ayuda?.tipo === "iman" ? IMAN.ayuda : habilidad === "iman" ? IMAN.habilidad : null);
  const ponerJefe = () => {
    estado.jefe = jefeEnCurso ? { vida: jefe.vida, rompible: tieneLaser() } : null;
  };
  /** Con el jefe en pantalla todo nace adelante de él (si no, lo atravesaría). */
  const zNace = () => (jefe.presente ? Z_JEFE + 4 : Z_NACE);

  const reportar = () => {
    if (reportado) return;
    reportado = true;
    eventos.alTerminar({ puntos: estado.puntos, modelo, temas: estado.temas });
  };

  const tomarRoca = (m: Musica, delJefe: boolean) => {
    const roca = pool.find((r) => !r.activa);
    if (!roca) return null;
    roca.activa = true;
    roca.paso = false;
    roca.nace = reloj;
    roca.delJefe = delJefe;
    roca.giro.set(azar(0, 6), azar(0, 6), azar(0, 6));
    roca.velGiro.set(azar(-2, 2), azar(-2, 2), azar(-2, 2));
    // Más rápido cuanto más fuerte suena, cuanto más dura la partida y cuanto más larga la racha.
    roca.vel = delJefe
      ? 13 + m.energia * 4 + Math.min(estado.racha, 40) * 0.06
      : 18 + m.energia * 12 + Math.min(jugado, 90) * 0.12 + Math.min(estado.racha, 40) * 0.08;
    return roca;
  };

  const lanzar = (x: number, y: number, m: Musica) => {
    const roca = tomarRoca(m, false);
    if (!roca) return;
    // En el celu todo es más chico: la escala acompaña a la de la nave.
    roca.radio = azar(0.55, 1.05) * escalaNave;
    roca.pos.set(x, y, Z_NACE);
    roca.deriva.set(0, 0);
    roca.cruce.set(x, y);
  };

  /** Un meteorito del jefe: sale de su panza y cruza el plano de la nave en (x, y). */
  const lanzarDesde = (desde: THREE.Vector3, x: number, y: number, m: Musica) => {
    const roca = tomarRoca(m, true);
    if (!roca) return;
    roca.radio = azar(0.55, 0.8) * escalaNave;
    roca.pos.copy(desde);
    const tiempo = Math.max(0.4, (nave.z - desde.z) / roca.vel);
    roca.deriva.set((x - desde.x) / tiempo, (y - desde.y) / tiempo);
    roca.cruce.set(x, y);
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

  /** Una estrella en (x, y) del plano de la nave. Más lenta que las piedras: da tiempo a ir a buscarla. */
  const lanzarOrbe = (x: number, y: number) => {
    const orbe = poolOrbes.find((o) => !o.activo);
    if (!orbe) return;
    orbe.activo = true;
    orbe.paso = false;
    orbe.fase = azar(0, Math.PI * 2);
    orbe.pos.set(x, y, zNace());
    orbe.vel = 16;
  };

  const lanzarOrbeSuelto = () => {
    const c = campo();
    lanzarOrbe(azar(-c.x, c.x) * 0.85, azar(c.abajo, c.arriba) * 0.85);
  };

  const puedeCapsula = () => !capsula.activa && !estado.termino && jugado > 8 && jugado - ultimaCapsula > CAPSULA_CADA;

  /** Una cápsula de ayuda (si no se pide un tipo, cualquiera menos la que ya tenés). */
  const lanzarCapsula = (x: number, y: number, tipo?: TipoAyuda) => {
    capsula.activa = true;
    capsula.paso = false;
    capsula.tipo = tipo ?? elegir(TIPOS_AYUDA.filter((t) => t !== ayuda?.tipo));
    capsula.fase = azar(0, Math.PI * 2);
    capsula.pos.set(x, y, zNace());
    capsula.vel = 15;
    ultimaCapsula = jugado;
  };

  const lanzarCapsulaSuelta = (tipo?: TipoAyuda) => {
    const c = campo();
    lanzarCapsula(azar(-c.x, c.x) * 0.75, azar(c.abajo, c.arriba) * 0.75, tipo);
  };

  const activarAyuda = (tipo: TipoAyuda) => {
    ayuda = { tipo, hasta: reloj + DURA_AYUDA };
    estado.ayuda = { tipo, resta: 1 };
    if (jefeEnCurso) ponerJefe();
    eventos.alSumar(`¡${NOMBRE_AYUDA[tipo]}!`, donde.copy(nave));
    avisar();
  };

  /**
   * El imán: acerca lo que viene (estrella o cápsula) a la nave, más fuerte cuanto más cerca del plano
   * y del costado de la nave. Devuelve cuánto tiró (0..1), para el hilo.
   */
  const atraer = (pos: THREE.Vector3, paso: boolean, dt: number): number => {
    const iman = imanActual();
    if (!iman || paso || estado.termino) return 0;
    const falta = nave.z - pos.z;
    if (falta <= 0 || falta > 30) return 0;
    const dx = nave.x - pos.x;
    const dy = nave.y - pos.y;
    const d = Math.hypot(dx, dy);
    const radio = iman.radio * escalaNave;
    if (d >= radio || d < 1e-4) return 0;
    const fuerza = Math.min(1, 1.6 * (1 - d / radio)) * (1 - (falta / 30) * 0.6);
    const avance = Math.min(d, iman.fuerza * escalaNave * fuerza * dt);
    pos.x += (dx / d) * avance;
    pos.y += (dy / d) * avance;
    return fuerza;
  };

  const perder = () => {
    estado.termino = true;
    if (estado.puntos > (estado.record?.puntos ?? 0)) {
      estado.record = { puntos: estado.puntos, modelo, temas: estado.temas };
      estado.recordNuevo = true;
    }
    if (jefeEnCurso) {
      jefe.retirar(reloj);
      jefeEnCurso = false;
      estado.jefe = null;
    }
    ayuda = null;
    estado.ayuda = null;
    escoltas.echar(reloj);
    reportar();
  };

  const chocar = (roca: Roca) => {
    roca.activa = false;
    estado.racha = 0;
    estado.multiplicador = 1;
    estado.vidas--;
    invulnerableHasta = reloj + INVULNERABLE;
    if (jefeEnCurso) chocoConJefe = true;
    escoltas.echar(reloj);
    eventos.alChocar(donde.copy(nave));
    if (estado.vidas <= 0) perder();
    avisar();
  };

  /** Algo se comió el golpe (escudo o dron): la piedra se rompe en chispas y no perdés nada. */
  const absorber = (roca: Roca, texto: string, color: number) => {
    roca.activa = false;
    graciaHasta = reloj + GRACIA;
    // Del tamaño de las chispas del show (estas pasan cerca de la cámara, en el plano de la nave).
    chispas.explotar(roca.pos, { cantidad: 26, color: tmpColor.set(color), velocidad: 7 * escalaNave, dura: 0.8, tam: 0.5 * escalaNave, radio: roca.radio * 0.6, blanco: 0.5 });
    eventos.alSumar(texto, donde.copy(roca.pos));
  };

  /** Un meteorito te iba a pegar: primero la ayuda, después la habilidad, y si no, el choque. */
  const recibirGolpe = (roca: Roca) => {
    if (ayuda?.tipo === "escudo") {
      burbuja.golpe(roca.pos);
      absorber(roca, "¡Escudo!", COLOR_AYUDA.escudo);
      return;
    }
    if (habilidad === "escudo" && escudoListo) {
      escudoListo = false;
      estado.escudoListo = false;
      recargaEscudo = reloj + RECARGA_ESCUDO;
      burbuja.golpe(roca.pos);
      absorber(roca, "¡Escudo!", COLOR_NAVE.trompo);
      avisar();
      return;
    }
    if (habilidad === "drones" && drones.usar(roca.pos, reloj)) {
      absorber(roca, "¡Dron!", COLOR_NAVE.enjambre);
      return;
    }
    chocar(roca);
  };

  const esquivar = (roca: Roca, cerca: boolean) => {
    const extrasAntes = extras();
    estado.racha++;
    estado.multiplicador = Math.min(MULTIPLICADOR_MAX, 1 + Math.floor(estado.racha / RACHA_POR_NIVEL));
    estado.puntos += estado.multiplicador;
    if (cerca) {
      estado.puntos += estado.multiplicador;
      eventos.alSumar("¡Cerca!", donde.copy(roca.pos).setZ(nave.z));
    }
    // Las escoltas llegan con la racha (el número ya está en el marcador: va un solo cartel).
    if (estado.racha >= RACHA_ESCOLTAS && !escoltas.volando) {
      escoltas.sumar(reloj);
      eventos.alSumar("¡Escoltas!", donde.copy(nave));
    } else if (extras() > extrasAntes) {
      // Avisa cuando la racha llama más meteoritos: que se entienda por qué se puso denso.
      eventos.alSumar(`¡Racha ${estado.racha}!`, donde.copy(nave));
    }
    avisar();
  };

  const romperRoca = (roca: Roca) => {
    roca.activa = false;
    chispas.explotar(roca.pos, {
      cantidad: 24,
      color: tmpColor.copy(peligro.value).lerp(NARANJA, 0.5),
      velocidad: 6 * escalaNave,
      dura: 0.9,
      tam: 0.85 * escalaNave,
      radio: roca.radio * 0.7,
      blanco: 0.3,
    });
    esquivar(roca, false);
  };

  const romperJefe = () => {
    const premio = PREMIO_JEFE.romper * estado.multiplicador;
    estado.puntos += premio;
    jefeEnCurso = false;
    estado.jefe = null;
    ultimoJefe = jugado;
    eventos.alSumar(`¡Jefe roto! +${premio}`, donde.copy(jefe.posicion));
  };

  /** El meteorito más cercano adelante de la nave (que ya se ve y todavía no llegó). */
  const rocaParaLaser = (): Roca | null => {
    let mejor: Roca | null = null;
    let mejorDistancia = Infinity;
    for (const roca of pool) {
      if (!roca.activa || roca.paso) continue;
      const falta = nave.z - roca.pos.z;
      if (falta < 1.5 || falta > 42) continue;
      const d = roca.pos.distanceToSquared(nave);
      if (d < mejorDistancia) {
        mejorDistancia = d;
        mejor = roca;
      }
    }
    return mejor;
  };

  /** Va a pegarte (o pasar raspando) pronto: el láser lo prefiere antes que al jefe. */
  const amenaza = (roca: Roca) => {
    const dx = (roca.cruce.x - nave.x) / (roca.radio + rx);
    const dy = (roca.cruce.y - nave.y) / (roca.radio + ry);
    return dx * dx + dy * dy < 3 && nave.z - roca.pos.z < 25;
  };

  /** Un tiro de láser: al meteorito que te amenaza, si no al jefe, si no al más cercano. */
  const dispararLaser = () => {
    if (reloj - ultimoLaser < LASER_ENTRE || estado.termino) return;
    const deAyuda = ayuda?.tipo === "laser";
    colorLaser.set(deAyuda ? COLOR_AYUDA.laser : COLOR_NAVE.triangulo);
    origen.set(nave.x, nave.y + 0.1 * escalaNave, nave.z - 0.5 * escalaNave);
    const roca = rocaParaLaser();
    if (jefe.peleando && jefeEnCurso && (!roca || !amenaza(roca))) {
      jefe.blanco(punto);
      laser.disparar(origen, punto, colorLaser, reloj, escalaNave);
      if (jefe.golpear(deAyuda ? DANO_LASER.ayuda : DANO_LASER.habilidad, punto, reloj)) romperJefe();
      else ponerJefe();
      avisar();
    } else if (roca) {
      laser.disparar(origen, roca.pos, colorLaser, reloj, escalaNave);
      romperRoca(roca);
    } else {
      return;
    }
    ultimoLaser = reloj;
  };

  const llamarJefe = () => {
    jefe.aparecer(reloj, escalaNave, aspecto);
    jefeEnCurso = true;
    chocoConJefe = false;
    bombosJefe = 0;
    disparosJefe = 0;
    ultimoJefe = jugado;
    ponerJefe();
    eventos.alSumar("¡Viene el jefe!", donde.copy(nave));
    // El drop da una mano: a veces una cápsula, con láser más seguido si no tenés con qué pegarle.
    if (!capsula.activa && Math.random() < 0.6) lanzarCapsulaSuelta(!tieneLaser() && Math.random() < 0.6 ? "laser" : undefined);
    avisar();
  };

  /**
   * El jefe tira en los bombos: un patrón cada tres (cada dos cuando la racha ya llama extras), y con
   * racha alta uno apuntado en el medio. Como siempre, cuanto mejor vas, más denso.
   */
  const dispararJefe = (m: Musica) => {
    bombosJefe++;
    jefe.boca(boca);
    const cada = extras() >= 1 ? 2 : 3;
    if (bombosJefe % cada === 1) {
      const cuantos = patronJefe(disparosJefe++, nave, campo(), escalaNave, objetivos);
      for (let i = 0; i < cuantos; i++) lanzarDesde(boca, objetivos[i].x, objetivos[i].y, m);
    } else if (extras() >= 2 && Math.random() < 0.5) {
      const c = campo();
      const error = 1.7 * escalaNave;
      lanzarDesde(boca, THREE.MathUtils.clamp(nave.x + azar(-error, error), -c.x, c.x), THREE.MathUtils.clamp(nave.y + azar(-error, error), c.abajo, c.arriba), m);
    }
  };

  const ocultarTodo = () => {
    pool.forEach((r) => (r.activa = false));
    poolOrbes.forEach((o) => (o.activo = false));
    capsula.activa = false;
    mallas.forEach((malla) => (malla.count = 0));
    capsulaVista.ocultar();
    jefe.ocultar();
    escoltas.ocultar();
    drones.ocultar();
    burbuja.apagar();
    campoIman.apagar();
    laser.apagar();
    chispas.limpiar();
    escudo.visible = false;
  };

  return {
    obj: grupo,
    get activo() {
      return activo;
    },
    get termino() {
      return estado.termino;
    },
    get pausado() {
      return pausa;
    },

    /**
     * Arranca una partida. Sin `opciones` (el "Otra vez"), repite nave y rival y usa tu récord de
     * ahora (si lo acabás de pasar, el nuevo). Si había una partida en curso con puntos, la avisa.
     */
    empezar: (opciones?: OpcionesPartida) => {
      if (activo && !estado.termino && estado.puntos > 0) reportar();
      if (opciones) {
        modelo = opciones.modelo;
        estado.record = opciones.record ? { ...opciones.record } : null;
        estado.rival = opciones.rival ? { ...opciones.rival } : null;
      }
      habilidad = FICHAS[modelo].habilidad;
      ocultarTodo();
      activo = true;
      pausa = false;
      jugado = 0;
      jugadoEnTema = 0;
      leyendaPendiente = true;
      invulnerableHasta = -Infinity;
      graciaHasta = -Infinity;
      reportado = false;
      ayuda = null;
      escudoListo = habilidad === "escudo";
      recargaEscudo = 0;
      bombos = 0;
      ultimoLaser = -Infinity;
      ultimaCapsula = -Infinity;
      ultimoJefe = -Infinity;
      jefeEnCurso = false;
      chocoConJefe = false;
      // La burbuja y el campo arrancan con el color de la habilidad (no viran desde otro al empezar).
      colorBurbuja.set(COLOR_NAVE.trompo).lerp(BLANCO, 0.25);
      colorIman.set(COLOR_NAVE.anillo);
      // Lo que puede aparecer en la partida queda armado desde ya: nada se arma en medio del juego.
      escoltas.preparar(modelo);
      if (habilidad === "drones") drones.preparar();
      jefe.preparar(modelo);
      Object.assign(estado, {
        puntos: 0,
        vidas: VIDAS,
        multiplicador: 1,
        racha: 0,
        temas: 1,
        pausa: false,
        leyenda: null,
        modelo,
        termino: false,
        recordNuevo: false,
        ayuda: null,
        escudoListo: habilidad === "escudo" ? true : null,
        jefe: null,
      });
      grupo.visible = true;
      avisar();
    },

    /** Se deja el juego (la X, Esc, salir del modo nave). Si había puntos sin avisar, avisa. */
    terminar: () => {
      if (activo && estado.puntos > 0) reportar();
      reportado = true;
      activo = false;
      pausa = false;
      ocultarTodo();
      grupo.visible = false;
    },

    /** La pausa del marcador: todo queda quieto y los bombos no tiran nada. Al volver, un ratito sin choques. */
    pausar: (si: boolean) => {
      if (!activo || estado.termino || pausa === si) return;
      pausa = si;
      estado.pausa = si;
      if (!si) graciaHasta = reloj + GRACIA_PAUSA;
      avisar();
    },

    /**
     * Empezó otro tema (o el mismo de nuevo) en medio de la partida: sigue, y suma uno a los temas.
     * Si el anterior terminó solo y la partida estuvo un rato en él, premio.
     */
    cambioDeTema: (llegoAlFinal: boolean) => {
      if (!activo || estado.termino) return;
      estado.temas++;
      if (llegoAlFinal && jugadoEnTema >= TEMA_MINIMO) {
        const premio = PREMIO_TEMA * estado.multiplicador;
        estado.puntos += premio;
        eventos.alSumar(`¡Tema superado! +${premio}`, donde.copy(nave));
      }
      jugadoEnTema = 0;
      avisar();
    },

    /**
     * En cada bombo puede salir un meteorito (o dos, si pega fuerte y ya pasó un rato). Arranca
     * tranquilo y se pone denso: a los ~40 s sale en casi todos los bombos. La racha suma: más
     * chances y, cada RACHA_POR_EXTRA esquivados, uno más por bombo (sin apuntar). Con el jefe, los
     * bombos son de él. El láser (triángulo o ayuda) también va con los bombos.
     */
    alGolpear: (fuerza: number, m: Musica) => {
      if (!activo || pausa || estado.termino || jugado < CALMA_INICIAL) return;
      bombos++;
      if (tieneLaser() && bombos % (ayuda?.tipo === "laser" ? 1 : 4) === 0) dispararLaser();
      if (jefe.presente) {
        if (jefe.peleando) dispararJefe(m);
        return;
      }
      // Hay temas con pocos redoblantes: si no hay una estrella a la vista, a veces sale en el bombo.
      if (!poolOrbes.some((o) => o.activo) && Math.random() < 0.1) lanzarOrbeSuelto();
      if (Math.random() > Math.min(0.95, 0.3 + jugado / 70 + estado.racha * 0.015)) return;
      lanzarCerca(m, jugado > 8 && Math.random() < 0.35);
      if (fuerza > 0.8 && jugado > 25 && Math.random() < 0.4) lanzarCerca(m, false);
      for (let i = extras(); i > 0; i--) if (Math.random() < 0.7) lanzarCerca(m, false);
    },

    /** En los redoblantes, seguido, una estrella que suma; de vez en cuando, una cápsula de ayuda. */
    alChasquear: () => {
      if (!activo || pausa || estado.termino || jugado < CALMA_INICIAL) return;
      if (puedeCapsula() && Math.random() < 0.06) {
        lanzarCapsulaSuelta();
        return;
      }
      if (Math.random() > 0.35) return;
      lanzarOrbeSuelto();
    },

    /**
     * El drop: viene el jefe (si ya pasó la calma y no hubo otro hace poco). Si no, una lluvia de
     * meteoritos con un hueco cerca de la nave: hay que encontrarlo, y atrás de la lluvia viene una
     * estrella (o a veces una cápsula) justo en el hueco. Con racha, la lluvia es más tupida.
     */
    alDropear: (m: Musica) => {
      if (!activo || pausa || estado.termino || jugado < CALMA_INICIAL || jefe.presente) return;
      if (jugado >= JEFE_DESDE && jugado - ultimoJefe >= JEFE_CADA) {
        llamarJefe();
        return;
      }
      const c = campo();
      const huecoX = THREE.MathUtils.clamp(nave.x + azar(-2, 2), -c.x * 0.8, c.x * 0.8);
      const huecoY = THREE.MathUtils.clamp(nave.y + azar(-1.5, 1.5), c.abajo * 0.8, c.arriba * 0.8);
      const hueco = 2.6 * escalaNave + 1;
      if (puedeCapsula() && Math.random() < 0.35) lanzarCapsula(huecoX, huecoY);
      else lanzarOrbe(huecoX, huecoY);
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
     * el juego queda congelado (igual que con la pausa del juego).
     */
    actualizar: (m: Musica, control: ControlNodriza, avanza: boolean) => {
      if (!activo) return;
      aspecto = m.aspecto;
      nave.copy(control.posicion);
      // El radio que escribe la nodriza es el de su modelo por su escala: dividido por el de la compu
      // da cuánto se achica todo en el celu.
      const escala = control.radio / (MEDIDAS_NAVE[modelo].radio * ESCALA_NAVE_JUEGO);
      escalaNave = Number.isFinite(escala) && escala > 0 ? escala : 1;
      radioNave = control.radio * 0.85;
      rx = radioNave * CHOQUE[modelo].x;
      ry = radioNave * CHOQUE[modelo].y;
      const dt = avanza && !pausa ? m.dt : 0;
      reloj += dt;
      if (!estado.termino) {
        jugado += dt;
        jugadoEnTema += dt;
      }

      peligro.value.copy(m.colorB);
      materialHalo.color.copy(m.colorB);
      materialOrbe.color.copy(m.colorA).lerp(tmpColor.set(0xffffff), 0.3);
      materialDestello.color.copy(m.colorA).lerp(tmpColor.set(0xffffff), 0.5);
      const radioOrbe = RADIO_ORBE * escalaNave;

      // La leyenda del marcador, con los colores de ahora: se ve los primeros segundos.
      if (leyendaPendiente) {
        leyendaPendiente = false;
        estado.leyenda = { estrella: `#${materialOrbe.color.getHexString()}`, peligro: `#${m.colorB.getHexString()}` };
        avisar();
      } else if (estado.leyenda && jugado > LEYENDA_DURA) {
        estado.leyenda = null;
        avisar();
      }

      // ————— Tiempos: la ayuda que se acaba y el escudo del trompo que se recarga —————
      if (ayuda) {
        const resta = (ayuda.hasta - reloj) / DURA_AYUDA;
        if (resta <= 0) {
          ayuda = null;
          estado.ayuda = null;
          if (jefeEnCurso) ponerJefe();
          avisar();
        } else if (estado.ayuda && estado.ayuda.resta - resta >= 0.04) {
          // De a pasitos (no en cada cuadro): la barrita del marcador anima el resto con CSS.
          estado.ayuda = { tipo: ayuda.tipo, resta };
          avisar();
        }
      }
      if (habilidad === "escudo" && !escudoListo && !estado.termino && reloj >= recargaEscudo) {
        escudoListo = true;
        estado.escudoListo = true;
        eventos.alSumar("Escudo listo", donde.copy(nave));
        avisar();
      }

      // ————— Meteoritos —————
      let n = 0;
      for (const roca of pool) {
        if (!roca.activa) continue;
        const antes = roca.pos.z;
        roca.pos.z += roca.vel * dt;
        roca.pos.x += roca.deriva.x * dt;
        roca.pos.y += roca.deriva.y * dt;
        roca.giro.x += roca.velGiro.x * dt;
        roca.giro.y += roca.velGiro.y * dt;
        roca.giro.z += roca.velGiro.z * dt;
        // Cruzó el plano de la nave en este cuadro: o le pegó, o lo esquivaste.
        if (!roca.paso && antes < nave.z && roca.pos.z >= nave.z) {
          roca.paso = true;
          // El choque se mide con la elipse de cada nave, no con un círculo.
          const dx = (roca.pos.x - nave.x) / (roca.radio + rx);
          const dy = (roca.pos.y - nave.y) / (roca.radio + ry);
          const elipse = dx * dx + dy * dy;
          if (!estado.termino) {
            if (elipse < 1 && reloj >= invulnerableHasta && reloj >= graciaHasta) {
              recibirGolpe(roca);
              continue;
            }
            if (!roca.delJefe || elipse < CERCA_JEFE * CERCA_JEFE) {
              esquivar(roca, Math.hypot(roca.pos.x - nave.x, roca.pos.y - nave.y) < (roca.radio + rx) * 1.5);
            }
          }
        }
        if (roca.pos.z > Z_SE_VA) {
          roca.activa = false;
          continue;
        }
        const achica = roca.pos.z > Z_ACHICA ? 1 - suave((roca.pos.z - Z_ACHICA) / (Z_SE_VA - Z_ACHICA)) : 1;
        // Al nacer crece en un cuarto de segundo (los del jefe salen de su panza, no aparecen).
        const crece = Math.min(1, 0.2 + ((reloj - roca.nace) / 0.25) * 0.8);
        tmp.position.copy(roca.pos);
        tmp.rotation.copy(roca.giro);
        tmp.scale.setScalar(roca.radio * achica * crece);
        tmp.updateMatrix();
        rocas.setMatrixAt(n, tmp.matrix);
        halos.setMatrixAt(n, tmp.matrix);

        // La marca: se prende en los últimos ~25 metros antes del plano de la nave, donde va a cruzar.
        const falta = nave.z - roca.pos.z;
        const prende = roca.paso ? 0 : THREE.MathUtils.clamp(1 - falta / 25, 0, 1);
        tmp.position.set(roca.cruce.x, roca.cruce.y, nave.z);
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

      // ————— Estrellas (el imán las curva hacia la nave; las escoltas también las agarran) —————
      campoIman.empezarHilos();
      let o = 0;
      for (const orbe of poolOrbes) {
        if (!orbe.activo) continue;
        const antes = orbe.pos.z;
        orbe.pos.z += orbe.vel * dt;
        const tira = atraer(orbe.pos, orbe.paso, dt);
        if (tira > 0.05) campoIman.hilo(orbe.pos, nave, tira);
        if (!orbe.paso && antes < nave.z && orbe.pos.z >= nave.z) {
          orbe.paso = true;
          if (!estado.termino) {
            // Agarrarlo es generoso (un círculo, no la elipse del choque): ir a buscarlo tiene que salir.
            const enNave = Math.hypot(orbe.pos.x - nave.x, orbe.pos.y - nave.y) < radioOrbe + radioNave;
            const escolta = enNave ? null : escoltas.agarra(orbe.pos.x, orbe.pos.y, radioOrbe);
            if (enNave || escolta) {
              orbe.activo = false;
              const suma = 5 * estado.multiplicador;
              estado.puntos += suma;
              eventos.alSumar(`+${suma}`, donde.copy(escolta ?? nave));
              avisar();
              continue;
            }
          }
        }
        if (orbe.pos.z > Z_SE_VA) {
          orbe.activo = false;
          continue;
        }
        const achica = orbe.pos.z > Z_ACHICA ? 1 - suave((orbe.pos.z - Z_ACHICA) / (Z_SE_VA - Z_ACHICA)) : 1;
        const escala = escalaNave * achica * (1 + Math.sin(reloj * 4 + orbe.fase) * 0.08);
        // Gira en el plano de la pantalla (las puntas siempre se leen) y cabecea apenas.
        tmp.position.copy(orbe.pos);
        tmp.rotation.set(Math.sin(reloj * 1.3 + orbe.fase) * 0.35, Math.sin(reloj * 1.1 + orbe.fase) * 0.35, reloj * 1.8 + orbe.fase);
        tmp.scale.setScalar(escala);
        tmp.updateMatrix();
        orbes.setMatrixAt(o, tmp.matrix);
        // El núcleo blanco, chico y un poco adelante: es lo que el brillo neón derrama.
        tmp.position.z += 0.15 * escala;
        tmp.scale.setScalar(escala * 0.42);
        tmp.updateMatrix();
        nucleos.setMatrixAt(o, tmp.matrix);
        // El destello en cruz, de frente a la cámara: gira despacio al revés y respira poco (es chico).
        tmp.position.copy(orbe.pos);
        tmp.rotation.set(0, 0, orbe.fase - reloj * DESTELLO.giro);
        tmp.scale.setScalar(escala * DESTELLO.tam * (0.92 + Math.sin(reloj * 2.6 + orbe.fase) * 0.08));
        tmp.updateMatrix();
        destellosOrbe.setMatrixAt(o, tmp.matrix);

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
      orbes.count = nucleos.count = destellosOrbe.count = marcasOrbe.count = o;
      orbes.instanceMatrix.needsUpdate = true;
      nucleos.instanceMatrix.needsUpdate = true;
      destellosOrbe.instanceMatrix.needsUpdate = true;
      marcasOrbe.instanceMatrix.needsUpdate = true;
      if (marcasOrbe.instanceColor) marcasOrbe.instanceColor.needsUpdate = true;

      // ————— Cápsula de ayuda —————
      if (capsula.activa) {
        const antes = capsula.pos.z;
        capsula.pos.z += capsula.vel * dt;
        const tira = atraer(capsula.pos, capsula.paso, dt);
        if (tira > 0.05) campoIman.hilo(capsula.pos, nave, tira);
        const radioCapsula = RADIO_CAPSULA * escalaNave;
        if (!capsula.paso && antes < nave.z && capsula.pos.z >= nave.z) {
          capsula.paso = true;
          // Generosa, como la estrella: con el ancho de la nave, aunque sea finita.
          if (!estado.termino && Math.hypot(capsula.pos.x - nave.x, capsula.pos.y - nave.y) < radioCapsula + Math.max(rx, radioNave * 0.9)) {
            capsula.activa = false;
            activarAyuda(capsula.tipo);
          }
        }
        if (capsula.pos.z > Z_SE_VA) capsula.activa = false;
        if (capsula.activa) {
          const achica = capsula.pos.z > Z_ACHICA ? 1 - suave((capsula.pos.z - Z_ACHICA) / (Z_SE_VA - Z_ACHICA)) : 1;
          const falta = nave.z - capsula.pos.z;
          const prende = capsula.paso ? 0 : THREE.MathUtils.clamp(1 - falta / 32, 0, 1);
          capsulaVista.poner(capsula.tipo, capsula.pos, escalaNave * 1.15 * achica, reloj, capsula.fase, prende, nave.z, radioCapsula);
        } else {
          capsulaVista.ocultar();
        }
      } else {
        capsulaVista.ocultar();
      }

      // ————— Jefe: si se fue solo y no chocaste, premio —————
      jefe.actualizar(m, reloj, dt, nave);
      if (jefeEnCurso && !jefe.presente) {
        jefeEnCurso = false;
        ultimoJefe = jugado;
        estado.jefe = null;
        if (!chocoConJefe && !estado.termino) {
          const premio = PREMIO_JEFE.aguantar * estado.multiplicador;
          estado.puntos += premio;
          eventos.alSumar(`¡Aguantaste al jefe! +${premio}`, donde.copy(nave));
        }
        avisar();
      }

      // ————— Compañía, escudo, imán y efectos —————
      // Con el enjambre, las escoltas van más afuera: al costado están sus drones.
      escoltas.actualizar(m, reloj, dt, nave, escalaNave, habilidad === "drones" ? rx + 1.6 * escalaNave : rx);
      if (habilidad === "drones") drones.actualizar(reloj, dt, nave, escalaNave, rx);

      const escudoAyuda = ayuda?.tipo === "escudo";
      const restaAyuda = ayuda ? (ayuda.hasta - reloj) / DURA_AYUDA : 0;
      // El de la ayuda se va apagando en su último segundo y medio (sin titilar: avisa que se acaba).
      burbuja.meta = escudoAyuda ? 0.5 + 0.5 * THREE.MathUtils.clamp(restaAyuda / 0.19, 0, 1) : habilidad === "escudo" && escudoListo && !estado.termino ? 0.55 : 0;
      metaBurbuja.set(escudoAyuda ? COLOR_AYUDA.escudo : COLOR_NAVE.trompo).lerp(BLANCO, 0.25);
      colorBurbuja.lerp(metaBurbuja, Math.min(1, dt * 6));
      burbuja.actualizar(dt, reloj, nave, control.radio * BURBUJA[modelo].x, control.radio * BURBUJA[modelo].y, colorBurbuja);

      const iman = imanActual();
      const imanAyuda = ayuda?.tipo === "iman";
      campoIman.meta = imanAyuda ? 1 : iman && !estado.termino ? 0.45 : 0;
      metaIman.set(imanAyuda ? COLOR_AYUDA.iman : COLOR_NAVE.anillo);
      colorIman.lerp(metaIman, Math.min(1, dt * 6));
      campoIman.actualizar(dt, reloj, nave, (iman ?? IMAN.habilidad).radio * escalaNave, colorIman);

      laser.actualizar(reloj);
      chispas.actualizar(dt);

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
      geometriaMarcaPeligro.dispose();
      geometriaMarcaEstrella.dispose();
      materialMarca.dispose();
      geometriaEstrella.dispose();
      materialOrbe.dispose();
      materialNucleo.dispose();
      geometriaDestello.dispose();
      materialDestello.dispose();
      texturaDestello.dispose();
      escudo.geometry.dispose();
      (escudo.material as THREE.Material).dispose();
      mallas.forEach((malla) => malla.dispose());
      chispas.liberar();
      capsulaVista.liberar();
      burbuja.liberar();
      campoIman.liberar();
      laser.liberar();
      jefe.liberar();
      escoltas.liberar();
      drones.liberar();
    },
  };
}

export type Juego = ReturnType<typeof crearJuego>;
