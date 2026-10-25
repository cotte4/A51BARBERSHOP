"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { TemaEstudio } from "@/lib/estudio";
import type { RecordPropio, ResumenJuego } from "@/lib/estudio-juego";
import { filtrarTemas } from "@/lib/estudio-lista";
import type { ModeloNave } from "@/lib/estudio-naves";
import { elegirNaveAction, guardarPartidaAction, ordenarTemasAction, sumarEscuchaAction } from "./actions";
import type { ResultadoPartida } from "./_naveJuego";
import Cabecera from "./_Cabecera";
import HojaTema from "./_HojaTema";
import { ColaSubida, useColaSubida } from "./_ColaSubida";
import { FilaTema, ListaOrdenable } from "./_ListaTemas";
import { BarraReproductor, useReproductor } from "./_Reproductor";
import { esMp3 } from "./_subir";

// three.js se baja recién con el primer play.
const Nave = dynamic(() => import("./_Nave"), { ssr: false });

type Hoja = { tipo: "nuevo"; archivo?: File } | { tipo: "editar"; tema: TemaEstudio } | null;

// En la nave la barra del player se baja sola a los 3,5 s; en la compu sale al acercar el mouse abajo.
const BARRA_SE_ESCONDE_MS = 3500;
const ZONA_BARRA_PX = 110;
// La pista de qué se puede hacer en la nave sale las primeras veces que se entra, en este navegador.
const CLAVE_PISTA = "estudio:pistaNave";
const VECES_PISTA = 3;
const PISTA_MS = 5000;

function pistaPendiente(): boolean {
  try {
    const vistas = Number(localStorage.getItem(CLAVE_PISTA)) || 0;
    if (vistas >= VECES_PISTA) return false;
    localStorage.setItem(CLAVE_PISTA, String(vistas + 1));
    return true;
  } catch {
    return false;
  }
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function PausaIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}

function AleatorioIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M3 7h3.5c2 0 3.2 1 4.3 2.7l2.4 4.6c1.1 1.7 2.3 2.7 4.3 2.7H21" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 17h3.5c1.4 0 2.4-.5 3.2-1.3M14.3 8.3c.8-.8 1.8-1.3 3.2-1.3H21" strokeLinecap="round" />
      <path d="M18.5 4.5 21 7l-2.5 2.5M18.5 14.5 21 17l-2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SumarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function OrdenarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M8 4v16M4.5 7.5 8 4l3.5 3.5M16 20V4M12.5 16.5 16 20l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BuscarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

function CerrarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function hayArchivos(evento: DragEvent) {
  return Array.from(evento.dataTransfer?.types ?? []).includes("Files");
}

const pastilla = "flex items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1.5 text-sm font-semibold text-zinc-200 hover:border-[#8cff59]/60 hover:text-[#8cff59]";

/** El mejor de dos récords. A igual puntaje queda el primero: el récord es de quien llegó antes. */
function mejorDeDos(a: RecordPropio | null, b: RecordPropio | null): RecordPropio | null {
  if (!a) return b;
  if (!b) return a;
  return b.puntos > a.puntos ? b : a;
}

/** El resumen con una partida recién terminada, sin esperar a la base. */
function conPartida(resumen: ResumenJuego, temaId: string, { puntos, modelo }: ResultadoPartida): ResumenJuego {
  const previo = resumen.records[temaId] ?? { mio: null, rival: null };
  return {
    ...resumen,
    mejorRecord: Math.max(resumen.mejorRecord, puntos),
    records: { ...resumen.records, [temaId]: { ...previo, mio: mejorDeDos(previo.mio, { puntos, modelo }) } },
  };
}

export default function EstudioClient({ temas, juego }: { temas: TemaEstudio[]; juego: ResumenJuego }) {
  // Escuchas de esta visita: el contador sube al toque, sin esperar a recargar la página.
  const [escuchasNuevas, setEscuchasNuevas] = useState<Record<string, number>>({});
  const [temasVistos, setTemasVistos] = useState(temas);
  if (temas !== temasVistos) {
    // Llegó la lista del servidor (ya trae esas escuchas sumadas): se arranca de cero.
    setTemasVistos(temas);
    setEscuchasNuevas({});
  }
  const alEscuchar = useCallback((id: string) => {
    setEscuchasNuevas((previas) => ({ ...previas, [id]: (previas[id] ?? 0) + 1 }));
    void sumarEscuchaAction(id);
  }, []);

  // El jueguito de la nave (récords por tema y nave elegida). Las actions no refrescan la página (eso
  // cortaría el show): lo que devuelven se guarda acá. Si el servidor manda un resumen nuevo, manda ese.
  const [resumen, setResumen] = useState(juego);
  const [juegoVisto, setJuegoVisto] = useState(juego);
  if (juego !== juegoVisto) {
    setJuegoVisto(juego);
    setResumen(juego);
  }
  // La partida que se está guardando: elegir una nave la espera, porque la base la destraba con ese récord.
  const guardandoRef = useRef<Promise<unknown>>(Promise.resolve());

  const alTerminarPartida = useCallback((temaId: string, resultado: ResultadoPartida): Promise<ModeloNave[] | null> => {
    // Una partida en 0 no es récord de nadie: ni se muestra ni se guarda.
    if (resultado.puntos <= 0) return Promise.resolve(null);
    // Al toque, sin esperar a la base: "Otra vez" y el hangar ya cuentan con esta partida.
    setResumen((previo) => conPartida(previo, temaId, resultado));
    const guardado = guardarPartidaAction({ temaId, puntos: resultado.puntos, modelo: resultado.modelo })
      .then((r) => {
        if (!r.ok) return null;
        setResumen((previo) => ({
          ...previo,
          mejorRecord: Math.max(previo.mejorRecord, r.mejorRecord),
          // El de la base, salvo que acá ya haya uno mejor (una partida posterior que todavía se guarda).
          records: { ...previo.records, [temaId]: { mio: mejorDeDos(r.record.mio, previo.records[temaId]?.mio ?? null), rival: r.record.rival } },
        }));
        return r.nuevas;
      })
      // Sin conexión: el juego sigue igual, con la cuenta local.
      .catch(() => null);
    guardandoRef.current = guardado;
    return guardado;
  }, []);

  const naveElegida = resumen.naveElegida;
  const elegirNave = useCallback(
    async (modelo: ModeloNave) => {
      const anterior = naveElegida;
      // Optimista: la nodriza cambia ya. Si la base no la acepta, vuelve la de antes y el hangar dice por qué.
      setResumen((previo) => ({ ...previo, naveElegida: modelo }));
      await guardandoRef.current;
      const r = await elegirNaveAction(modelo).catch(() => null);
      if (r?.ok) return;
      setResumen((previo) => (previo.naveElegida === modelo ? { ...previo, naveElegida: anterior } : previo));
      throw new Error(r?.mensaje ?? "No se pudo guardar la nave. Probá de nuevo.");
    },
    [naveElegida]
  );

  const reproductor = useReproductor(temas, { alEscuchar });
  const cola = useColaSubida();
  const [hoja, setHoja] = useState<Hoja>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [avisoArrastre, setAvisoArrastre] = useState<string | null>(null);
  const [yaSono, setYaSono] = useState(false);
  const [inmersivo, setInmersivo] = useState(false);
  const [jugando, setJugando] = useState(false);
  const [barraFuera, setBarraFuera] = useState(true);
  const [pista, setPista] = useState(false);
  const esconderRef = useRef<number | null>(null);
  const sosteniendoRef = useRef(false);
  const [busqueda, setBusqueda] = useState("");
  const [genero, setGenero] = useState<string | null>(null);
  // null = lista normal; un arreglo = el ranking mientras se ordena.
  const [ordenando, setOrdenando] = useState<string[] | null>(null);
  const [guardandoOrden, empezarGuardado] = useTransition();
  const [avisoOrden, setAvisoOrden] = useState<string | null>(null);
  const cerrarHoja = useCallback(() => setHoja(null), []);
  const { agregar } = cola;

  if (reproductor.sonando && !yaSono) setYaSono(true);

  const conEscuchas = useMemo(
    () => temas.map((tema) => (escuchasNuevas[tema.id] ? { ...tema, escuchas: tema.escuchas + escuchasNuevas[tema.id] } : tema)),
    [temas, escuchasNuevas]
  );
  const porId = useMemo(() => new Map(conEscuchas.map((tema) => [tema.id, tema])), [conEscuchas]);
  // El puesto es el del ranking completo, aunque la lista esté filtrada.
  const puestos = useMemo(() => new Map(temas.map((tema, i) => [tema.id, i + 1])), [temas]);
  const generos = useMemo(
    () => [...new Set(temas.map((tema) => tema.genero).filter((g): g is string => !!g))].sort(),
    [temas]
  );
  const visibles = useMemo(() => filtrarTemas(conEscuchas, busqueda, genero), [conEscuchas, busqueda, genero]);
  const idsVisibles = useMemo(() => visibles.map((tema) => tema.id), [visibles]);
  const totalEscuchas = conEscuchas.reduce((suma, tema) => suma + tema.escuchas, 0);
  const filtrando = busqueda.trim() !== "" || genero !== null;

  const recibir = useCallback(
    (archivos: File[]) => {
      const mp3s = archivos.filter(esMp3);
      if (mp3s.length === 0) {
        setAvisoArrastre("Solo se pueden subir MP3.");
        return;
      }
      setAvisoArrastre(mp3s.length < archivos.length ? "Algunos archivos no eran MP3 y quedaron afuera." : null);
      // Uno solo: se abre el formulario para ponerle género y portada. Varios: van en fila.
      if (mp3s.length === 1) setHoja({ tipo: "nuevo", archivo: mp3s[0] });
      else agregar(mp3s);
    },
    [agregar]
  );

  // Arrastrar MP3 a cualquier parte de la página.
  useEffect(() => {
    let profundidad = 0;
    const entrar = (evento: DragEvent) => {
      if (!hayArchivos(evento)) return;
      evento.preventDefault();
      profundidad++;
      setArrastrando(true);
    };
    const sobre = (evento: DragEvent) => {
      if (!hayArchivos(evento)) return;
      evento.preventDefault();
      if (evento.dataTransfer) evento.dataTransfer.dropEffect = "copy";
    };
    const salir = (evento: DragEvent) => {
      if (!hayArchivos(evento)) return;
      profundidad = Math.max(0, profundidad - 1);
      if (profundidad === 0) setArrastrando(false);
    };
    const soltar = (evento: DragEvent) => {
      if (!hayArchivos(evento)) return;
      evento.preventDefault();
      profundidad = 0;
      setArrastrando(false);
      recibir(Array.from(evento.dataTransfer?.files ?? []));
    };
    window.addEventListener("dragenter", entrar);
    window.addEventListener("dragover", sobre);
    window.addEventListener("dragleave", salir);
    window.addEventListener("drop", soltar);
    return () => {
      window.removeEventListener("dragenter", entrar);
      window.removeEventListener("dragover", sobre);
      window.removeEventListener("dragleave", salir);
      window.removeEventListener("drop", soltar);
    };
  }, [recibir]);

  const programarEsconder = useCallback(() => {
    if (esconderRef.current !== null) window.clearTimeout(esconderRef.current);
    esconderRef.current = window.setTimeout(() => {
      if (!sosteniendoRef.current) setBarraFuera(false);
    }, BARRA_SE_ESCONDE_MS);
  }, []);

  const mostrarBarra = useCallback(() => {
    setBarraFuera(true);
    programarEsconder();
  }, [programarEsconder]);

  const sostenerBarra = useCallback(
    (sostiene: boolean) => {
      sosteniendoRef.current = sostiene;
      if (sostiene && esconderRef.current !== null) window.clearTimeout(esconderRef.current);
      if (!sostiene) programarEsconder();
    },
    [programarEsconder]
  );

  const alternarNave = () => {
    if (inmersivo) {
      setInmersivo(false);
      return;
    }
    setInmersivo(true);
    // Al entrar la barra se ve un momento (para saber que está) y después se baja.
    mostrarBarra();
    if (pistaPendiente()) {
      setPista(true);
      window.setTimeout(() => setPista(false), PISTA_MS);
    }
  };

  useEffect(() => {
    if (!inmersivo) return;
    const alTeclear = (evento: KeyboardEvent) => {
      // Jugando, Esc sale del juego (lo maneja la nave), no de la nave.
      if (evento.key === "Escape" && !jugando) setInmersivo(false);
    };
    // En la compu, la barra sale al acercar el mouse abajo (jugando no: el mouse maneja la nave).
    const alMover = (evento: PointerEvent) => {
      if (evento.pointerType === "mouse" && !jugando && evento.clientY > window.innerHeight - ZONA_BARRA_PX) mostrarBarra();
    };
    window.addEventListener("keydown", alTeclear);
    window.addEventListener("pointermove", alMover);
    return () => {
      window.removeEventListener("keydown", alTeclear);
      window.removeEventListener("pointermove", alMover);
    };
  }, [inmersivo, jugando, mostrarBarra]);

  useEffect(
    () => () => {
      if (esconderRef.current !== null) window.clearTimeout(esconderRef.current);
    },
    []
  );

  const empezarAOrdenar = () => {
    // El ranking se ordena sobre la lista completa.
    setBusqueda("");
    setGenero(null);
    setAvisoOrden(null);
    setOrdenando(temas.map((tema) => tema.id));
  };

  const guardarOrden = () => {
    if (!ordenando) return;
    if (ordenando.every((id, i) => temas[i]?.id === id)) {
      setOrdenando(null);
      return;
    }
    const pedido = ordenando;
    empezarGuardado(async () => {
      const resultado = await ordenarTemasAction(pedido);
      if (resultado.ok) setOrdenando(null);
      else setAvisoOrden(resultado.mensaje ?? "No se pudo guardar el orden.");
    });
  };

  const actual = reproductor.actual;
  const suenaEstaLista = !!actual && reproductor.sonando && idsVisibles.includes(actual.id);
  // En la nave la barra se esconde mientras suena; en pausa queda a mano (para darle play).
  const barraEscondida = inmersivo && reproductor.sonando && (jugando || !barraFuera);

  return (
    <>
      {/* Mientras suena, la lista se vuelve un vidrio oscuro: la nave se ve atrás. */}
      <div
        className={`relative z-10 flex flex-col gap-5 ${
          reproductor.sonando ? "[&_.panel-card]:bg-none! [&_.panel-card]:bg-zinc-950/55! [&_.panel-card]:backdrop-blur-[3px] [&_.panel-card]:transition-colors" : ""
        }`}
      >
        <Cabecera temas={conEscuchas} escuchas={totalEscuchas} />

        {ordenando ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-300">Arrastrá desde las rayitas para armar el ranking.</p>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => setOrdenando(null)} disabled={guardandoOrden} className="rounded-full px-3 py-1.5 text-sm text-zinc-400 hover:text-white">
                Cancelar
              </button>
              <button type="button" onClick={guardarOrden} disabled={guardandoOrden} className="rounded-full bg-[#8cff59] px-4 py-1.5 text-sm font-semibold text-[#07130a] disabled:opacity-60">
                {guardandoOrden ? "Guardando…" : "Listo"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setHoja({ tipo: "nuevo" })} className={pastilla}>
                <SumarIcon />
                Subir
              </button>
              {temas.length > 1 ? (
                <button type="button" onClick={empezarAOrdenar} className={pastilla}>
                  <OrdenarIcon />
                  Ordenar
                </button>
              ) : null}
            </div>
            {visibles.length > 0 ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={reproductor.alternarAleatorio}
                  aria-pressed={reproductor.aleatorio}
                  aria-label={reproductor.aleatorio ? "Apagar aleatorio" : "Prender aleatorio"}
                  className={`relative rounded-full p-2 ${reproductor.aleatorio ? "text-[#8cff59]" : "text-zinc-400 hover:text-white"}`}
                >
                  <AleatorioIcon />
                  {/* El puntito de Spotify: dice que está prendido sin depender solo del color. */}
                  {reproductor.aleatorio ? <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#8cff59]" /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => reproductor.reproducirLista(idsVisibles)}
                  aria-label={suenaEstaLista ? "Pausar" : "Reproducir la lista"}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-[#8cff59] text-[#07130a] shadow-[0_8px_24px_rgba(140,255,89,0.25)] hover:scale-105"
                >
                  {suenaEstaLista ? <PausaIcon /> : <PlayIcon />}
                </button>
              </div>
            ) : null}
          </div>
        )}
        {ordenando ? null : <p className="-mt-3 hidden text-sm text-zinc-500 sm:block">Para subir, también podés arrastrar los MP3 acá, uno o varios.</p>}

        {avisoArrastre ? (
          <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">{avisoArrastre}</p>
        ) : null}
        {avisoOrden ? <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">{avisoOrden}</p> : null}

        <ColaSubida cola={cola} />

        {temas.length === 0 ? (
          <p className="panel-soft rounded-[22px] p-5 text-center text-zinc-400">Todavía no hay temas. Subí el primero.</p>
        ) : ordenando ? (
          <ListaOrdenable temas={porId} orden={ordenando} onOrden={setOrdenando} />
        ) : (
          <>
            <div className="flex flex-col gap-3">
              <label className="relative block">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  <BuscarIcon />
                </span>
                <input
                  type="search"
                  value={busqueda}
                  onChange={(evento) => setBusqueda(evento.target.value)}
                  placeholder="Buscar en el Estudio"
                  aria-label="Buscar un tema por nombre"
                  className="w-full rounded-xl border border-transparent bg-white/8 py-2.5 pl-9 pr-9 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/50 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                />
                {busqueda ? (
                  <button
                    type="button"
                    onClick={() => setBusqueda("")}
                    aria-label="Borrar la búsqueda"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-400 hover:text-white"
                  >
                    <CerrarIcon />
                  </button>
                ) : null}
              </label>
              {generos.length > 0 ? (
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[null, ...generos].map((opcion) => {
                    const elegido = genero === opcion;
                    return (
                      <button
                        key={opcion ?? "todos"}
                        type="button"
                        onClick={() => setGenero(opcion)}
                        aria-pressed={elegido}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                          elegido ? "bg-[#8cff59] text-[#07130a]" : "bg-white/8 text-zinc-200 hover:bg-white/12"
                        }`}
                      >
                        {opcion ?? "Todos"}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {visibles.length === 0 ? (
              <div className="panel-soft rounded-[22px] p-5 text-center text-zinc-400">
                <p>No hay temas que coincidan.</p>
                <button
                  type="button"
                  onClick={() => {
                    setBusqueda("");
                    setGenero(null);
                  }}
                  className="mt-2 text-sm font-semibold text-[#8cff59] hover:underline"
                >
                  Ver todos
                </button>
              </div>
            ) : (
              <section className="panel-card rounded-[28px] p-2">
                <ul className="flex flex-col">
                  {visibles.map((tema) => (
                    <FilaTema
                      key={tema.id}
                      tema={tema}
                      puesto={puestos.get(tema.id) ?? 0}
                      esActual={actual?.id === tema.id}
                      sonando={reproductor.sonando}
                      onTocar={() => reproductor.reproducir(tema.id, idsVisibles)}
                      onOpciones={() => setHoja({ tipo: "editar", tema })}
                    />
                  ))}
                </ul>
                {filtrando ? (
                  <p className="px-3 pb-2 pt-1 text-xs text-zinc-500">
                    {visibles.length} de {temas.length} · el play y el aleatorio usan esta lista
                  </p>
                ) : null}
              </section>
            )}
          </>
        )}
      </div>

      {yaSono ? (
        <>
          {inmersivo ? <div className="fixed inset-0 z-[29] bg-[#040705]" /> : null}
          <div className={`pointer-events-none fixed inset-0 ${inmersivo ? "z-30" : "z-0"}`}>
            <Nave
              audioRef={reproductor.audioRef}
              temaId={actual?.id ?? null}
              sonando={reproductor.sonando}
              interactiva={inmersivo}
              onJuego={setJugando}
              resumen={resumen}
              onPartida={alTerminarPartida}
              onElegirNave={elegirNave}
            />
          </div>
        </>
      ) : null}

      {inmersivo ? (
        <p
          aria-hidden={!pista}
          className={`pointer-events-none fixed inset-x-4 top-[max(env(safe-area-inset-top),16px)] z-[31] mx-auto w-fit rounded-full bg-zinc-950/65 px-4 py-2 text-center text-sm text-zinc-200 backdrop-blur transition-opacity duration-500 ${
            pista && !jugando ? "opacity-100" : "opacity-0"
          }`}
        >
          Tocá todo · Mantené apretada la nave para jugar
        </p>
      ) : null}

      <BarraReproductor
        reproductor={reproductor}
        onNave={alternarNave}
        naveAbierta={inmersivo}
        escondida={barraEscondida}
        onMostrar={mostrarBarra}
        onSostener={sostenerBarra}
      />

      {arrastrando ? (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-6">
          <div className="flex h-full w-full max-w-xl items-center justify-center rounded-[28px] border-2 border-dashed border-[#8cff59]/70">
            <p className="font-display text-2xl font-semibold text-[#8cff59]">Soltá los MP3 acá</p>
          </div>
        </div>
      ) : null}

      {hoja ? (
        <HojaTema
          key={hoja.tipo === "editar" ? hoja.tema.id : (hoja.archivo?.name ?? "nuevo")}
          modo={hoja}
          generos={generos}
          onCerrar={cerrarHoja}
        />
      ) : null}
    </>
  );
}
