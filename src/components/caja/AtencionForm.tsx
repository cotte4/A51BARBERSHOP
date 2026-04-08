"use client";

import { useActionState, useDeferredValue, useEffect, useRef, useState } from "react";
import type { AtencionFormState } from "@/app/(barbero)/caja/actions";
import BarberoAvatarButton from "@/components/caja/BarberoAvatarButton";
import {
  AtencionFormHero,
  AtencionFormNotesSection,
  AtencionFormPreview,
} from "@/components/caja/AtencionFormSections";
import {
  buildClientLabel,
  buildInitialProductos,
  formatARS,
  getBarberoEmoji,
  getInitials,
  getMedioPagoMeta,
  getServicioEmoji,
} from "@/components/caja/atencion-form-utils";
import type {
  ClientLookupItem,
  EditContext,
  ProductoListItem,
  ProductoSeleccionadoState,
} from "@/components/caja/atencion-form-utils";

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
  productosList: ProductoListItem[];
  preselectedBarberoId?: string;
  isAdmin: boolean;
  initialData?: {
    barberoId?: string;
    client?: ClientLookupItem | null;
    servicioId?: string;
    adicionalesIds?: string[];
    precioCobrado?: string;
    medioPagoId?: string;
    notas?: string | null;
    productos?: Array<{
      productoId: string;
      cantidad: number;
      precioUnitario: string | number | null;
      esMarcianoIncluido?: boolean;
    }>;
  };
  submitLabel?: string;
  cancelLabel?: string;
  cancelHref?: string;
  editContext?: EditContext;
}

export default function AtencionForm({
  action,
  barberosList,
  serviciosList,
  adicionalesList,
  mediosPagoList,
  productosList,
  preselectedBarberoId,
  isAdmin,
  initialData,
  submitLabel = "Confirmar",
  cancelLabel = "Cancelar",
  cancelHref = "/caja",
  editContext,
}: AtencionFormProps) {
  const [barberoId, setBarberoId] = useState(initialData?.barberoId ?? preselectedBarberoId ?? "");
  const [selectedClient, setSelectedClient] = useState<ClientLookupItem | null>(
    initialData?.client ?? null
  );
  const [clientQuery, setClientQuery] = useState(
    initialData?.client ? buildClientLabel(initialData.client) : ""
  );
  const [clientResults, setClientResults] = useState<ClientLookupItem[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [servicioId, setServicioId] = useState(initialData?.servicioId ?? "");
  const [adicionalesSeleccionados, setAdicionalesSeleccionados] = useState<string[]>(
    initialData?.adicionalesIds ?? []
  );
  const [precioCobrado, setPrecioCobrado] = useState(initialData?.precioCobrado ?? "");
  const [medioPagoId, setMedioPagoId] = useState(initialData?.medioPagoId ?? "");
  const [allowManualPrice, setAllowManualPrice] = useState(false);
  const [mostrarPanelProductos, setMostrarPanelProductos] = useState(
    Boolean(initialData?.productos?.length)
  );
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionadoState[]>(
    () => buildInitialProductos(initialData?.productos, productosList)
  );

  const [state, formAction, isPending] = useActionState(action, {});
  const shouldSkipInitialAutofill = useRef(
    initialData?.precioCobrado !== undefined && initialData?.precioCobrado !== ""
  );
  const deferredClientQuery = useDeferredValue(clientQuery);

  const serviciosOrdenados = [...serviciosList].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const productosOrdenados = [...productosList].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const mediosPagoOrdenados = [...mediosPagoList].sort((a, b) => {
    const left = getMedioPagoMeta(a.nombre).order;
    const right = getMedioPagoMeta(b.nombre).order;
    if (left !== right) return left - right;
    return (a.nombre ?? "").localeCompare(b.nombre ?? "");
  });

  const servicioSeleccionado = serviciosList.find((item) => item.id === servicioId);
  const barberoSeleccionado = barberosList.find((item) => item.id === barberoId);
  const medioPagoSeleccionado = mediosPagoList.find((item) => item.id === medioPagoId);
  const adicionalesDelServicio = adicionalesList.filter((item) => item.servicioId === servicioId);
  const precioSugerido =
    Number(servicioSeleccionado?.precioBase ?? 0) +
    adicionalesSeleccionados.reduce((sum, adicionalId) => {
      const adicional = adicionalesList.find((item) => item.id === adicionalId);
      return sum + Number(adicional?.precioExtra ?? 0);
    }, 0);
  const subtotalProductos = productosSeleccionados.reduce(
    (sum, item) => sum + item.cantidad * item.precioUnitario,
    0
  );
  const canUseMarcianoConsumiciones = Boolean(selectedClient?.esMarciano);
  const consumicionesIncluidasCount = productosSeleccionados.reduce(
    (sum, item) => sum + (item.esMarcianoIncluido ? item.cantidad : 0),
    0
  );
  const ahorroMarciano = productosSeleccionados.reduce(
    (sum, item) => sum + (item.esMarcianoIncluido ? item.cantidad * item.precioLista : 0),
    0
  );

  useEffect(() => {
    if (!servicioId) return;

    if (shouldSkipInitialAutofill.current) {
      shouldSkipInitialAutofill.current = false;
      setAllowManualPrice(
        initialData?.precioCobrado !== undefined &&
          initialData?.precioCobrado !== "" &&
          Number(initialData.precioCobrado) !== precioSugerido
      );
      return;
    }

    if (!allowManualPrice) {
      setPrecioCobrado(String(precioSugerido));
    }
  }, [allowManualPrice, initialData?.precioCobrado, precioSugerido, servicioId]);

  useEffect(() => {
    const query = deferredClientQuery.trim();
    const selectedLabel = selectedClient ? buildClientLabel(selectedClient) : "";

    if (query.length < 2 || (selectedClient && query === selectedLabel)) {
      setClientResults([]);
      setIsSearchingClients(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsSearchingClients(true);
      try {
        const response = await fetch(`/api/clients/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setClientResults([]);
          return;
        }

        const data = (await response.json()) as { clients: ClientLookupItem[] };
        setClientResults(data.clients);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setClientResults([]);
        }
      } finally {
        setIsSearchingClients(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [deferredClientQuery, selectedClient]);

  useEffect(() => {
    if (canUseMarcianoConsumiciones) {
      return;
    }

    setProductosSeleccionados((prev) =>
      prev.map((item) =>
        item.esMarcianoIncluido
          ? {
              ...item,
              esMarcianoIncluido: false,
              precioUnitario: item.precioLista,
            }
          : item
      )
    );
  }, [canUseMarcianoConsumiciones]);

  function selectServicio(nextServicioId: string) {
    setServicioId(nextServicioId);
    setAdicionalesSeleccionados([]);
    setAllowManualPrice(false);
    const servicio = serviciosList.find((item) => item.id === nextServicioId);
    setPrecioCobrado(String(Number(servicio?.precioBase ?? 0)));
  }

  function toggleAdicional(id: string) {
    setAdicionalesSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function resetAutomaticPrice() {
    setAllowManualPrice(false);
    setPrecioCobrado(String(precioSugerido));
  }

  function agregarProducto(producto: ProductoListItem) {
    const precioLista = Number(producto.precioVenta ?? 0);
    const stockActual = Number(producto.stockActual ?? 0);
    if (stockActual <= 0) return;

    setProductosSeleccionados((prev) => {
      const existing = prev.find((item) => item.id === producto.id);
      if (!existing) {
        return [
          ...prev,
          {
            id: producto.id,
            nombre: producto.nombre,
            cantidad: 1,
            precioLista,
            precioUnitario: precioLista,
            stockActual,
            esConsumicion: producto.esConsumicion,
            esMarcianoIncluido: false,
          },
        ];
      }

      if (existing.cantidad >= existing.stockActual) {
        return prev;
      }

      return prev.map((item) =>
        item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
      );
    });
  }

  function cambiarCantidadProducto(productoId: string, delta: number) {
    setProductosSeleccionados((prev) =>
      prev
        .map((item) => {
          if (item.id !== productoId) return item;
          const siguiente = Math.min(item.stockActual, Math.max(0, item.cantidad + delta));
          return { ...item, cantidad: siguiente };
        })
        .filter((item) => item.cantidad > 0)
    );
  }

  function removerProducto(productoId: string) {
    setProductosSeleccionados((prev) => prev.filter((item) => item.id !== productoId));
  }

  function selectClient(client: ClientLookupItem) {
    setSelectedClient(client);
    setClientQuery(buildClientLabel(client));
    setClientResults([]);
  }

  function clearSelectedClient() {
    setSelectedClient(null);
    setClientQuery("");
    setClientResults([]);
  }

  function toggleProductoMarciano(productoId: string) {
    if (!canUseMarcianoConsumiciones) return;

    setProductosSeleccionados((prev) =>
      prev.map((item) => {
        if (item.id !== productoId || !item.esConsumicion) {
          return item;
        }

        const esMarcianoIncluido = !item.esMarcianoIncluido;
        return {
          ...item,
          esMarcianoIncluido,
          precioUnitario: esMarcianoIncluido ? 0 : item.precioLista,
        };
      })
    );
  }

  const precioServicio = Number(precioCobrado) || 0;
  const totalCobrar = precioServicio + subtotalProductos;
  const comisionMpPct = Number(medioPagoSeleccionado?.comisionPorcentaje ?? 0);
  const comisionMpMonto = (precioServicio * comisionMpPct) / 100;
  const montoNeto = precioServicio - comisionMpMonto;
  const comisionBarberoPct = Number(barberoSeleccionado?.porcentajeComision ?? 0);
  const comisionBarberoMonto = (precioServicio * comisionBarberoPct) / 100;
  const mostrarPreview = precioServicio > 0 && medioPagoId !== "";
  const barberoBloqueado = !isAdmin && Boolean(preselectedBarberoId);
  const barberosVisibles = barberoBloqueado
    ? barberosList.filter((item) => item.id === barberoId)
    : barberosList;
  const precioEditado =
    allowManualPrice && precioCobrado !== "" && precioServicio !== precioSugerido;
  const productosPayload = JSON.stringify(
    productosSeleccionados.map((item) => ({
      id: item.id,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      esMarcianoIncluido: item.esMarcianoIncluido,
    }))
  );
  const precioServicioLabel = formatARS(precioServicio);
  const subtotalProductosLabel =
    subtotalProductos > 0 ? formatARS(subtotalProductos) : "$0";
  const totalCobrarLabel = formatARS(totalCobrar);
  const montoNetoLabel = formatARS(montoNeto);
  const productosSummary =
    productosSeleccionados.length > 0
      ? productosSeleccionados
          .map((item) =>
            item.esMarcianoIncluido
              ? `${item.nombre} (Marciano x${item.cantidad})`
              : `${item.nombre} (${formatARS(item.cantidad * item.precioUnitario)})`
          )
          .join(" + ")
      : "Sin productos";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <div className="rounded-[24px] border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {state.error}
        </div>
      ) : null}

      <input type="hidden" name="clientId" value={selectedClient?.id ?? ""} />
      <input type="hidden" name="productosSeleccionados" value={productosPayload} />

      <AtencionFormHero
        editContext={editContext}
        precioServicioLabel={precioServicioLabel}
        subtotalProductosLabel={subtotalProductosLabel}
        totalCobrarLabel={totalCobrarLabel}
      />

      <section className="panel-card rounded-[30px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-xs font-semibold">Paso 1</p>
            <h3 className="font-display mt-2 text-2xl font-semibold text-white">Barbero</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {barberoBloqueado
                ? "Tu perfil ya viene seleccionado."
                : "Elegi quien esta atendiendo; define la comision principal del movimiento."}
            </p>
          </div>
          {state.fieldErrors?.barberoId ? (
            <p className="text-sm text-rose-300">{state.fieldErrors.barberoId}</p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {barberosVisibles.map((item) => (
            <BarberoAvatarButton
              key={item.id}
              active={barberoId === item.id}
              locked={barberoBloqueado}
              nombre={item.nombre}
              subtitle={
                item.id === preselectedBarberoId && !isAdmin
                  ? "Sesion activa"
                  : Number(item.porcentajeComision ?? 0) > 0
                    ? `${item.porcentajeComision}% comision`
                    : "Listo para cobrar"
              }
              emoji={getBarberoEmoji(item.nombre)}
              onClick={() => setBarberoId(item.id)}
            />
          ))}
        </div>
        <input type="hidden" name="barberoId" value={barberoId} />
      </section>

      <section className="panel-card rounded-[30px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-xs font-semibold">Paso 2</p>
            <h3 className="font-display mt-2 text-2xl font-semibold text-white">Cliente</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Opcional en caja comun. Si el cliente es Marciano, habilita consumiciones incluidas y deja trazabilidad del movimiento.
            </p>
          </div>
          {state.fieldErrors?.clientId ? (
            <p className="text-sm text-rose-300">{state.fieldErrors.clientId}</p>
          ) : null}
        </div>

        <div className="mt-5 rounded-[26px] border border-zinc-800 bg-zinc-950/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="clientSearch" className="text-sm font-medium text-zinc-200">
              Buscar cliente por nombre o telefono
            </label>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-zinc-300">
                Caja comun
              </span>
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                Marciano habilita consumiciones a $0
              </span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <input
              id="clientSearch"
              value={clientQuery}
              onChange={(event) => {
                setClientQuery(event.target.value);
                if (selectedClient && event.target.value !== buildClientLabel(selectedClient)) {
                  setSelectedClient(null);
                }
              }}
              placeholder="Ej: Juan o 11 5555 1234"
              className="h-12 flex-1 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-base text-white outline-none transition focus:border-[#8cff59]"
            />
            {selectedClient ? (
              <button
                type="button"
                onClick={clearSelectedClient}
                className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900"
              >
                Desvincular cliente
              </button>
            ) : null}
          </div>

          {!selectedClient ? (
            <div className="mt-3 rounded-[20px] border border-dashed border-zinc-700 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-400">
              Si no elegis cliente, la atencion queda como caja comun y no podras aplicar beneficios Marciano.
            </div>
          ) : null}

          {selectedClient ? (
            <div
              className={`mt-4 rounded-[24px] border px-4 py-4 text-sm ${
                selectedClient.esMarciano
                  ? "border-emerald-400/30 bg-[radial-gradient(circle_at_top_right,_rgba(52,211,153,0.18),_transparent_45%),rgba(16,185,129,0.10)] text-zinc-100"
                  : "border-zinc-700 bg-zinc-950 text-zinc-100"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold ${
                      selectedClient.esMarciano
                        ? "bg-emerald-300 text-emerald-950"
                        : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {getInitials(selectedClient.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{selectedClient.name}</p>
                    <p className="mt-1 text-zinc-300">{selectedClient.phoneRaw ?? "Sin telefono"}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    selectedClient.esMarciano
                      ? "bg-emerald-300 text-emerald-950"
                      : "bg-zinc-800 text-zinc-200"
                  }`}
                >
                  {selectedClient.esMarciano ? "Marciano activo" : "Cliente comun"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] bg-black/15 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Estado de caja
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {selectedClient.esMarciano ? "Beneficios Marciano disponibles" : "Cobro tradicional"}
                  </p>
                </div>
                <div className="rounded-[18px] bg-black/15 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Consumiciones
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {selectedClient.esMarciano
                      ? "Ya podes marcar productos incluidos a $0"
                      : "Solo productos cobrados normalmente"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {!selectedClient && isSearchingClients ? (
            <p className="mt-3 text-sm text-zinc-400">Buscando clientes...</p>
          ) : null}

          {!selectedClient && clientResults.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {clientResults.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => selectClient(client)}
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${
                    client.esMarciano
                      ? "border-emerald-500/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.10),rgba(9,9,11,0.95))] hover:border-emerald-400/40"
                      : "border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-bold ${
                          client.esMarciano
                            ? "bg-emerald-300 text-emerald-950"
                            : "bg-zinc-800 text-zinc-100"
                        }`}
                      >
                        {getInitials(client.name)}
                      </div>
                      <div>
                        <p className="font-medium text-white">{client.name}</p>
                        <p className="mt-1 text-sm text-zinc-400">{client.phoneRaw ?? "Sin telefono"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          client.esMarciano
                            ? "bg-emerald-300 text-emerald-950"
                            : "bg-zinc-800 text-zinc-200"
                        }`}
                      >
                        {client.esMarciano ? "Marciano" : "Comun"}
                      </span>
                      <span className="text-xs font-medium text-zinc-400">Seleccionar</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {!selectedClient && deferredClientQuery.trim().length >= 2 && !isSearchingClients && clientResults.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-dashed border-zinc-700 bg-zinc-950/40 px-4 py-4 text-sm text-zinc-400">
              No encontre clientes con ese criterio.
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel-card rounded-[30px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-xs font-semibold">Paso 3</p>
            <h3 className="font-display mt-2 text-2xl font-semibold text-white">Servicio</h3>
            <p className="mt-1 text-sm text-zinc-400">
              El precio cobrado sigue representando solo el servicio. Los productos van aparte.
            </p>
          </div>
          {state.fieldErrors?.servicioId ? (
            <p className="text-sm text-rose-300">{state.fieldErrors.servicioId}</p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {serviciosOrdenados.map((servicio) => {
            const active = servicioId === servicio.id;
            return (
              <button
                key={servicio.id}
                type="button"
                onClick={() => selectServicio(servicio.id)}
                className={`rounded-[26px] border p-5 text-left transition ${
                  active
                    ? "border-emerald-400 bg-emerald-400 text-emerald-950 shadow-[0_20px_40px_rgba(16,185,129,0.22)]"
                    : "border-zinc-700 bg-zinc-900 text-white hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${active ? "text-emerald-950/80" : "text-zinc-400"}`}>
                      {getServicioEmoji(servicio.nombre)} Servicio
                    </p>
                    <p className="mt-3 text-xl font-semibold leading-tight">{servicio.nombre}</p>
                  </div>
                  <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white">
                    {formatARS(Number(servicio.precioBase ?? 0))}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <input type="hidden" name="servicioId" value={servicioId} />
        {adicionalesDelServicio.length > 0 ? (
          <div className="mt-5 rounded-[26px] border border-zinc-800 bg-zinc-950/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Extras del servicio</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Sumalos con un toque y el precio sugerido del servicio se recalcula.
                </p>
              </div>
              <div className="rounded-full bg-zinc-950 px-3 py-1 text-sm font-medium text-zinc-200 ring-1 ring-zinc-800">
                Precio sugerido {formatARS(precioSugerido)}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {adicionalesDelServicio.map((adicional) => {
                const checked = adicionalesSeleccionados.includes(adicional.id);
                return (
                  <button
                    key={adicional.id}
                    type="button"
                    onClick={() => toggleAdicional(adicional.id)}
                    className={`rounded-[22px] border px-4 py-4 text-left transition ${
                      checked
                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                        : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{adicional.nombre}</p>
                        <p className="mt-1 text-sm opacity-80">
                          +{formatARS(Number(adicional.precioExtra ?? 0))}
                        </p>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                        {checked ? "Listo" : "Sumar"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {adicionalesSeleccionados.map((id) => (
              <input key={id} type="hidden" name="adicionalesIds" value={id} />
            ))}
          </div>
        ) : null}

        <div className="mt-5 rounded-[26px] border border-zinc-800 bg-zinc-950/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Productos</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Sumalos junto al servicio sin sacar stock de contexto.
                </p>
              </div>
            <div className="flex flex-wrap items-center gap-2">
              {consumicionesIncluidasCount > 0 ? (
                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200">
                  {consumicionesIncluidasCount} incluida{consumicionesIncluidasCount === 1 ? "" : "s"}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setMostrarPanelProductos((prev) => !prev)}
                className={`inline-flex min-h-[48px] items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
                  mostrarPanelProductos
                    ? "neon-button"
                    : "border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                {mostrarPanelProductos ? "Ocultar catalogo" : "+ Agregar producto"}
              </button>
            </div>
          </div>

          {canUseMarcianoConsumiciones ? (
            <div className="mt-4 rounded-[22px] border border-emerald-500/25 bg-[radial-gradient(circle_at_top_right,_rgba(52,211,153,0.15),_transparent_45%),rgba(16,185,129,0.10)] px-4 py-4 text-sm text-emerald-100">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">Marciano activado en esta caja</p>
                  <p className="mt-1 text-emerald-100/85">
                    Los productos marcados como consumicion pueden pasar a $0 y quedan registrados en el mes del cliente.
                  </p>
                </div>
                <div className="rounded-[18px] bg-black/15 px-3 py-2 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                    Ahorro marciano
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">{formatARS(ahorroMarciano)}</p>
                </div>
              </div>
            </div>
          ) : null}

          {productosSeleccionados.length > 0 ? (
            <div className="mt-4 space-y-3">
              {productosSeleccionados.map((producto) => (
                <div
                  key={producto.id}
                  className="rounded-[22px] border border-zinc-800 bg-zinc-950 px-4 py-4 text-white"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{producto.nombre}</p>
                        {producto.esConsumicion ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-300">
                            Consumicion
                          </span>
                        ) : null}
                        {producto.esMarcianoIncluido ? (
                          <span className="rounded-full bg-emerald-300 px-2 py-0.5 text-[11px] font-semibold text-emerald-950">
                            Incluida Marciano
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        {producto.cantidad} x {formatARS(producto.precioUnitario)} ={" "}
                        {formatARS(producto.cantidad * producto.precioUnitario)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => cambiarCantidadProducto(producto.id, -1)}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-sm font-semibold text-white"
                        aria-label={`Disminuir ${producto.nombre}`}
                      >
                        -
                      </button>
                      <span className="min-w-[28px] text-center text-sm font-semibold">{producto.cantidad}</span>
                      <button
                        type="button"
                        onClick={() => cambiarCantidadProducto(producto.id, 1)}
                        disabled={producto.cantidad >= producto.stockActual}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Sumar ${producto.nombre}`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removerProducto(producto.id)}
                        className="ml-1 flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-500/35 bg-rose-500/10 text-sm font-semibold text-rose-200"
                        aria-label={`Quitar ${producto.nombre}`}
                      >
                        Q
                      </button>
                    </div>
                  </div>

                  {producto.esConsumicion ? (
                    <div
                      className={`mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[18px] px-3 py-3 ${
                        producto.esMarcianoIncluido
                          ? "bg-emerald-500/15 ring-1 ring-emerald-400/20"
                          : "bg-white/5"
                      }`}
                    >
                      <div className="text-sm text-zinc-300">
                        {producto.esMarcianoIncluido ? (
                          <>
                            <span className="font-semibold text-white">Incluida en Marciano.</span>{" "}
                            Se descuenta del beneficio y suma stock consumido, no del total a cobrar.
                          </>
                        ) : canUseMarcianoConsumiciones ? (
                          "Podes incluir esta consumicion dentro del beneficio Marciano."
                        ) : (
                          "Seleccioná un cliente Marciano para habilitar la consumición incluida."
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleProductoMarciano(producto.id)}
                        disabled={!canUseMarcianoConsumiciones}
                        className={`inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
                          producto.esMarcianoIncluido
                            ? "bg-emerald-300 text-emerald-950"
                            : "border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                        }`}
                      >
                        {producto.esMarcianoIncluido ? "Sacar de Marciano" : "Incluir en Marciano"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[22px] border border-dashed border-zinc-700 bg-zinc-950/40 px-4 py-4 text-sm text-zinc-400">
              Sin productos agregados. Si el cliente tambien compra productos o usa una consumicion, lo sumas aca.
            </div>
          )}

          <div className="mt-4 rounded-[22px] bg-white/5 px-4 py-3 text-sm text-zinc-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                Subtotal productos <span className="font-semibold text-white">{formatARS(subtotalProductos)}</span>
              </span>
              {consumicionesIncluidasCount > 0 ? (
                <span className="text-xs font-semibold text-emerald-200">
                  Incluidas: {consumicionesIncluidasCount} - ahorro {formatARS(ahorroMarciano)}
                </span>
              ) : null}
            </div>
          </div>

          {mostrarPanelProductos ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {productosOrdenados.map((producto) => {
                const stockActual = Number(producto.stockActual ?? 0);
                const selected = productosSeleccionados.find((item) => item.id === producto.id);
                const agotado = stockActual <= 0;

                return (
                  <button
                    key={producto.id}
                    type="button"
                    disabled={agotado}
                    onClick={() => agregarProducto(producto)}
                    className={`rounded-[22px] border px-4 py-4 text-left transition ${
                      agotado
                        ? "cursor-not-allowed border-zinc-800 bg-zinc-950/40 text-zinc-600"
                        : selected
                          ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                          : "border-zinc-700 bg-zinc-900 text-white hover:border-zinc-600 hover:bg-zinc-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{producto.nombre}</p>
                          {producto.esConsumicion ? (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-700">
                              Consumicion
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm opacity-80">
                          {formatARS(Number(producto.precioVenta ?? 0))}
                        </p>
                        <p className="mt-1 text-xs opacity-70">
                          Stock {stockActual}
                          {selected ? ` - Seleccionado ${selected.cantidad}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white">
                        {agotado ? "Sin stock" : "Agregar"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[26px] border border-zinc-700 bg-zinc-950 p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                  Ajuste del servicio
                </p>
                <p className="mt-2 text-3xl font-bold">{formatARS(precioServicio)}</p>
                <p className="mt-2 text-sm text-zinc-400">
                  {allowManualPrice
                    ? "Ajuste manual activo. Usalo solo si hay descuento o una excepcion."
                    : "Bloqueado en automatico. Solo se habilita si queres aplicar un ajuste."}
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-200">
                {precioEditado ? "Manual" : "Auto"}
              </span>
            </div>
          </div>

          <div className="rounded-[26px] border border-zinc-800 bg-zinc-950/30 p-4">
            <label htmlFor="precioCobrado" className="text-sm font-medium text-zinc-300">
              Descuento o ajuste del servicio
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAllowManualPrice((prev) => !prev)}
                className={`inline-flex min-h-[48px] items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
                  allowManualPrice
                    ? "neon-button"
                    : "border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                {allowManualPrice ? "Volver al automatico" : "Permitir ajuste manual"}
              </button>
              {allowManualPrice ? (
                <button
                  type="button"
                  onClick={resetAutomaticPrice}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900"
                >
                  Volver al valor sugerido
                </button>
              ) : null}
            </div>

            <div className="relative mt-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
              <input
                id="precioCobrado"
                name="precioCobrado"
                type="number"
                min="0"
                step="1"
                value={precioCobrado}
                readOnly={!allowManualPrice}
                aria-readonly={!allowManualPrice}
                onChange={(event) => setPrecioCobrado(event.target.value)}
                placeholder="0"
                className={`h-14 w-full rounded-2xl border border-zinc-700 pl-8 pr-4 text-lg font-semibold outline-none transition focus:border-[#8cff59] ${
                  allowManualPrice
                    ? "bg-zinc-950 text-white"
                    : "cursor-not-allowed bg-zinc-900 text-zinc-500"
                }`}
              />
            </div>

            <p className="mt-2 text-xs text-zinc-400">
              Los productos no modifican este campo. Se cobran aparte y se suman en el total final.
            </p>

            {state.fieldErrors?.precioCobrado ? (
              <p className="mt-2 text-xs text-rose-300">{state.fieldErrors.precioCobrado}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel-card rounded-[30px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-xs font-semibold">Paso 4</p>
            <h3 className="font-display mt-2 text-2xl font-semibold text-white">Medio de pago</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Se aplica al cobro completo, pero la comision del barbero sigue calculandose solo sobre el servicio.
            </p>
          </div>
          {state.fieldErrors?.medioPagoId ? (
            <p className="text-sm text-rose-300">{state.fieldErrors.medioPagoId}</p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {mediosPagoOrdenados.map((medio) => {
            const meta = getMedioPagoMeta(medio.nombre);
            const fee = Number(medio.comisionPorcentaje ?? 0);
            const active = medioPagoId === medio.id;

            return (
              <button
                key={medio.id}
                type="button"
                onClick={() => setMedioPagoId(medio.id)}
                className={`rounded-[24px] border px-5 py-5 text-left transition ${
                  active
                    ? "border-zinc-600 bg-zinc-800 text-white shadow-[0_18px_35px_rgba(0,0,0,0.35)]"
                    : "border-zinc-700 bg-zinc-900 text-white hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm font-semibold ${active ? "text-zinc-300" : "text-zinc-400"}`}>
                      Medio de pago
                    </p>
                    <p className="mt-3 text-xl font-semibold">{meta.emoji} {meta.label}</p>
                    <p className={`mt-2 text-sm ${active ? "text-zinc-300" : "text-zinc-400"}`}>
                      {fee > 0 ? `${fee}% de comision` : "Sin comision"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <input type="hidden" name="medioPagoId" value={medioPagoId} />
      </section>

      {mostrarPreview ? (
        <AtencionFormPreview
          barberoLabel={barberoSeleccionado?.nombre ?? "Sin barbero"}
          medioPagoLabel={medioPagoSeleccionado?.nombre ?? "Sin medio"}
          precioServicioLabel={precioServicioLabel}
          subtotalProductosLabel={subtotalProductosLabel}
          montoNetoLabel={montoNetoLabel}
          totalCobrarLabel={totalCobrarLabel}
          servicioLabel={servicioSeleccionado?.nombre ?? "-"}
          clientLabel={selectedClient?.name ?? "Sin vincular"}
          productosSummary={productosSummary}
          hasProductos={productosSeleccionados.length > 0}
          comisionMpPct={comisionMpPct}
          comisionMpMontoLabel={formatARS(comisionMpMonto)}
          comisionBarberoPct={comisionBarberoPct}
          comisionBarberoMontoLabel={formatARS(comisionBarberoMonto)}
        />
      ) : null}

      <AtencionFormNotesSection defaultValue={initialData?.notas ?? ""} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="neon-button inline-flex min-h-[58px] flex-1 items-center justify-center rounded-[22px] px-6 text-base font-semibold disabled:opacity-50"
        >
          {isPending ? "Guardando..." : submitLabel}
        </button>
        <a
          href={cancelHref}
          className="ghost-button inline-flex min-h-[58px] items-center justify-center rounded-[22px] px-6 text-base font-medium"
        >
          {cancelLabel}
        </a>
      </div>
    </form>
  );
}
