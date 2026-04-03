"use client";

import { useEffect, useState } from "react";

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

function formatARS(value: string | null) {
  if (!value) return null;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
}

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
  const [selectedSlot, setSelectedSlot] = useState<string>("");
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

  const selectedServicio = servicios.find((servicio) => servicio.id === selectedServicioId) ?? null;

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
            fecha
          )}&duracion=${servicioActual.duracionMinutos}`,
          { signal: controller.signal }
        );
        const data = (await response.json()) as { slots?: Slot[]; error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "No pude cargar horarios.");
        }
        if (!ignore) {
          setSlots(data.slots ?? []);
          setSelectedSlot("");
        }
      } catch (err) {
        if (!ignore && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "No pude cargar horarios.");
          setSlots([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude buscar canciones.");
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
        throw new Error(data.error ?? "No pude guardar la reserva.");
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pude guardar la reserva.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-3xl border border-green-200 bg-green-50 p-6 text-center">
        <h2 className="text-xl font-semibold text-green-900">Solicitud enviada</h2>
        <p className="mt-2 text-sm text-green-800">
          {barberoNombre} va a revisar tu pedido y confirmar el turno.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-medium text-gray-700">Servicio</p>
        {servicios.length === 0 ? (
          <p className="text-sm text-gray-500">No hay servicios disponibles en este momento.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {servicios.map((servicio) => {
              const selected = servicio.id === selectedServicioId;
              return (
                <button
                  key={servicio.id}
                  type="button"
                  onClick={() => setSelectedServicioId(servicio.id)}
                  className={`rounded-3xl border p-4 text-left transition ${
                    selected
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100"
                  }`}
                >
                  <span className="block text-base font-semibold">{servicio.nombre}</span>
                  <span className="mt-2 block text-sm opacity-80">{servicio.duracionMinutos} min</span>
                  <span className="mt-1 block text-sm opacity-80">
                    {formatARS(servicio.precioBase) ?? "Precio a confirmar"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <label htmlFor="fecha" className="mb-2 block text-sm font-medium text-gray-700">
          Fecha
        </label>
        <input
          id="fecha"
          type="date"
          min={initialFecha}
          value={fecha}
          onChange={(event) => setFecha(event.target.value)}
          className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
        />
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-gray-700">Horarios disponibles</p>
          {selectedServicio ? (
            <p className="text-xs text-gray-500">
              Mostrando slots para {selectedServicio.nombre.toLowerCase()} ({selectedServicio.duracionMinutos} min)
            </p>
          ) : null}
        </div>
        {loading ? <p className="text-sm text-gray-500">Buscando horarios...</p> : null}
        {!loading && slots.length === 0 ? (
          <p className="text-sm text-gray-500">No hay horarios disponibles para esa fecha.</p>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {slots.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => setSelectedSlot(slot.id)}
              className={`rounded-2xl border px-3 py-3 text-sm transition-colors ${
                selectedSlot === slot.id
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="block font-medium">{slot.horaInicio}</span>
              <span className="block text-xs opacity-80">slot de {slot.duracionMinutos} min</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <label htmlFor="clienteNombre" className="mb-2 block text-sm font-medium text-gray-700">
            Nombre
          </label>
          <input
            id="clienteNombre"
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            required
            className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </div>

        <div>
          <label htmlFor="clienteTelefono" className="mb-2 block text-sm font-medium text-gray-700">
            Telefono
          </label>
          <input
            id="clienteTelefono"
            value={telefono}
            onChange={(event) => setTelefono(event.target.value)}
            className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </div>

        <div>
          <label htmlFor="notaCliente" className="mb-2 block text-sm font-medium text-gray-700">
            Nota
          </label>
          <textarea
            id="notaCliente"
            value={nota}
            onChange={(event) => setNota(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
        </div>

        <div>
          <label htmlFor="sugerenciaCancion" className="mb-2 block text-sm font-medium text-gray-700">
            Sugerencia de cancion
          </label>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                id="sugerenciaCancion"
                value={cancion}
                onChange={(event) => handleSongInputChange(event.target.value)}
                placeholder="Tema, artista o cancion favorita"
                className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
              />
              <button
                type="button"
                onClick={() => void handleSpotifySearch()}
                disabled={searchingTracks || cancion.trim().length < 2}
                className="shrink-0 rounded-xl bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
              >
                {searchingTracks ? "Buscando..." : "Buscar"}
              </button>
            </div>

            {spotifyTrackUri ? (
              <p className="text-xs font-medium text-green-700">
                Cancion vinculada a Spotify. El local va a poder reproducirla con URI estable.
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Si elegis un resultado de Spotify, la barberia la puede reproducir de forma mas confiable.
              </p>
            )}

            {trackResults.length > 0 ? (
              <div className="space-y-2">
                {trackResults.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => selectTrack(track)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-left transition hover:bg-gray-100"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-200">
                      {track.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={track.imageUrl} alt={track.albumName} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{track.name}</p>
                      <p className="truncate text-xs text-gray-600">{track.artistNames.join(" · ")}</p>
                      <p className="truncate text-xs text-gray-400">{track.albumName}</p>
                    </div>
                    <span className="text-xs font-medium text-gray-700">Elegir</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-medium text-gray-700">Extras opcionales</p>
        <div className="space-y-2">
          {productos.length === 0 ? (
            <p className="text-sm text-gray-500">No hay extras disponibles en este momento.</p>
          ) : (
            productos.map((producto) => (
              <label
                key={producto.id}
                className="flex min-h-[48px] items-center justify-between rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-700"
              >
                <span>{producto.nombre}</span>
                <input
                  type="checkbox"
                  checked={!!extras[producto.id]}
                  onChange={() => toggleExtra(producto.id)}
                  className="h-4 w-4 accent-gray-900"
                />
              </label>
            ))
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting || servicios.length === 0}
        className="h-12 w-full rounded-2xl bg-gray-900 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
      >
        {submitting ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}
