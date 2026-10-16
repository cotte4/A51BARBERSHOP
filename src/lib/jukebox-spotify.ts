import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jukeboxProposals, musicProviderConnections } from "@/db/schema";
import {
  aplicarDecision,
  arrancarSiHaceFalta,
  descartarViejos,
  enqueueApproved,
  getNowPlaying,
  guardarUriDeSpotify,
  isAutoApproveEnabled,
  itemsVivos,
  liberarEnvio,
  listPendingProposals,
  listQueue,
  olvidarEnviosASpotify,
  reservarEnvio,
  skipCurrent,
  waitingBlock,
  type JukeboxProposalSummary,
  type JukeboxQueueItem,
} from "@/lib/jukebox";
import { decidirJukebox, seQuedoAlFinal, VIDA_MAXIMA_MS, type ItemVivo, type Reproduccion } from "@/lib/jukebox-decidir";
import {
  fotoVigente,
  guardarFoto,
  guardarFuente,
  leerRuntime,
  reclamarTurno,
  soltarTurno,
  type FotoSpotify,
  type FuenteJukebox,
} from "@/lib/jukebox-runtime";
import { videoParaTema } from "@/lib/jukebox-youtube";
import {
  addTrackToQueue,
  getCurrentPlayback,
  listDevices,
  pausePlayback,
  playTrack,
  resumePlayback,
  skipToNext,
  SpotifyApiError,
  type SpotifyDevice,
  type SpotifyPlaybackState,
} from "@/lib/spotify-api";
import { buscarEnCatalogo, DURACION_MAXIMA_SEGUNDOS, temaDelCatalogo } from "@/lib/spotify-catalogo";
import { spotifyAdapter } from "@/lib/spotify-server";

// El "latido": cada sondeo de la jukebox (la pantalla del staff, los celulares del público, la tele) lo
// dispara, pero solo uno a la vez y cada pocos segundos habla de verdad con Spotify (ver reclamarTurno).
// Mira qué suena, decide con decidirJukebox qué hacer con la cola y deja una foto para que el resto la lea.
// No hace falta ninguna pantalla abierta en particular: con que alguien mire la jukebox, la cola avanza.

const CADA_MS = 4_000;
const APURADO_MS = 1_000;

/** Un latido. `apurado`: alguien acaba de sumar un tema y conviene mandarlo ya, sin esperar el turno. */
export async function latidoJukebox({ apurado = false }: { apurado?: boolean } = {}): Promise<void> {
  try {
    const { fuente, foto } = await leerRuntime();
    if (fuente !== "spotify") return;
    // Spotify pidió esperar (o viene fallando igual): no se le insiste.
    if (foto?.pausaHasta && new Date(foto.pausaHasta).getTime() > Date.now()) return;
    if (!(await reclamarTurno(apurado ? APURADO_MS : CADA_MS))) return;
    try {
      await sincronizar(foto);
    } finally {
      await soltarTurno();
    }
  } catch (error) {
    console.error("Jukebox: el latido falló", error);
  }
}

function mensajeDeError(error: unknown): string {
  if (error instanceof SpotifyApiError) {
    if (error.status === 401) return "Spotify pide volver a conectar la cuenta.";
    if (error.status === 403) {
      return "Spotify no deja manejar esta cuenta. Tiene que ser Premium y estar anotada en la app de Spotify.";
    }
    if (error.status === 404) return "Spotify no está abierto en ningún celular ni parlante.";
    if (error.status === 429) return "Spotify pidió esperar un momento. Se reintenta solo.";
  }
  return "Spotify no respondió. Se reintenta solo.";
}

/** Cuánto dejar de hablarle a Spotify tras un error: lo que pida (429), o un rato si es uno que se repite (403). */
function pausaPorError(error: unknown): string | null {
  if (!(error instanceof SpotifyApiError)) return null;
  const segundos = error.status === 429 ? (error.retryAfterSeconds ?? 30) : error.status === 403 ? 60 : 0;
  return segundos > 0 ? new Date(Date.now() + segundos * 1000).toISOString() : null;
}

async function tokenDelLocal(): Promise<{ token: string | null; estado: FotoSpotify["conexion"]; error: string | null }> {
  const conexion = await spotifyAdapter.refreshConnection();
  if (conexion?.accessToken) return { token: conexion.accessToken, estado: "conectado", error: null };
  return {
    token: null,
    estado: conexion?.status === "error" ? "error" : "desconectado",
    error: conexion?.status === "error" ? "Spotify pide volver a conectar la cuenta." : null,
  };
}

async function exigirToken(): Promise<string> {
  const { token, error } = await tokenDelLocal();
  if (!token) throw new Error(error ?? "Conectá Spotify primero.");
  return token;
}

/** De quién es el Spotify conectado. Se pregunta una vez y queda guardado. */
async function nombreDeLaCuenta(token: string): Promise<string | null> {
  const [fila] = await db
    .select({ nombre: musicProviderConnections.accountName })
    .from(musicProviderConnections)
    .where(eq(musicProviderConnections.id, "spotify"))
    .limit(1);
  if (fila?.nombre) return fila.nombre;

  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const yo = (await res.json()) as { display_name?: string | null; id?: string };
  const nombre = yo.display_name || yo.id || null;
  if (nombre) {
    await db
      .update(musicProviderConnections)
      .set({ accountName: nombre })
      .where(eq(musicProviderConnections.id, "spotify"));
  }
  return nombre;
}

function elegirDispositivo(dispositivos: SpotifyDevice[]): SpotifyDevice | null {
  const usables = dispositivos.filter((d) => !d.isRestricted);
  return usables.find((d) => d.isActive) ?? usables[0] ?? null;
}

function aVivos(filas: Awaited<ReturnType<typeof itemsVivos>>): ItemVivo[] {
  return filas.map((f) => ({
    id: f.id,
    estado: f.estado === "playing" ? "playing" : "queued",
    uri: f.uri,
    posicion: f.posicion,
    enviadoEn: f.enviadoEn,
    empezoEn: f.empezoEn,
    duracionSegundos: f.duracionSegundos,
    creadoEn: f.creadoEn,
  }));
}

function aReproduccion(playback: SpotifyPlaybackState | null): Reproduccion {
  return playback
    ? {
        uri: playback.item?.uri ?? null,
        sonando: playback.isPlaying,
        progresoMs: playback.progressMs ?? 0,
        duracionMs: playback.item?.durationMs ?? 0,
      }
    : null;
}

function proximoParaMandar(vivos: ItemVivo[]): ItemVivo | undefined {
  return vivos
    .filter((v) => v.estado === "queued" && !v.enviadoEn && v.uri)
    .sort((a, b) => a.posicion - b.posicion)[0];
}

async function sincronizar(anterior: FotoSpotify | null): Promise<void> {
  const base = { en: new Date().toISOString(), tema: null, progresoMs: 0, duracionMs: 0, dispositivo: null };
  const { token, estado: conexion, error: errorConexion } = await tokenDelLocal();
  if (!token) {
    await guardarFoto({ ...base, conexion, cuenta: null, estado: "sin_dispositivo", error: errorConexion });
    return;
  }

  const cuenta = await nombreDeLaCuenta(token).catch(() => null);

  let playback: SpotifyPlaybackState | null;
  try {
    playback = await getCurrentPlayback(token);
  } catch (error) {
    await guardarFoto({
      ...base,
      conexion: "conectado",
      cuenta,
      estado: "sin_dispositivo",
      error: mensajeDeError(error),
      pausaHasta: pausaPorError(error),
    });
    return;
  }

  const filas = await itemsVivos();
  const descartarSinTema: string[] = [];

  // Un tema que entró mientras sonaba YouTube no tiene tema de Spotify: se le busca uno cuando le toca.
  // Si la búsqueda falla (red, límite) se reintenta en el próximo latido; solo se descarta si no existe.
  const sinUri = filas
    .filter((f) => f.estado === "queued" && !f.enviadoEn && !f.uri)
    .sort((a, b) => a.posicion - b.posicion)[0];
  if (sinUri) {
    const encontrados = await buscarEnCatalogo(`${sinUri.titulo} ${sinUri.artistas}`).catch(() => null);
    if (encontrados?.[0]) {
      await guardarUriDeSpotify(sinUri.proposalId, encontrados[0].uri);
      sinUri.uri = encontrados[0].uri;
    } else if (encontrados) {
      descartarSinTema.push(sinUri.id);
    }
  }

  const reproduccion = aReproduccion(playback);

  // Los dispositivos solo hacen falta si no hay nada puesto (para arrancar en alguno).
  const dispositivos = reproduccion?.uri ? [] : await listDevices(token).catch(() => []);
  const dispositivo = playback?.device ?? elegirDispositivo(dispositivos);
  // Dos lecturas vacías seguidas (la anterior reciente y sin tema) no son un parpadeo de Spotify.
  const vigente = fotoVigente(anterior, 30_000);
  const anteriorVacia = !!vigente && vigente.conexion === "conectado" && !vigente.tema;

  const decision = decidirJukebox({
    items: aVivos(filas),
    reproduccion,
    hayDispositivo: dispositivo !== null,
    ahora: new Date(),
    anteriorVacia,
  });

  let error: string | null = null;
  let pausaHasta: string | null = null;
  const terminan = [...decision.terminan];
  // Se reserva antes de mandar: si otro latido o "Quitar" se adelantó, no se manda nada.
  if (decision.enviar && (await reservarEnvio(decision.enviar.id))) {
    try {
      if (decision.enviar.modo === "cola") {
        await addTrackToQueue(token, decision.enviar.uri, playback?.device?.id ?? null);
      } else {
        await playTrack(token, { deviceId: dispositivo?.id ?? null, trackUri: decision.enviar.uri });
        terminan.push(...decision.terminanSiArranca);
      }
    } catch (e) {
      await liberarEnvio(decision.enviar.id);
      error = mensajeDeError(e);
      pausaHasta = pausaPorError(e);
    }
  }

  await aplicarDecision({
    empieza: decision.empieza,
    terminan,
    descartan: [...decision.descartan, ...descartarSinTema],
  });

  const item = playback?.item ?? null;
  await guardarFoto({
    ...base,
    conexion: "conectado",
    cuenta,
    estado: playback?.isPlaying ? "sonando" : playback?.item || dispositivo ? "pausa" : "sin_dispositivo",
    tema: item
      ? { uri: item.uri, nombre: item.name, artistas: item.artists.join(", "), tapa: item.albumImageUrl }
      : null,
    progresoMs: playback?.progressMs ?? 0,
    duracionMs: item?.durationMs ?? 0,
    dispositivo: dispositivo?.name ?? null,
    error,
    pausaHasta,
  });
}

// ————————————————————————————
// Controles del staff
// ————————————————————————————

/** Un error de Spotify, dicho para Pinky. */
function enCastellano(error: unknown): never {
  if (error instanceof SpotifyApiError) throw new Error(mensajeDeError(error));
  throw error;
}

/** Reserva y manda un tema; si Spotify no lo acepta, lo deja esperando de nuevo. false = otro se adelantó. */
async function mandar(item: ItemVivo, enviar: () => Promise<void>): Promise<boolean> {
  if (!(await reservarEnvio(item.id))) return false;
  try {
    await enviar();
    return true;
  } catch (error) {
    await liberarEnvio(item.id);
    enCastellano(error);
  }
}

/** Corta lo que suena (sea de la cola o de la lista de Pinky) y deja sonando el próximo de la cola. */
export async function saltarJukebox(): Promise<void> {
  const { fuente } = await leerRuntime();
  if (fuente === "youtube") {
    await skipCurrent();
    return;
  }

  const token = await exigirToken();
  try {
    const playback = await getCurrentPlayback(token);
    if (!playback?.item) throw new Error("No hay nada sonando en Spotify.");

    const vivos = aVivos(await itemsVivos());
    const sonando = vivos.find((v) => v.estado === "playing");
    const hayEnviado = vivos.some((v) => v.estado === "queued" && v.enviadoEn);
    const deviceId = playback.device?.id ?? null;

    // Spotify salta al próximo de su cola: si no le mandamos el nuestro, saltaría a la lista de Pinky.
    const proximo = hayEnviado ? undefined : proximoParaMandar(vivos);
    if (proximo?.uri) {
      const uri = proximo.uri;
      await mandar(proximo, () => addTrackToQueue(token, uri, deviceId));
    }

    await skipToNext(token, deviceId);
    if (sonando && sonando.uri === playback.item.uri) await skipCurrent();
  } catch (error) {
    enCastellano(error);
  }
}

/**
 * Pausa o play. Si Spotify se frenó porque terminó un tema, Play arranca el próximo de la cola (no repite
 * el que ya sonó). Sin nada puesto, arranca la cola (o lo último de Spotify) en el dispositivo que haya.
 */
export async function pausaOPlayJukebox(): Promise<"pausa" | "sonando"> {
  const token = await exigirToken();
  try {
    const playback = await getCurrentPlayback(token);
    if (playback?.isPlaying) {
      await pausePlayback(token, playback.device?.id ?? null);
      return "pausa";
    }

    const vivos = aVivos(await itemsVivos());
    const sonando = vivos.find((v) => v.estado === "playing");
    const reproduccion = aReproduccion(playback);
    const nuestroYaPaso =
      !!sonando &&
      sonando.uri === reproduccion?.uri &&
      Date.now() - (sonando.empezoEn ?? sonando.creadoEn).getTime() > (sonando.duracionSegundos ?? 0) * 1000;

    if (playback?.item && !seQuedoAlFinal(reproduccion, nuestroYaPaso)) {
      await resumePlayback(token, playback.device?.id ?? null);
      return "sonando";
    }

    const dispositivo = playback?.device ?? elegirDispositivo(await listDevices(token));
    if (!dispositivo) throw new Error("Abrí Spotify en el celu o el parlante y volvé a tocar.");

    const proximo = proximoParaMandar(vivos);
    if (proximo?.uri) {
      const uri = proximo.uri;
      if (await mandar(proximo, () => playTrack(token, { deviceId: dispositivo.id, trackUri: uri }))) {
        if (sonando) await aplicarDecision({ empieza: null, terminan: [sonando.id], descartan: [] });
        return "sonando";
      }
    }
    await resumePlayback(token, dispositivo.id);
    return "sonando";
  } catch (error) {
    enCastellano(error);
  }
}

/**
 * Pasa la música a Spotify o a YouTube (la salida de emergencia). Lo que sonaba en la otra fuente se da
 * por pasado; lo que esperaba sigue esperando, en el mismo orden. Devuelve un aviso si algo quedó a medias.
 */
export async function cambiarFuenteJukebox(fuente: FuenteJukebox): Promise<string | null> {
  if (fuente === "youtube") {
    // Primero la fuente: desde acá ningún latido manda nada a Spotify (reservarEnvio la revisa).
    await guardarFuente("youtube");
    await olvidarEnviosASpotify();
    await skipCurrent({ comoTerminado: true });
    await arrancarSiHaceFalta();
    // Si el Spotify del local sigue sonando, se pisarían: se pausa, y si no se puede, se avisa.
    const { token } = await tokenDelLocal().catch(() => ({ token: null }));
    if (!token) return null;
    try {
      await pausePlayback(token);
      return null;
    } catch (error) {
      // 404 = Spotify no está abierto en ningún lado: no hay nada que pausar.
      if (error instanceof SpotifyApiError && error.status === 404) return null;
      return "No pude pausar Spotify: pausalo a mano para que no suenen los dos.";
    }
  }
  await guardarFuente("spotify");
  await skipCurrent({ comoTerminado: true });
  await latidoJukebox({ apurado: true });
  return null;
}

/** Pinky suma un tema directo a la cola: sin aprobación, sin espera y sin el tope del público. */
export async function sumarTemaDelStaff({
  trackId,
  alFrente,
  nombre,
}: {
  trackId: string;
  alFrente: boolean;
  nombre: string;
}): Promise<void> {
  const tema = await temaDelCatalogo(trackId);
  if (!tema) throw new Error("Ese tema no se puede pasar.");
  if (tema.duracionSegundos > DURACION_MAXIMA_SEGUNDOS) throw new Error("Ese tema dura más de 7 minutos.");
  if ((await waitingBlock(tema.uri)) === "repetido") throw new Error("Ese tema ya está en la cola.");

  const [propuesta] = await db
    .insert(jukeboxProposals)
    .values({
      spotifyTrackUri: tema.uri,
      videoTitle: tema.nombre.slice(0, 200),
      channelTitle: tema.artistas.slice(0, 100),
      thumbnailUrl: tema.tapa,
      durationSeconds: tema.duracionSegundos,
      proposedByName: nombre.slice(0, 40),
      deviceKeyHash: "staff",
      status: "approved",
      autoApproved: true,
      resolvedAt: new Date(),
    })
    .returning({ id: jukeboxProposals.id });
  if (!propuesta) throw new Error("No pude sumar el tema.");

  await enqueueApproved(propuesta.id, { alFrente });
  await latidoJukebox({ apurado: true });
}

// ————————————————————————————
// Lo que ve el staff
// ————————————————————————————

export type JukeboxStaffState = {
  nowPlaying: JukeboxQueueItem | null;
  queue: JukeboxQueueItem[];
  proposals: JukeboxProposalSummary[];
  autoApprove: boolean;
  fuente: FuenteJukebox;
  /** null en modo YouTube, o si todavía nadie miró Spotify. */
  spotify: FotoSpotify | null;
  /** Modo YouTube: algo que Pinky tiene que saber (sin cuota, sin clave). */
  aviso: string | null;
};

/**
 * Modo YouTube: el tema que suena tiene que tener video (se busca recién ahora). Solo se salta si se
 * confirmó que no hay video; si la búsqueda falló, el tema espera y Pinky ve el aviso.
 */
async function asegurarVideos(): Promise<string | null> {
  const filas = await itemsVivos();
  await descartarViejos(
    filas
      .filter((f) => f.estado === "queued" && !f.enviadoEn && Date.now() - f.creadoEn.getTime() > VIDA_MAXIMA_MS)
      .map((f) => f.id),
  );

  const sonando = await getNowPlaying();
  if (!sonando || sonando.youtubeVideoId) return null;
  const video = await videoParaTema({
    proposalId: sonando.proposalId,
    titulo: sonando.videoTitle,
    artistas: sonando.channelTitle,
    duracionSegundos: sonando.durationSeconds,
  });
  if (video.tipo === "sin_video") await skipCurrent();
  return video.tipo === "fallo" ? video.motivo : null;
}

export async function getJukeboxStaffState(): Promise<JukeboxStaffState> {
  const runtime = await leerRuntime();
  const aviso = runtime.fuente === "youtube" ? await asegurarVideos() : null;

  const [queue, proposals, autoApprove] = await Promise.all([
    listQueue(),
    listPendingProposals(),
    isAutoApproveEnabled(),
  ]);
  return {
    nowPlaying: queue.find((item) => item.state === "playing") ?? null,
    queue,
    proposals,
    autoApprove,
    fuente: runtime.fuente,
    spotify: runtime.fuente === "spotify" ? runtime.foto : null,
    aviso,
  };
}
