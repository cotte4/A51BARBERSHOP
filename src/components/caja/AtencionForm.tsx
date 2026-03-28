"use client";

import { useActionState, useEffect, useState } from "react";
import type { AtencionFormState } from "@/app/(barbero)/caja/actions";

interface AtencionFormProps {
  action: (
    prevState: AtencionFormState,
    formData: FormData
  ) => Promise<AtencionFormState>;
  barberosList: Array<{
    id: string;
    nombre: string;
    porcentajeComision: string | null;
  }>;
  serviciosList: Array<{
    id: string;
    nombre: string;
    precioBase: string | null;
  }>;
  adicionalesList: Array<{
    id: string;
    servicioId: string | null;
    nombre: string;
    precioExtra: string | null;
  }>;
  mediosPagoList: Array<{
    id: string;
    nombre: string | null;
    comisionPorcentaje: string | null;
  }>;
  preselectedBarberoId?: string;
  isAdmin: boolean;
  initialData?: {
    barberoId?: string;
    servicioId?: string;
    adicionalesIds?: string[];
    precioCobrado?: string;
    medioPagoId?: string;
    notas?: string | null;
  };
  submitLabel?: string;
  cancelHref?: string;
}

function formatARS(val: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(val);
}

export default function AtencionForm({
  action,
  barberosList,
  serviciosList,
  adicionalesList,
  mediosPagoList,
  preselectedBarberoId,
  isAdmin,
  initialData,
  submitLabel = "Confirmar",
  cancelHref = "/caja",
}: AtencionFormProps) {
  const [barberoId, setBarberoId] = useState(
    initialData?.barberoId ?? preselectedBarberoId ?? ""
  );
  const [servicioId, setServicioId] = useState(
    initialData?.servicioId ?? ""
  );
  const [adicionalesSeleccionados, setAdicionalesSeleccionados] = useState<
    string[]
  >(initialData?.adicionalesIds ?? []);
  const [precioCobrado, setPrecioCobrado] = useState(
    initialData?.precioCobrado ?? ""
  );
  const [medioPagoId, setMedioPagoId] = useState(
    initialData?.medioPagoId ?? ""
  );

  const [state, formAction, isPending] = useActionState(action, {});

  const adicionalesDelServicio = adicionalesList.filter(
    (a) => a.servicioId === servicioId
  );

  // Auto-fill del precio al cambiar servicio o adicionales
  useEffect(() => {
    if (!servicioId) return;
    const servicio = serviciosList.find((s) => s.id === servicioId);
    const sumAdicionales = adicionalesSeleccionados.reduce((sum, aid) => {
      const a = adicionalesList.find((x) => x.id === aid);
      return sum + Number(a?.precioExtra ?? 0);
    }, 0);
    const total = Number(servicio?.precioBase ?? 0) + sumAdicionales;
    setPrecioCobrado(String(total));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioId, adicionalesSeleccionados.join(",")]);

  function toggleAdicional(id: string) {
    setAdicionalesSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Cálculo en tiempo real
  const barbero = barberosList.find((b) => b.id === barberoId);
  const medioPago = mediosPagoList.find((m) => m.id === medioPagoId);
  const precio = Number(precioCobrado) || 0;
  const comisionMpPct = Number(medioPago?.comisionPorcentaje ?? 0);
  const comisionMpMonto = precio * comisionMpPct / 100;
  const montoNeto = precio - comisionMpMonto;
  const comisionBarberoPct = Number(barbero?.porcentajeComision ?? 0);
  const comisionBarberoMonto = precio * comisionBarberoPct / 100;

  const mostrarPreview = precio > 0 && medioPagoId !== "";

  const barberoDiscriminado = !isAdmin && preselectedBarberoId;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      {/* Barbero */}
      <div className="flex flex-col gap-1">
        <label htmlFor="barberoId" className="text-sm font-medium text-gray-700">
          Barbero <span className="text-red-500">*</span>
        </label>
        {barberoDiscriminado ? (
          <>
            <input type="hidden" name="barberoId" value={barberoId} />
            <div className="min-h-[44px] w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 flex items-center">
              {barbero?.nombre ?? "—"}
            </div>
          </>
        ) : (
          <select
            id="barberoId"
            name="barberoId"
            value={barberoId}
            onChange={(e) => setBarberoId(e.target.value)}
            className="min-h-[44px] w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
          >
            <option value="">Seleccioná un barbero...</option>
            {barberosList.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        )}
        {state.fieldErrors?.barberoId && (
          <p className="text-red-500 text-xs">{state.fieldErrors.barberoId}</p>
        )}
      </div>

      {/* Servicio */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="servicioId"
          className="text-sm font-medium text-gray-700"
        >
          Servicio <span className="text-red-500">*</span>
        </label>
        <select
          id="servicioId"
          name="servicioId"
          value={servicioId}
          onChange={(e) => {
            setServicioId(e.target.value);
            setAdicionalesSeleccionados([]);
          }}
          className="min-h-[44px] w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="">Seleccioná un servicio...</option>
          {[...serviciosList]
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} — {formatARS(Number(s.precioBase ?? 0))}
              </option>
            ))}
        </select>
        {state.fieldErrors?.servicioId && (
          <p className="text-red-500 text-xs">{state.fieldErrors.servicioId}</p>
        )}
      </div>

      {/* Adicionales */}
      {adicionalesDelServicio.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">
            Adicionales
          </span>
          <div className="flex flex-col gap-2">
            {adicionalesDelServicio.map((a) => {
              const checked = adicionalesSeleccionados.includes(a.id);
              return (
                <label
                  key={a.id}
                  className="flex items-center gap-3 cursor-pointer min-h-[44px] px-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAdicional(a.id)}
                    className="w-4 h-4 accent-gray-900"
                  />
                  <span className="text-sm text-gray-700 flex-1">{a.nombre}</span>
                  <span className="text-sm text-gray-500">
                    +{formatARS(Number(a.precioExtra ?? 0))}
                  </span>
                </label>
              );
            })}
          </div>
          {/* Hidden inputs para envío en FormData */}
          {adicionalesSeleccionados.map((id) => (
            <input key={id} type="hidden" name="adicionalesIds" value={id} />
          ))}
        </div>
      )}

      {/* Precio cobrado */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="precioCobrado"
          className="text-sm font-medium text-gray-700"
        >
          Precio cobrado <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            $
          </span>
          <input
            id="precioCobrado"
            name="precioCobrado"
            type="number"
            min="0"
            step="1"
            value={precioCobrado}
            onChange={(e) => setPrecioCobrado(e.target.value)}
            placeholder="0"
            className="min-h-[44px] w-full px-4 py-2 pl-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        {state.fieldErrors?.precioCobrado && (
          <p className="text-red-500 text-xs">
            {state.fieldErrors.precioCobrado}
          </p>
        )}
      </div>

      {/* Medio de pago */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="medioPagoId"
          className="text-sm font-medium text-gray-700"
        >
          Medio de pago <span className="text-red-500">*</span>
        </label>
        <select
          id="medioPagoId"
          name="medioPagoId"
          value={medioPagoId}
          onChange={(e) => setMedioPagoId(e.target.value)}
          className="min-h-[44px] w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="">Seleccioná medio de pago...</option>
          {mediosPagoList.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre ?? "—"}
              {Number(m.comisionPorcentaje ?? 0) > 0
                ? ` (${m.comisionPorcentaje}%)`
                : ""}
            </option>
          ))}
        </select>
        {state.fieldErrors?.medioPagoId && (
          <p className="text-red-500 text-xs">
            {state.fieldErrors.medioPagoId}
          </p>
        )}
      </div>

      {/* Preview de cálculo */}
      {mostrarPreview && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm flex flex-col gap-1">
          <div className="flex justify-between text-gray-700">
            <span>Precio cobrado</span>
            <span className="font-medium">{formatARS(precio)}</span>
          </div>
          {comisionMpPct > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>
                Comisión {medioPago?.nombre ?? ""} ({comisionMpPct}%)
              </span>
              <span>−{formatARS(comisionMpMonto)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 my-1" />
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Neto</span>
            <span>{formatARS(montoNeto)}</span>
          </div>
          {barbero && comisionBarberoPct > 0 && (
            <div className="flex justify-between text-gray-500 mt-1">
              <span>
                Comisión {barbero.nombre} ({comisionBarberoPct}%)
              </span>
              <span>{formatARS(comisionBarberoMonto)}</span>
            </div>
          )}
        </div>
      )}

      {/* Notas */}
      <div className="flex flex-col gap-1">
        <label htmlFor="notas" className="text-sm font-medium text-gray-700">
          Notas{" "}
          <span className="text-gray-400 text-xs">(opcional)</span>
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={2}
          defaultValue={initialData?.notas ?? ""}
          placeholder="Notas opcionales..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
        />
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 min-h-[44px] bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isPending ? "Guardando..." : submitLabel}
        </button>
        <a
          href={cancelHref}
          className="min-h-[44px] px-6 flex items-center justify-center bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
