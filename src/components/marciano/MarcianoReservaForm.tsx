"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatARS } from "@/lib/format";

type MarcianoReservaFormProps = {
  slug: string;
  initialFecha: string;
  clientName: string;
  clientPhoneRaw: string;
  services: Array<{
    id: string;
    nombre: string;
    precioBase: string | null;
    duracionMinutos: number;
  }>;
  reprogramarTurno?: {
    id: string;
    fecha: string;
    horaInicio: string;
    servicioNombre: string | null;
  } | null;
  initialServicioId?: string;
  initialNota?: string | null;
};

type Slot = {
  id: string;
  fecha: string;
  horaInicio: string;
  duracionMinutos: number;
};

type SpotifyTrackOption = {
  id: string;
  uri: string;
  name: string;
  artistNames: string[];
  albumName: string;
  imageUrl: string;
};

export default function MarcianoReservaForm({
  slug,
  initialFecha,
  clientName,
  clientPhoneRaw,
  services,
  reprogramarTurno,
  initialServicioId,
  initialNota,
}: MarcianoReservaFormProps) {
  const [fecha, setFecha] = useState(initialFecha);
  const [selectedServicioId, setSelectedServicioId] = useState(
    initialServicioId ?? services[0]?.id ?? ""
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [notaCliente, setNotaCliente] = useState(initialNota ?? "");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancion, setCancion] = useState("");
  const [spotifyTrackUri, setSpotifyTrackUri] = useState("");
  const [trackResults, setTrackResults] = useState<SpotifyTrackOption[]>([]);
  const [searchingTracks, setSearchingTracks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedServicio = services.find((service) => service.id === selectedServicioId) ?? null;

  useEffect(() => {
    if (!selectedServicio) {
      setSlots([]);
      setSelectedSlot("");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const servicioActual = selectedServicio;

    async function loadSlots() {
      setLoadingSlots(true);
      setLoadError(null);

      try {
        const response = await fetch(
          `/api/turnos/disponibles?slug=${encodeURIComponent(slug)}&fecha=${encodeURIComponent(
            fecha
          )}&duracion=${servicioActual.duracionMinutos}`,
          { signal: controller.signal }
        );
        const data = (await response.json()) as { slots?: Slot[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "No pudimos cargar los horarios.");
        }

        if (!cancelled) {
          setSlots(data.slots ?? []);
          setSelectedSlot("");
        }
      } catch (loadErr) {
        if (!cancelled && !controller.signal.aborted) {
          setLoadError(
            loadErr instanceof Error ? loadErr.message : "No pudimos cargar los horarios."
          );
          setSlots([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingSlots(false);
        }
      }
    }

    void loadSlots();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [fecha, selectedServicio, slug]);

  async function handleSpotifySearch() {
    const query = cancion.trim();
    if (query.length < 2) {
      setTrackResults([]);
      return;
    }

    setSearchingTracks(true);
    setError(null);

    try {
      const response = await fetch(`/api/spotify/search-track?q=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        tracks?: SpotifyTrackOption[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No pude buscar canciones.");
      }

      setTrackResults(data.tracks ?? []);
    } catch (searchErr) {
      setError(searchErr instanceof Error ? searchErr.message : "No pude buscar canciones.");
      setTrackResults([]);
    } finally {
      setSearchingTracks(false);
    }
  }

  function handleSongInputChange(value: string) {
    setCancion(value);
    setSpotifyTrackUri("");
  }

  function selectTrack(track: SpotifyTrackOption) {
    setCancion(`${track.name} - ${track.artistNames[0] ?? "Spotify"}`);
    setSpotifyTrackUri(track.uri);
    setTrackResults([]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedServicio) {
      setError("Elegi un servicio antes de seguir.");
      return;
    }

    if (!selectedSlot) {
      setError("Elegi un horario disponible.");
      return;
    }

    const slot = slots.find((item) => item.id === selectedSlot);
    if (!slot) {
      setError("Ese horario ya no esta disponible.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      slug,
      slotId: slot.id,
      serviceId: selectedServicio.id,
      clienteNombre: clientName,
      clienteTelefonoRaw: clientPhoneRaw,
      notaCliente,
      sugerenciaCancion: cancion,
      spotifyTrackUri,
    };

    try {
      const response = await fetch("/api/turnos/reservar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "No pude guardar la reserva.");
      }
      setSuccess(true);
    } catch (submitErr) {
      setError(submitErr instanceof Error ? submitErr.message : "No pude guardar la reserva.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-[28px] border border-emerald-500/30 bg-emerald-500/15 p-6 text-center">
        <h2 className="text-xl font-semibold text-emerald-300">Solicitud enviada</h2>
        <p className="mt-2 text-sm text-emerald-300">
          {reprogramarTurno
            ? "La nueva reserva quedo enviada y el turno anterior se va a cancelar automaticamente."
            : "A51 va a revisar tu pedido y confirmar el turno."}
        </p>
      </div>
    );
  }

  const noteLength = notaCliente.trim().length;
  const selectedSlotLabel = selectedSlot
    ? slots.find((slot) => slot.id === selectedSlot)?.horaInicio ?? "No disponible"
    : "Pendiente";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="serviceId" value={selectedServicioId} />
      <input type="hidden" name="slotId" value={selectedSlot} />
      <input type="hidden" name="reprogramarTurnoId" value={reprogramarTurno?.id ?? ""} />

      {reprogramarTurno ? (
        <div className="rounded-[24px] border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
          Estas reprogramando tu turno de {formatTurnoDate(reprogramarTurno.fecha)} a las{" "}
          {reprogramarTurno.horaInicio}. Cuando confirmes el nuevo horario, el turno anterior se
          cancela automaticamente.
        </div>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <section className="public-panel rounded-[28px] p-5">
            <p className="eyebrow text-zinc-500">Tus datos</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SummaryTile label="Nombre" value={clientName} />
              <SummaryTile label="Telefono" value={clientPhoneRaw} />
            </div>
            <p className="mt-3 text-sm text-zinc-400">
              Si queres corregir estos datos antes de reservar, hacelo desde{" "}
              <Link href="/marciano/perfil" className="text-[#8cff59] hover:text-[#b6ff84]">
                tu perfil
              </Link>
              .
            </p>
          </section>

          <section className="public-panel rounded-[28px] p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow text-zinc-500">Servicio</p>
              {selectedServicio ? (
                <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#d8ffc7]">
                  {selectedServicio.duracionMinutos} min
                </span>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {services.map((service) => {
                const selected = selectedServicioId === service.id;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setSelectedServicioId(service.id)}
                    className={`rounded-[24px] border p-4 text-left transition ${
                      selected
                        ? "border-[#8cff59]/35 bg-[#8cff59]/10 text-white"
                        : "border-white/10 bg-white/5 text-zinc-100 hover:border-white/20 hover:bg-white/8"
                    }`}
                  >
                    <span className="block text-base font-semibold">{service.nombre}</span>
                    <span className="mt-2 block text-sm text-zinc-400">
                      {service.duracionMinutos} min
                    </span>
                    <span className="mt-1 block text-sm text-zinc-300">
                      {formatARS(service.precioBase)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="public-panel rounded-[28px] p-5">
            <label htmlFor="fecha" className="mb-2 block text-sm font-medium text-zinc-300">
              Fecha
            </label>
            <input
              id="fecha"
              type="date"
              min={initialFecha}
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
              className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
            />
          </section>

          <section className="public-panel rounded-[28px] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-zinc-300">Horarios disponibles</p>
              {selectedServicio ? (
                <p className="text-xs text-zinc-500">
                  {selectedServicio.nombre} · {selectedServicio.duracionMinutos} min
                </p>
              ) : null}
            </div>

            {loadingSlots ? <p className="text-sm text-zinc-400">Buscando horarios...</p> : null}
            {loadError ? <p className="text-sm text-rose-300">{loadError}</p> : null}
            {!loadingSlots && !loadError && slots.length === 0 ? (
              <p className="text-sm text-zinc-400">No hay horarios disponibles para esa fecha.</p>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {slots.map((slot) => {
                const selected = selectedSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`rounded-2xl border px-3 py-3 text-sm transition ${
                      selected
                        ? "border-[#8cff59]/35 bg-[#8cff59]/10 text-white"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/8"
                    }`}
                  >
                    <span className="block font-semibold">{slot.horaInicio}</span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      slot de {slot.duracionMinutos} min
                    </span>
                  </button>
                );
              })}
            </div>

          </section>

          <section className="public-panel rounded-[28px] p-5">
            <label htmlFor="notaCliente" className="mb-2 block text-sm font-medium text-zinc-300">
              Nota para la barber
            </label>
            <textarea
              id="notaCliente"
              name="notaCliente"
              rows={4}
              value={notaCliente}
              onChange={(event) => setNotaCliente(event.target.value)}
              placeholder="Contanos algo importante para tu turno si hace falta."
              className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 py-3 text-zinc-50 placeholder:text-zinc-500 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
            />
          </section>
        </div>

        <aside className="space-y-5">
          <section className="public-panel rounded-[28px] p-5">
            <p className="eyebrow text-zinc-500">Resumen</p>
            <div className="mt-4 space-y-3">
              <SummaryTile
                label="Servicio"
                value={selectedServicio ? selectedServicio.nombre : "Elegilo arriba"}
                strong
              />
              <SummaryTile label="Fecha" value={fecha} />
              <SummaryTile label="Horario" value={selectedSlotLabel} />
              <SummaryTile label="Nota" value={noteLength ? `${noteLength} caracteres` : "Sin nota"} />
              <SummaryTile
                label="Spotify"
                value={spotifyTrackUri ? "Tema vinculado" : "Sin tema vinculado"}
              />
            </div>
            <div className="mt-4 rounded-[24px] border border-[#8cff59]/20 bg-[#8cff59]/8 p-4 text-sm text-zinc-200">
              Tu solicitud queda vinculada a tu cuenta y el local la confirma manualmente.
            </div>
          </section>

          <section className="public-panel rounded-[28px] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Sugerencia musical
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <input
                  id="sugerenciaCancion"
                  value={cancion}
                  onChange={(event) => handleSongInputChange(event.target.value)}
                  placeholder="Tema, artista o cancion favorita"
                  className="min-h-[48px] w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-white placeholder:text-zinc-500 outline-none focus:border-[#8cff59]/60"
                />
                <button
                  type="button"
                  onClick={() => void handleSpotifySearch()}
                  disabled={searchingTracks || cancion.trim().length < 2}
                  className="neon-button shrink-0 rounded-[20px] px-4 text-sm font-medium disabled:opacity-50"
                >
                  {searchingTracks ? "Buscando..." : "Buscar"}
                </button>
              </div>

              {spotifyTrackUri ? (
                <p className="text-xs font-medium text-emerald-300">
                  Cancion vinculada a Spotify. El local la puede reproducir con URI estable.
                </p>
              ) : (
                <p className="text-xs text-zinc-400">
                  Si elegis un resultado de Spotify, la barberia la puede reproducir de forma mas
                  confiable.
                </p>
              )}

              {trackResults.length > 0 ? (
                <div className="space-y-2">
                  {trackResults.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => selectTrack(track)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-left transition hover:bg-zinc-800"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                        {track.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={track.imageUrl}
                            alt={track.albumName}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{track.name}</p>
                        <p className="truncate text-xs text-zinc-400">
                          {track.artistNames.join(" · ")}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{track.albumName}</p>
                      </div>
                      <span className="text-xs font-medium text-zinc-300">Elegir</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

        </aside>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting || services.length === 0}
        className="neon-button h-12 w-full rounded-[20px] text-sm font-medium disabled:opacity-50"
      >
        {submitting ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}

function SummaryTile({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${strong ? "border-[#8cff59]/25 bg-[#8cff59]/10" : "border-white/10 bg-white/5"}`}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${strong ? "text-[#d8ffc7]" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function formatTurnoDate(value: string) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}
