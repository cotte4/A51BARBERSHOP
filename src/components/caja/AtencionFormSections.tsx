"use client";

import type { EditContext } from "@/components/caja/atencion-form-utils";

type AtencionFormHeroProps = {
  editContext?: EditContext;
  precioServicioLabel: string;
  subtotalProductosLabel: string;
  totalCobrarLabel: string;
};

export function AtencionFormHero({
  editContext,
  precioServicioLabel,
  subtotalProductosLabel,
  totalCobrarLabel,
}: AtencionFormHeroProps) {
  return (
    <section className="overflow-hidden rounded-[30px] bg-zinc-950 text-zinc-50 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.28),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.18),_transparent_28%)] p-6">
        {editContext ? (
          <>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow text-xs font-semibold">Edicion de movimiento</p>
                <h3 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Estas editando una atencion ya registrada.
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Ajusta solo lo que cambie: barbero, cliente, servicio, productos, precio
                  o medio de pago. Stock, comisiones y total se vuelven a calcular al
                  guardar.
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1 text-zinc-300">
                    Mov #{editContext.movementCode}
                  </span>
                  <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1 text-zinc-300">
                    {editContext.dateLabel}
                  </span>
                  <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1 text-zinc-300">
                    {editContext.timeLabel}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[380px]">
                <div className="rounded-[24px] border border-zinc-700 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Servicio
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">{editContext.serviceAmount}</p>
                  <p className="mt-1 text-sm text-zinc-400">{editContext.servicioLabel}</p>
                </div>
                <div className="rounded-[24px] border border-zinc-700 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Productos
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">{editContext.productsAmount}</p>
                  <p className="mt-1 text-sm text-zinc-400">Stock y consumos</p>
                </div>
                <div className="rounded-[24px] border border-emerald-500/25 bg-emerald-500/12 p-4 text-emerald-50 sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/80">
                    Total del movimiento
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">{editContext.totalAmount}</p>
                  <p className="mt-1 text-sm text-emerald-100/80">
                    Lo que ves aca es la base de la caja antes de guardar los cambios.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[22px] border border-zinc-700 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Barbero
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{editContext.barberoLabel}</p>
                <p className="mt-1 text-sm text-zinc-400">Define la comision del servicio</p>
              </div>
              <div className="rounded-[22px] border border-zinc-700 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Cliente
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{editContext.clientLabel}</p>
                <p className="mt-1 text-sm text-zinc-400">Marciano desbloquea consumiciones a $0</p>
              </div>
              <div className="rounded-[22px] border border-zinc-700 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Medio de pago
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{editContext.medioPagoLabel}</p>
                <p className="mt-1 text-sm text-zinc-400">Solo impacta la comision del cobro</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                Smart POS
              </p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight">
                Servicio, cliente y productos en un solo flujo.
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Si el cliente es Marciano, las consumiciones incluidas quedan registradas sin
                romper stock ni caja.
              </p>
            </div>

            <div className="grid min-w-[280px] gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Servicio
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{precioServicioLabel}</p>
              </div>
              <div className="rounded-[24px] bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  Productos
                </p>
                <p className="mt-2 text-lg font-semibold text-white">{subtotalProductosLabel}</p>
              </div>
              <div className="rounded-[24px] bg-emerald-400 p-4 text-emerald-950">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900/80">
                  Total
                </p>
                <p className="mt-2 text-2xl font-bold">{totalCobrarLabel}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

type AtencionFormPreviewProps = {
  barberoLabel: string;
  medioPagoLabel: string;
  precioServicioLabel: string;
  subtotalProductosLabel: string;
  montoNetoLabel: string;
  totalCobrarLabel: string;
  servicioLabel: string;
  clientLabel: string;
  productosSummary: string;
  hasProductos: boolean;
  comisionMpPct: number;
  comisionMpMontoLabel: string;
  comisionBarberoPct: number;
  comisionBarberoMontoLabel: string;
};

export function AtencionFormPreview({
  barberoLabel,
  medioPagoLabel,
  precioServicioLabel,
  subtotalProductosLabel,
  montoNetoLabel,
  totalCobrarLabel,
  servicioLabel,
  clientLabel,
  productosSummary,
  hasProductos,
  comisionMpPct,
  comisionMpMontoLabel,
  comisionBarberoPct,
  comisionBarberoMontoLabel,
}: AtencionFormPreviewProps) {
  return (
    <section className="panel-card rounded-[28px] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
            Chequeo final
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Revisar antes de guardar</h3>
        </div>
        <div className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
          {barberoLabel} - {medioPagoLabel}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-[22px] bg-zinc-800 p-4">
          <p className="text-xs font-medium text-zinc-400">Servicio</p>
          <p className="mt-2 text-2xl font-bold text-white">{precioServicioLabel}</p>
        </div>
        <div className="rounded-[22px] bg-zinc-800 p-4">
          <p className="text-xs font-medium text-zinc-400">Productos</p>
          <p className="mt-2 text-2xl font-bold text-white">{subtotalProductosLabel}</p>
        </div>
        <div className="rounded-[22px] bg-zinc-800 p-4">
          <p className="text-xs font-medium text-zinc-400">Neto servicio</p>
          <p className="mt-2 text-2xl font-bold text-white">{montoNetoLabel}</p>
        </div>
        <div className="rounded-[22px] bg-zinc-950 p-4 text-white">
          <p className="text-xs font-medium text-zinc-400">Total a cobrar</p>
          <p className="mt-2 text-2xl font-bold">{totalCobrarLabel}</p>
        </div>
      </div>

      <div className="mt-4 rounded-[22px] border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-400">
        <div className="flex items-center justify-between gap-3">
          <span>Servicio</span>
          <span className="font-medium text-white">
            {servicioLabel} - {precioServicioLabel}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span>Cliente</span>
          <span className="font-medium text-white">{clientLabel}</span>
        </div>
        <div className="mt-2 flex items-start justify-between gap-3">
          <span>Productos</span>
          <div className="text-right font-medium text-white">
            <p>{productosSummary}</p>
            {hasProductos ? (
              <p className="mt-1 text-xs text-zinc-500">Subtotal {subtotalProductosLabel}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span>Medio de pago</span>
          <span className="font-medium text-white">{medioPagoLabel}</span>
        </div>
        {comisionMpPct > 0 ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <span>Comision del medio sobre servicio ({comisionMpPct}%)</span>
            <span className="font-medium text-white">-{comisionMpMontoLabel}</span>
          </div>
        ) : null}
        {comisionBarberoPct > 0 ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <span>{barberoLabel} ({comisionBarberoPct}%)</span>
            <span className="font-medium text-white">{comisionBarberoMontoLabel}</span>
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-zinc-700 pt-3">
          <span className="font-semibold text-white">Total a cobrar</span>
          <span className="text-base font-bold text-white">{totalCobrarLabel}</span>
        </div>
      </div>
    </section>
  );
}

type AtencionFormNotesSectionProps = {
  defaultValue: string;
};

export function AtencionFormNotesSection({ defaultValue }: AtencionFormNotesSectionProps) {
  return (
    <section className="panel-card rounded-[30px] p-5">
      <label htmlFor="notas" className="text-sm font-medium text-zinc-300">
        Notas
        <span className="ml-2 text-xs text-zinc-500">(opcional)</span>
      </label>
      <textarea
        id="notas"
        name="notas"
        rows={3}
        defaultValue={defaultValue}
        placeholder="Ej: ajuste, observacion o detalle interno"
        className="mt-3 w-full resize-none rounded-[22px] border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-base text-white outline-none focus:border-[#8cff59]"
      />
      <p className="mt-2 text-xs text-zinc-500">
        Las notas ayudan a entender el movimiento, pero no cambian comisiones ni stock.
      </p>
    </section>
  );
}
