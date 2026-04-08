import { notFound } from "next/navigation";
import PublicReservaAccessGate from "@/components/turnos/PublicReservaAccessGate";
import ReservaForm from "../../../components/turnos/ReservaForm";
import { canAccessPublicReserva } from "@/lib/public-reserva-access";
import {
  getFechaMananaArgentina,
  getProductosExtrasActivos,
  getServiciosPublicos,
  resolvePublicBarberoBySlug,
} from "@/lib/turnos";

type ReservarPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ReservarPage({ params }: ReservarPageProps) {
  const { slug } = await params;
  const barbero = await resolvePublicBarberoBySlug(slug);

  if (!barbero) {
    notFound();
  }

  const initialFecha = getFechaMananaArgentina();
  const hasAccess = await canAccessPublicReserva(barbero);

  if (!hasAccess) {
    return (
      <main className="public-shell min-h-screen text-white">
        <div className="public-grid min-h-screen">
          <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <PublicReservaAccessGate slug={slug} barberoNombre={barbero.nombre} />
          </div>
        </div>
      </main>
    );
  }

  const [productos, servicios] = await Promise.all([
    getProductosExtrasActivos(),
    getServiciosPublicos(),
  ]);

  return (
    <main className="public-shell min-h-screen text-white">
      <div className="public-grid min-h-screen">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <section className="public-panel public-glow rounded-[36px] border border-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl space-y-4">
                <p className="eyebrow text-[#8cff59]">Nave publica</p>
                <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                  Cae con {barbero.nombre}
                </h1>
                <p className="max-w-xl text-sm text-zinc-300 sm:text-base">
                  Elegi servicio, marca horario y manda la solicitud. La base de A51 la toma desde
                  adentro y te confirma el movimiento sin mezclar musica con reserva.
                </p>
              </div>

              <div className="grid min-w-[220px] gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Servicios</p>
                  <p className="mt-2 text-lg font-semibold text-white">{servicios.length} activos</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Extras</p>
                  <p className="mt-2 text-lg font-semibold text-white">{productos.length} opcionales</p>
                </div>
                <div className="rounded-[22px] border border-[#8cff59]/20 bg-[#8cff59]/8 px-4 py-3 sm:col-span-2 lg:col-span-1">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8cff59]">Agenda</p>
                  <p className="mt-2 text-lg font-semibold text-white">Desde manana</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Elegi el servicio", "Marca tu slot", "Recibi la senal"].map((item, index) => (
                <div key={item} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Paso {index + 1}</p>
                  <p className="mt-2 text-sm font-medium text-white">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="space-y-5">
              <ReservaForm
                slug={slug}
                barberoNombre={barbero.nombre}
                initialFecha={initialFecha}
                productos={productos}
                servicios={servicios.map((servicio) => ({
                  id: servicio.id,
                  nombre: servicio.nombre,
                  precioBase: servicio.precioBase,
                  duracionMinutos: servicio.duracionMinutos,
                }))}
              />
            </div>

            <aside className="space-y-4 xl:sticky xl:top-6">
              <div className="public-panel rounded-[30px] border border-white/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Como viaja
                </p>
                <p className="mt-2 font-display text-2xl font-semibold text-white">
                  Flujo corto y sin rebote
                </p>
                <div className="mt-4 space-y-3 text-sm text-zinc-300">
                  <p>Elegis un servicio y la grilla te muestra solo slots que cierran.</p>
                  <p>La fecha sale desde manana y la musica queda separada del envio final.</p>
                  <p>Cuando lo mandas, A51 baja la senal y confirma desde la base.</p>
                </div>
              </div>

              <div className="rounded-[30px] border border-[#8cff59]/20 bg-[#8cff59]/8 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8cff59]">
                  Confianza
                </p>
                <p className="mt-2 text-sm text-zinc-200">
                  Tu solicitud viaja con tus datos de contacto, el servicio elegido y la hora
                  exacta.
                </p>
                <p className="mt-3 text-sm text-zinc-300">
                  Si ya tenes cuenta, te saltas la clave y el movimiento queda alineado con tu
                  historial Marciano.
                </p>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}
