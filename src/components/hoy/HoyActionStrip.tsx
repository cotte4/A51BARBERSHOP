"use client";

import Link from "next/link";
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import QuickCheckoutPanel from "@/components/caja/QuickCheckoutPanel";
import type { AtencionRapidaState } from "@/app/(barbero)/caja/actions";

type Servicio = { id: string; nombre: string; precioBase: string | null };
type MedioPago = { id: string; nombre: string | null; comisionPorcentaje: string | null };

type HoyActionStripProps = {
  turnosCount: number;
  productosCount: number;
  stockAlertsCount: number;
  atencionesCount: number;
  totalCobrado: number;
  servicios: Servicio[];
  mediosPago: MedioPago[];
  action: (prevState: AtencionRapidaState, formData: FormData) => Promise<AtencionRapidaState>;
};

function LightningIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M13 2 6 13h5l-1 9 8-12h-5l1-8Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M7.5 3.5V7" strokeLinecap="round" />
      <path d="M16.5 3.5V7" strokeLinecap="round" />
      <path d="M3.5 9.5h17" />
    </svg>
  );
}

function BottleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M10 3h4" strokeLinecap="round" />
      <path
        d="M11 3v3l-3 4.5V18a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3v-7.5L13 6V3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 11h6" strokeLinecap="round" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M7 9h.01M17 15h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowUpRightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 17 17 7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

function ActionCard({
  href,
  eyebrow,
  title,
  description,
  badge,
  actionLabel,
  icon,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
  actionLabel: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[164px] flex-col rounded-[24px] border border-zinc-800/90 bg-[linear-gradient(180deg,rgba(17,17,20,0.96),rgba(11,11,14,0.98))] p-4 text-left text-white shadow-[0_14px_30px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:border-[#8cff59]/20 sm:min-h-[176px] sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {eyebrow}
        </p>
        <span className="flex h-10 w-10 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-zinc-300">
          {icon}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <h3 className="font-display text-[1.25rem] font-semibold leading-none text-white sm:text-[1.35rem]">
          {title}
        </h3>
        <p className="max-w-[24ch] text-sm leading-5 text-zinc-400">{description}</p>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-zinc-300">
          {badge}
        </span>
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#8cff59]">
          {actionLabel}
          <ArrowUpRightIcon />
        </span>
      </div>
    </Link>
  );
}

export default function HoyActionStrip({
  turnosCount,
  productosCount,
  stockAlertsCount,
  atencionesCount,
  totalCobrado,
  servicios,
  mediosPago,
  action,
}: HoyActionStripProps) {
  const [showNueva, setShowNueva] = useState(false);
  const agendaDescription =
    turnosCount > 0
      ? `${turnosCount} turnos activos listos para seguir desde la agenda.`
      : "No hay turnos cargados. Abrila y ocupa el hueco rapido.";
  const productosDescription =
    stockAlertsCount > 0
      ? `${stockAlertsCount} productos quedaron en alerta. Vende y revisa reposicion.`
      : `${productosCount} productos listos para vender sin salir del flujo.`;
  const cajaDescription =
    atencionesCount > 0
      ? `${atencionesCount} atenciones activas y ${formatARS(totalCobrado)} en el dia.`
      : "Movimientos, cobros y cierre en una sola entrada clara.";

  return (
    <section id="comandos" className="panel-card rounded-[32px] p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-[11px] font-semibold">Centro de comandos</p>
          <h2 className="font-display mt-2 text-[1.75rem] font-semibold leading-none text-white sm:text-[1.9rem]">
            Accion rapida
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-5 text-zinc-400 sm:leading-6">
            Cobrar, abrir agenda, vender productos o revisar caja sin perder tiempo.
          </p>
        </div>

        <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          {turnosCount} turnos hoy
        </span>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <button
          type="button"
          onClick={() => setShowNueva(true)}
          className="group flex min-h-[212px] flex-col rounded-[24px] border border-[#8cff59]/16 bg-[linear-gradient(135deg,rgba(140,255,89,0.9),rgba(182,255,132,0.8))] p-4 text-left text-[#07130a] shadow-[0_16px_34px_rgba(140,255,89,0.14)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_38px_rgba(140,255,89,0.16)] sm:min-h-[224px] sm:p-5 xl:col-span-2"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#07130a]/66">
              01 / prioridad
            </p>
            <span className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#07130a]/10 bg-[#07130a]/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <LightningIcon />
            </span>
          </div>

          <div className="mt-5 max-w-md space-y-3">
            <h3 className="font-display text-[1.8rem] font-bold leading-none text-[#07130a] sm:text-[2.1rem]">
              Atencion express
            </h3>
            <p className="max-w-[34ch] text-sm leading-5 text-[#07130a]/76 sm:leading-6">
              Registrar servicio, cobro y salida rapida desde un solo modal.
            </p>
          </div>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
            <span className="rounded-full border border-[#07130a]/10 bg-[#07130a]/8 px-3 py-1.5 text-[11px] font-semibold text-[#07130a]/74">
              Entrada directa
            </span>
            <span className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#07130a]/92 px-4 text-sm font-semibold text-[#d7ffbf] shadow-[0_8px_18px_rgba(7,19,10,0.18)]">
              Cobrar ahora
              <ArrowUpRightIcon />
            </span>
          </div>
        </button>

        <ActionCard
          href="/turnos"
          eyebrow="02 / agenda"
          title="Abrir agenda"
          description={agendaDescription}
          badge={turnosCount > 0 ? `${turnosCount} activos` : "Hoy libre"}
          actionLabel="Ver turnos"
          icon={<CalendarIcon />}
        />

        <ActionCard
          href="/caja/vender"
          eyebrow="03 / productos"
          title="Vender"
          description={productosDescription}
          badge={stockAlertsCount > 0 ? `${stockAlertsCount} alertas` : "Stock al dia"}
          actionLabel="Abrir venta"
          icon={<BottleIcon />}
        />

        <ActionCard
          href="/caja"
          eyebrow="04 / caja"
          title="Ver caja"
          description={cajaDescription}
          badge={atencionesCount > 0 ? formatARS(totalCobrado) : "Sin movimiento"}
          actionLabel="Ir a caja"
          icon={<CashIcon />}
        />
      </div>

      {showNueva ? (
        <Modal onClose={() => setShowNueva(false)}>
          <div className="mb-4">
            <p className="eyebrow text-xs font-semibold text-zinc-500">Caja</p>
            <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
              Atencion express
            </h2>
          </div>
          <QuickCheckoutPanel
            servicios={servicios}
            mediosPago={mediosPago}
            action={action}
            returnTo="/hoy"
            variant="embedded"
          />
        </Modal>
      ) : null}
    </section>
  );
}
