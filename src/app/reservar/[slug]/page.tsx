import { notFound } from "next/navigation";
import ReservaForm from "@/components/turnos/ReservaForm";
import { getFechaHoyArgentina, getProductosExtrasActivos, resolvePublicBarberoBySlug } from "@/lib/turnos";

type ReservarPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ReservarPage({ params }: ReservarPageProps) {
  const { slug } = await params;
  const barbero = await resolvePublicBarberoBySlug(slug);

  if (!barbero) {
    notFound();
  }

  const productos = await getProductosExtrasActivos();
  const initialFecha = getFechaHoyArgentina();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <section className="rounded-[2rem] bg-gray-900 px-6 py-8 text-white shadow-lg">
          <p className="text-xs uppercase tracking-[0.25em] text-gray-300">A51 Barber</p>
          <h1 className="mt-3 text-3xl font-semibold">ReservÃ¡ con {barbero.nombre}</h1>
          <p className="mt-3 max-w-xl text-sm text-gray-300">
            ElegÃ­ un horario disponible y enviÃ¡ tu solicitud. La confirmaciÃ³n final la hace Pinky desde la barber.
          </p>
        </section>

        <ReservaForm
          slug={slug}
          barberoNombre={barbero.nombre}
          initialFecha={initialFecha}
          productos={productos}
        />
      </div>
    </main>
  );
}
