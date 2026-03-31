import Link from "next/link";

const sections = [
  {
    title: "Ventas y caja",
    description: "Resumen del negocio, caja y reportes del dia.",
    links: [
      { href: "/dashboard", label: "Resumen del negocio", detail: "KPIs, alertas y estado general" },
      { href: "/caja/cierre", label: "Cierre y reportes", detail: "Cierre del dia y resumen final" },
    ],
  },
  {
    title: "Inventario",
    description: "Stock, productos y rotacion de retail.",
    links: [
      { href: "/inventario", label: "Inventario", detail: "Productos y alertas de stock" },
      { href: "/inventario/rotacion", label: "Rotacion", detail: "Lo que mas se mueve y lo que no" },
    ],
  },
  {
    title: "Barberos",
    description: "Resultados, liquidaciones y seguimiento del equipo.",
    links: [
      { href: "/liquidaciones", label: "Liquidaciones", detail: "Pagos, pendientes y comprobantes" },
      { href: "/mi-resultado", label: "Mi resultado", detail: "Vista financiera personal del owner" },
    ],
  },
  {
    title: "Pagos",
    description: "Compromisos del negocio, medios de pago y gastos.",
    links: [
      { href: "/repago", label: "Repago", detail: "Seguimiento de cuotas y saldo pendiente" },
      { href: "/configuracion/medios-de-pago", label: "Medios de pago", detail: "Comisiones y canales de cobro" },
      { href: "/configuracion/gastos-fijos", label: "Gastos fijos", detail: "Base de costos del negocio" },
      { href: "/gastos-rapidos", label: "Gastos rapidos", detail: "Historial del gasto operativo diario" },
    ],
  },
  {
    title: "Configuracion",
    description: "Reglas, servicios y estructura del local.",
    links: [
      { href: "/configuracion/servicios", label: "Servicios", detail: "Catalogo, precios y extras" },
      { href: "/configuracion/temporadas", label: "Temporadas", detail: "Metas y proyecciones" },
      { href: "/configuracion/barberos", label: "Barberos", detail: "Equipo, perfiles y defaults" },
    ],
  },
] as const;

export default function NegocioPage() {
  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-28">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[32px] bg-stone-950 text-stone-50 shadow-[0_24px_80px_rgba(28,25,23,0.22)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.28),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.18),_transparent_30%)] p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">Negocio</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Todo el control del local, fuera del camino operativo.</h1>
            <p className="mt-3 max-w-2xl text-sm text-stone-300">
              Pinky trabaja igual que cualquier barbero en `Hoy`, `Caja`, `Clientes` y `Turnos`. Este tab junta solo lo que pertenece al rol de owner.
            </p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          {sections.map((section) => (
            <article key={section.title} className="panel-card rounded-[30px] p-5">
              <p className="eyebrow text-xs font-semibold">{section.title}</p>
              <h2 className="font-display mt-2 text-2xl font-semibold text-white">{section.title}</h2>
              <p className="mt-2 text-sm text-zinc-400">{section.description}</p>

              <div className="mt-4 space-y-3">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between gap-4 rounded-[24px] border border-zinc-800 bg-zinc-950/25 px-4 py-4 transition hover:-translate-y-0.5 hover:border-[#8cff59]/30"
                  >
                    <div>
                      <p className="font-semibold text-white">{link.label}</p>
                      <p className="mt-1 text-sm text-zinc-400">{link.detail}</p>
                    </div>
                    <span className="text-lg text-[#8cff59]">+</span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
