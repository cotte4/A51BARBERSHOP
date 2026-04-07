import Link from "next/link";
import AlienSignalPanel from "@/components/branding/AlienSignalPanel";
import { db } from "@/db";
import { barberos, gastos, mediosPago, servicios, temporadas } from "@/db/schema";

function formatCount(value: number) {
  return new Intl.NumberFormat("es-AR").format(value);
}

export default async function ConfiguracionPage() {
  const [barberosList, serviciosList, mediosPagoList, gastosList, temporadasList] =
    await Promise.all([
      db.select().from(barberos),
      db.select().from(servicios),
      db.select().from(mediosPago),
      db.select().from(gastos),
      db.select().from(temporadas),
    ]);

  const activeBarberos = barberosList.filter((item) => item.activo).length;
  const activeServicios = serviciosList.filter((item) => item.activo ?? true).length;
  const activeMedios = mediosPagoList.filter((item) => item.activo ?? true).length;
  const recurrentes = gastosList.filter((item) => item.esRecurrente).length;
  const temporadaActiva = temporadasList.find((item) => item.fechaFin === null);

  const cards = [
    {
      href: "/configuracion/barberos",
      title: "Barberos",
      stat: `${activeBarberos}/${barberosList.length}`,
      detail: "Perfiles, comisiones, modelo y defaults de caja.",
      cta: "Ver barberos",
    },
    {
      href: "/configuracion/servicios",
      title: "Servicios",
      stat: `${activeServicios}/${serviciosList.length}`,
      detail: "Precios base, adicionales e historial de cambios.",
      cta: "Ver servicios",
    },
    {
      href: "/configuracion/medios-de-pago",
      title: "Medios de pago",
      stat: `${activeMedios}/${mediosPagoList.length}`,
      detail: "Comisiones y estados activos para cobrar mejor.",
      cta: "Ver medios de pago",
    },
    {
      href: "/configuracion/gastos-fijos",
      title: "Gastos fijos",
      stat: formatCount(recurrentes),
      detail: "Cargas recurrentes y egresos que no conviene perder de vista.",
      cta: "Ver gastos fijos",
    },
    {
      href: "/configuracion/temporadas",
      title: "Temporadas",
      stat: temporadaActiva ? "1 activa" : "Sin activa",
      detail: "Ventanas de trabajo y proyecciones de ritmo/precio.",
      cta: "Ver temporadas",
    },
    {
      href: "/configuracion/musica",
      title: "Musica",
      stat: "Auto",
      detail: "Spotify, player esperado y reglas que acompañan el local.",
      cta: "Ver musica",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="panel-card rounded-[28px] p-6 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Resumen operativo</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Configuracion
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              Este es el tablero donde se ordena el motor del negocio. Entradas claras, acciones
              sensibles y acceso rapido a cada modulo.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
                {barberosList.length} barberos
              </span>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
                {serviciosList.length} servicios
              </span>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
                {mediosPagoList.length} medios
              </span>
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
                {gastosList.length} gastos
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/configuracion/barberos"
              className="neon-button inline-flex min-h-[52px] items-center justify-center rounded-2xl px-5 text-sm font-semibold transition"
            >
              Ir a barberos
            </Link>
            <Link
              href="/configuracion/musica"
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-5 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
            >
              Ver musica
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <AlienSignalPanel
            eyebrow="Motor central"
            title="Senal de configuracion"
            detail="Barberos, servicios, cobros, temporadas y musica viven aca porque cualquier cambio pega en toda la cabina operativa."
            badges={[
              `${activeBarberos} activos`,
              `${activeServicios} servicios`,
              temporadaActiva ? "temporada activa" : "sin temporada",
            ]}
            tone="sky"
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="panel-card group rounded-[28px] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#8cff59]/30"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              {card.title}
            </p>
            <p className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
              {card.stat}
            </p>
            <p className="mt-3 text-sm text-zinc-400">{card.detail}</p>
            <span className="mt-5 inline-flex text-sm font-semibold text-[#8cff59] transition group-hover:translate-x-0.5">
              {card.cta} →
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
