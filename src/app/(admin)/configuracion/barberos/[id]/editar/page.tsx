import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import BarberoForm from "@/components/configuracion/BarberoForm";
import ToggleActivoButton from "@/components/configuracion/ToggleActivoButton";
import { db } from "@/db";
import { barberoPortfolioItems, barberos, mediosPago, servicios } from "@/db/schema";
import { editarBarbero, toggleActivoBarbero } from "../../actions";
import PortfolioAdmin from "./_PortfolioAdmin";

interface EditarBarberoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarBarberoPage({ params }: EditarBarberoPageProps) {
  const { id } = await params;

  const [[barbero], serviciosActivos, mediosPagoActivos, portfolioItems] = await Promise.all([
    db.select().from(barberos).where(eq(barberos.id, id)).limit(1),
    db
      .select({ id: servicios.id, nombre: servicios.nombre })
      .from(servicios)
      .where(eq(servicios.activo, true)),
    db
      .select({ id: mediosPago.id, nombre: mediosPago.nombre })
      .from(mediosPago)
      .where(eq(mediosPago.activo, true)),
    db
      .select()
      .from(barberoPortfolioItems)
      .where(eq(barberoPortfolioItems.barberoId, id))
      .orderBy(barberoPortfolioItems.orden),
  ]);

  if (!barbero) {
    notFound();
  }

  const editarConId = editarBarbero.bind(null, id);

  return (
    <div className="space-y-6">
      <section className="panel-card rounded-[28px] p-6 sm:p-7">
        <Link href="/configuracion/barberos" className="text-sm text-zinc-400 transition hover:text-[#8cff59]">
          ← Barberos
        </Link>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow">Configuracion / Barberos</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Editar: {barbero.nombre}
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Los cambios sensibles de este perfil se resuelven desde esta pantalla, con el estado
              activo visible y una lectura clara de impacto.
            </p>
          </div>

          <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              Accion sensible
            </p>
            <p className="mt-2 text-sm text-amber-50/80">
              Activar o desactivar este perfil impacta caja y liquidaciones.
            </p>
            <div className="mt-4">
              <ToggleActivoButton
                id={barbero.id}
                activo={barbero.activo ?? true}
                toggleAction={toggleActivoBarbero}
              />
            </div>
          </div>
        </div>
      </section>

      <BarberoForm
        action={editarConId}
        initialData={{
          nombre: barbero.nombre,
          rol: barbero.rol,
          tipoModelo: barbero.tipoModelo ?? undefined,
          porcentajeComision: barbero.porcentajeComision,
          alquilerBancoMensual: barbero.alquilerBancoMensual,
          sueldoMinimoGarantizado: barbero.sueldoMinimoGarantizado,
          servicioDefectoId: barbero.servicioDefectoId,
          medioPagoDefectoId: barbero.medioPagoDefectoId,
          publicSlug: barbero.publicSlug,
          publicReservaActiva: barbero.publicReservaActiva,
          publicReservaPasswordConfigured: Boolean(barbero.publicReservaPasswordHash),
        }}
        serviciosOptions={serviciosActivos}
        mediosPagoOptions={mediosPagoActivos}
        submitLabel="Guardar cambios"
      />

      <PortfolioAdmin barberoId={id} items={portfolioItems} />
    </div>
  );
}
