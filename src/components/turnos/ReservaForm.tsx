"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildQuickDateOptions,
  formatARS,
  formatDateLabel,
  formatDateLongLabel,
} from "@/components/turnos/reserva-form-utils";
import type {
  QuickDateOption,
  Slot,
  SpotifyTrackOption,
} from "@/components/turnos/reserva-form-utils";

type ReservaFormProps = {
  slug: string;
  barberoNombre: string;
  initialFecha: string;
  productos: Array<{ id: string; nombre: string }>;
  servicios: Array<{
    id: string;
    nombre: string;
    precioBase: string | null;
    duracionMinutos: number;
  }>;
};

export default function ReservaForm({
  slug,
  barberoNombre,
  initialFecha,
  productos,
  servicios,
}: ReservaFormProps) {
  const [fecha, setFecha] = useState(initialFecha);
  const [selectedServicioId, setSelectedServicioId] = useState(servicios[0]?.id ?? "");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [cancion, setCancion] = useState("");
  const [spotifyTrackUri, setSpotifyTrackUri] = useState("");
  const [trackResults, setTrackResults] = useState<SpotifyTrackOption[]>([]);
  const [searchingTracks, setSearchingTracks] = useState(false);
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const quickDateOptions = useMemo(() => buildQuickDateOptions(initialFecha, 7), [initialFecha]);
  const selectedServicio = servicios.find((servicio) => servicio.id === selectedServicioId) ?? null;
  const selectedSlotItem = slots.find((slot) => slot.id === selectedSlot) ?? null;
  const selectedExtraCount = Object.keys(extras).length;
  const hasLinkedTrack = Boolean(spotifyTrackUri);
  const canSearchTracks = cancion.trim().length >= 2;
  const contactReady = nombre.trim().length >= 2 && telefono.trim().length > 0;
  const canSubmit =
    !submitting &&
    Boolean(selectedServicio) &&
    Boolean(selectedSlotItem) &&
    contactReady;
  const isCustomFecha = !quickDateOptions.some((option) => option.value === fecha);
  const progressCount = [Boolean(selectedServicio), Boolean(selectedSlotItem), contactReady].filter(Boolean).length;
  const statusLabel = submitting
    ? "Enviando"
    : canSubmit
      ? "Lista para enviar"
      : progressCount === 0
        ? "Esperando datos"
        : `${progressCount}/3 listo`;
  const statusClassName = submitting
    ? "border-zinc-700 bg-zinc-800 text-zinc-200"
    : canSubmit
      ? "border-[#8cff59]/20 bg-[#8cff59]/10 text-[#d8ffc7]"
      : "border-amber-500/20 bg-amber-500/10 text-amber-200";

  useEffect(() => {
    if (!selectedServicioId && servicios[0]?.id) {
      setSelectedServicioId(servicios[0].id);
    }
  }, [selectedServicioId, servicios]);

  useEffect(() => {
    if (!selectedServicio) {
      setSlots([]);
      setSelectedSlot("");
      return;
    }

    const servicioActual = selectedServicio;
    let ignore = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/turnos/disponibles?slug=${encodeURIComponent(slug)}&fecha=${encodeURIComponent(
            fecha,
          )}&duracion=${servicioActual.duracionMinutos}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as { slots?: Slot[]; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "No pudimos cargar horarios.");
        }

        if (!ignore) {
          setSlots(data.slots ?? []);
          setSelectedSlot("");
        }
      } catch (err) {
        if (!ignore && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "No pudimos cargar horarios.");
          setSlots([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [fecha, selectedServicio, slug]);

  function toggleExtra(productoId: string) {
    setExtras((current) => {
      if (current[productoId]) {
        const next = { ...current };
        delete next[productoId];
        return next;
      }
      return { ...current, [productoId]: 1 };
    });
  }

  function handleFechaChange(value: string) {
    if (!value || value < initialFecha) {
      return;
    }

    setFecha(value);
    setSelectedSlot("");
    setError(null);
  }

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
        throw new Error(data.error ?? "No pudimos buscar canciones.");
      }

      setTrackResults(data.tracks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos buscar canciones.");
      setTrackResults([]);
    } finally {
      setSearchingTracks(false);
    }
  }

  function handleSongInputChange(value: string) {
    setCancion(value);
    setSpotifyTrackUri("");
    setTrackResults([]);
  }

  function handleSongKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    if (!searchingTracks && canSearchTracks) {
      void handleSpotifySearch();
    }
  }

  function selectTrack(track: SpotifyTrackOption) {
    setCancion(`${track.name} - ${track.artistNames[0] ?? "Spotify"}`);
    setSpotifyTrackUri(track.uri);
    setTrackResults([]);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submitter =
      "submitter" in event.nativeEvent
        ? ((event.nativeEvent.submitter as HTMLElement | null) ?? null)
        : null;

    if (!submitter || submitter.getAttribute("data-submit-intent") !== "reserve") {
      setError("Para reservar, usa el boton final de enviar solicitud.");
      return;
    }

    if (!selectedServicio) {
      setError("Elegi un servicio antes de seguir.");
      return;
    }

    if (!selectedSlotItem) {
      setError("Elegi un horario disponible.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      slug,
      slotId: selectedSlotItem.id,
      serviceId: selectedServicio.id,
      clienteNombre: nombre,
      clienteTelefonoRaw: telefono,
      notaCliente: nota,
      sugerenciaCancion: cancion,
      spotifyTrackUri,
      extras: Object.entries(extras).map(([productoId, cantidad]) => ({
        productoId,
        cantidad,
      })),
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
        throw new Error(data.error ?? "No pudimos guardar la reserva.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos guardar la reserva.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-[30px] border border-emerald-500/25 bg-emerald-500/10 p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          Solicitud enviada
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-white">Ya la recibimos</h2>
        <p className="mt-3 text-sm text-emerald-100">
          {barberoNombre} va a bajar la senal y confirmar el turno desde la base A51.
        </p>
        <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-left text-sm text-zinc-200">
          <p className="font-medium text-white">{selectedServicio?.nombre ?? "Servicio"}</p>
          <p className="mt-1 text-zinc-300">
            {selectedSlotItem
              ? `${formatDateLabel(selectedSlotItem.fecha)} a las ${selectedSlotItem.horaInicio}`
              : "Horario seleccionado"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]"
    >
      <div className="space-y-5">
        <section className="public-panel rounded-[30px] border border-white/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Paso 1
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-white">
                Elegi tu servicio
              </h2>
            </div>
            <div className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-2 text-xs font-semibold text-[#d8ffc7]">
              {servicios.length} opciones disponibles
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {servicios.map((servicio) => {
              const selected = servicio.id === selectedServicioId;

              return (
                <button
                  key={servicio.id}
                  type="button"
                  onClick={() => {
                    setSelectedServicioId(servicio.id);
                    setError(null);
                  }}
                  className={`rounded-[24px] border p-4 text-left transition ${
                    selected
                      ? "border-[#8cff59]/35 bg-[#8cff59]/10 text-white"
                      : "border-white/10 bg-white/5 text-zinc-100 hover:border-white/20 hover:bg-white/8"
                  }`}
                >
                  <span className="block text-base font-semibold">{servicio.nombre}</span>
                  <span className="mt-2 block text-sm text-zinc-400">
                    {servicio.duracionMinutos} min
                  </span>
                  <span className="mt-1 block text-sm text-zinc-300">
                    {formatARS(servicio.precioBase) ?? "Precio a confirmar"}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedServicio ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
              <p>
                <span className="font-medium text-white">{selectedServicio.nombre}</span> queda listo
                para salir con {selectedServicio.duracionMinutos} min de duracion.
              </p>
              <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#d8ffc7]">
                {formatARS(selectedServicio.precioBase) ?? "Precio a confirmar"}
              </span>
            </div>
          ) : null}
        </section>

        <section className="public-panel rounded-[30px] border border-white/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Paso 2
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-white">
                Fecha y horario
              </h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
              {loading ? "Buscando..." : `${slots.length} slots`}
            </div>
          </div>

          <div className="mt-4 rounded-[26px] border border-white/10 bg-black/20 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8cff59]">
                  Desde manana
                </p>
                <p className="mt-2 text-sm text-zinc-300">
                  La agenda publica empieza un dia despues para que el turno no salga apurado ni se
                  pise con el movimiento del mismo dia.
                </p>
              </div>
              <div className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-2 text-xs font-semibold text-[#d8ffc7]">
                Primer dia: {formatDateLabel(initialFecha)}
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-4 xl:grid-cols-7">
              {quickDateOptions.map((option) => {
                const selected = option.value === fecha;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleFechaChange(option.value)}
                    className={`rounded-[22px] border px-3 py-3 text-left transition ${
                      selected
                        ? "border-[#8cff59]/35 bg-[#8cff59]/10 text-white shadow-[0_0_18px_rgba(140,255,89,0.12)]"
                        : "border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/8"
                    }`}
                  >
                    <span className="block text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                      {option.eyebrow}
                    </span>
                    <span className="mt-2 block font-display text-2xl font-semibold">
                      {option.dayNumber}
                    </span>
                    <span className="mt-1 block text-sm capitalize">{option.weekday}</span>
                    <span className="block text-xs uppercase tracking-[0.18em] text-zinc-500">
                      {option.month}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.95fr)]">
              <label className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Otra fecha
                </span>
                <span className="mt-2 block text-sm text-zinc-300">
                  Si queres ir mas lejos, elegi otra fecha sin bajar a un selector crudo.
                </span>
                <input
                  id="fecha"
                  type="date"
                  min={initialFecha}
                  value={fecha}
                  onChange={(event) => handleFechaChange(event.target.value)}
                  className="mt-4 h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-base text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
                />
              </label>

              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Fecha elegida
                </p>
                <p className="mt-2 font-display text-2xl font-semibold capitalize text-white">
                  {formatDateLongLabel(fecha)}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {isCustomFecha
                    ? "Elegiste una fecha fuera de la ventana rapida."
                    : "Estas dentro de la ventana sugerida para reservar sin friccion."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-3 text-sm font-medium text-zinc-300">Horarios</p>

            {loading ? (
              <p className="text-sm text-zinc-400">Buscando horarios disponibles...</p>
            ) : !selectedServicio ? (
              <p className="text-sm text-zinc-500">Primero elegi un servicio.</p>
            ) : slots.length === 0 ? (
              <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-zinc-400">
                No hay horarios disponibles para esa fecha. Prueba otra fecha de la agenda.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                {slots.map((slot) => {
                  const selected = selectedSlot === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        setSelectedSlot(slot.id);
                        setError(null);
                      }}
                      className={`rounded-2xl border py-3 text-center text-sm font-semibold transition ${
                        selected
                          ? "border-[#8cff59]/40 bg-[#8cff59]/12 text-white shadow-[0_0_12px_rgba(140,255,89,0.15)]"
                          : "border-white/10 bg-white/5 text-zinc-200 hover:border-white/20 hover:bg-white/8"
                      }`}
                    >
                      {slot.horaInicio}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedSlotItem ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[#8cff59]/20 bg-[#8cff59]/8 px-4 py-3 text-sm text-emerald-100">
                <p>
                  Slot elegido: {formatDateLabel(selectedSlotItem.fecha)} a las{" "}
                  {selectedSlotItem.horaInicio} hs
                </p>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white">
                  {selectedSlotItem.duracionMinutos} min
                </span>
              </div>
            ) : null}
          </div>

          {error ? (
            <div
              role="alert"
              aria-live="polite"
              className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </div>
          ) : null}
        </section>

        <section className="public-panel rounded-[30px] border border-white/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Paso 3
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-white">
                Tus datos y el combo
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
                {selectedExtraCount} extras
              </span>
              <span className={`rounded-full border px-3 py-2 text-xs font-semibold ${statusClassName}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="clienteNombre" className="mb-2 block text-sm font-medium text-zinc-300">
                Nombre
              </label>
              <input
                id="clienteNombre"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                required
                autoComplete="name"
                className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 outline-none focus:border-[#8cff59]/60 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="clienteTelefono" className="mb-2 block text-sm font-medium text-zinc-300">
                Telefono
              </label>
              <input
                id="clienteTelefono"
                value={telefono}
                onChange={(event) => setTelefono(event.target.value)}
                required
                autoComplete="tel"
                className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 outline-none focus:border-[#8cff59]/60 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="notaCliente" className="mb-2 block text-sm font-medium text-zinc-300">
              Nota
            </label>
            <textarea
              id="notaCliente"
              value={nota}
              onChange={(event) => setNota(event.target.value)}
              rows={3}
              placeholder="Alguna aclaracion que le sirva al equipo."
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white placeholder:text-zinc-500 outline-none focus:border-[#8cff59]/60 focus:outline-none"
            />
          </div>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Musica opcional
                </p>
                <p className="mt-2 text-sm text-zinc-300">
                  Buscar una cancion no reserva nada. Solo deja una sugerencia para que el local la
                  tenga a mano.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300">
                {hasLinkedTrack ? "Tema vinculado" : "Solo sugerencia"}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                id="sugerenciaCancion"
                value={cancion}
                onChange={(event) => handleSongInputChange(event.target.value)}
                onKeyDown={handleSongKeyDown}
                placeholder="Tema, artista o cancion favorita"
                className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 outline-none focus:border-[#8cff59]/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void handleSpotifySearch()}
                disabled={searchingTracks || !canSearchTracks}
                className="neon-button h-12 shrink-0 rounded-[20px] px-4 text-sm font-medium disabled:opacity-50"
              >
                {searchingTracks ? "Buscando..." : "Buscar en Spotify"}
              </button>
            </div>

            {hasLinkedTrack ? (
              <p className="mt-3 text-xs font-medium text-emerald-300">
                Cancion vinculada a Spotify. Si quieren, la barberia la puede tirar con URI estable.
              </p>
            ) : (
              <p className="mt-3 text-xs text-zinc-400">
                Si elegis un resultado de Spotify, la recomendacion queda mejor resuelta. Si no,
                queda como texto libre y listo.
              </p>
            )}

            {trackResults.length > 0 ? (
              <div className="mt-4 space-y-2">
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
                        {track.artistNames.join(" - ")}
                      </p>
                      <p className="truncate text-xs text-zinc-500">{track.albumName}</p>
                    </div>
                    <span className="text-xs font-medium text-zinc-300">Elegir</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <p className="mb-3 text-sm font-medium text-zinc-300">Extras opcionales</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {productos.length === 0 ? (
                <p className="text-sm text-zinc-400">No hay extras disponibles en este momento.</p>
              ) : (
                productos.map((producto) => (
                  <button
                    key={producto.id}
                    type="button"
                    onClick={() => toggleExtra(producto.id)}
                    aria-pressed={Boolean(extras[producto.id])}
                    className={`flex min-h-[56px] items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      extras[producto.id]
                        ? "border-[#8cff59]/35 bg-[#8cff59]/10 text-white"
                        : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                    }`}
                  >
                    <span>{producto.nombre}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        extras[producto.id]
                          ? "bg-[#8cff59] text-[#07130a]"
                          : "bg-black/20 text-zinc-400"
                      }`}
                    >
                      {extras[producto.id] ? "Sumado" : "Agregar"}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="public-panel rounded-[30px] border border-white/10 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Estado de reserva
              </p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">
                {canSubmit ? "Lista para despegar" : "Falta cerrar el combo"}
              </p>
            </div>
            <span className={`rounded-full border px-3 py-2 text-xs font-semibold ${statusClassName}`}>
              {statusLabel}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            <SummaryRow
              label="Servicio"
              value={selectedServicio?.nombre ?? "Pendiente"}
              detail={
                selectedServicio
                  ? `${selectedServicio.duracionMinutos} min - ${formatARS(selectedServicio.precioBase) ?? "Precio a confirmar"}`
                  : "Marca uno para seguir"
              }
            />
            <SummaryRow
              label="Fecha"
              value={formatDateLabel(fecha)}
              detail={isCustomFecha ? "Fecha manual elegida" : "Dentro de la ventana sugerida"}
            />
            <SummaryRow
              label="Slot"
              value={selectedSlotItem?.horaInicio ?? "Pendiente"}
              detail={
                selectedSlotItem
                  ? `${selectedSlotItem.duracionMinutos} min de turno`
                  : "Elegilo en la grilla"
              }
            />
            <SummaryRow
              label="Contacto"
              value={nombre.trim() || "Sin nombre"}
              detail={contactReady ? telefono.trim() : "Completa nombre y telefono"}
            />
            <SummaryRow
              label="Extras y musica"
              value={`${selectedExtraCount} extras`}
              detail={hasLinkedTrack ? "Tema clavado a Spotify" : "Sin tema vinculado"}
            />
          </div>
        </div>

        <div className="rounded-[30px] border border-[#8cff59]/20 bg-[#8cff59]/8 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8cff59]">
            Antes de enviar
          </p>
          <div className="mt-4 space-y-2 text-sm text-zinc-200">
            <p>Buscar musica no manda la reserva. Solo el boton final la envia.</p>
            <p>El boton se habilita recien cuando hay servicio, horario y contacto.</p>
            <p>La agenda publica no muestra turnos para hoy.</p>
          </div>
        </div>

        <button
          type="submit"
          data-submit-intent="reserve"
          disabled={!canSubmit}
          className="neon-button h-12 w-full rounded-[20px] text-sm font-medium disabled:opacity-50"
        >
          {submitting
            ? "Mandando senal..."
            : canSubmit
              ? "Enviar solicitud a A51"
              : "Completa servicio, horario y contacto"}
        </button>
      </aside>
    </form>
  );
}

function SummaryRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-zinc-400">{detail}</p>
    </div>
  );
}
