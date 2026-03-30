"use client";

import { useEffect, useState } from "react";

type ReservaFormProps = {
  slug: string;
  barberoNombre: string;
  initialFecha: string;
  productos: Array<{ id: string; nombre: string }>;
};

type Slot = {
  id: string;
  fecha: string;
  horaInicio: string;
  duracionMinutos: number;
};

export default function ReservaForm({
  slug,
  barberoNombre,
  initialFecha,
  productos,
}: ReservaFormProps) {
  const [fecha, setFecha] = useState(initialFecha);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [cancion, setCancion] = useState("");
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/turnos/disponibles?slug=${encodeURIComponent(slug)}&fecha=${encodeURIComponent(fecha)}`,
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
  }, [fecha, slug]);

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSlot) {
      setError("ElegÃ­ un horario disponible.");
      return;
    }

    const slot = slots.find((item) => item.id === selectedSlot);
    if (!slot) {
      setError("Ese horario ya no estÃ¡ disponible.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      slug,
      fecha,
      horaInicio: slot.horaInicio,
      duracionMinutos: slot.duracionMinutos,
      clienteNombre: nombre,
      clienteTelefonoRaw: telefono,
      notaCliente: nota,
      sugerenciaCancion: cancion,
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
        <p className="mb-3 text-sm font-medium text-gray-700">Horarios disponibles</p>
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
              <span className="block text-xs opacity-80">{slot.duracionMinutos} min</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
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
            TelÃ©fono
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
            Sugerencia de canciÃ³n
          </label>
          <input
            id="sugerenciaCancion"
            value={cancion}
            onChange={(event) => setCancion(event.target.value)}
            className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
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
        disabled={submitting}
        className="h-12 w-full rounded-2xl bg-gray-900 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
      >
        {submitting ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}
