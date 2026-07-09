import Link from "next/link";
import { eq } from "drizzle-orm";
import QuickCheckoutPanel from "@/components/caja/QuickCheckoutPanel";
import Modal from "@/components/ui/Modal";
import { db } from "@/db";
import { cierresCaja, mediosPago, servicios } from "@/db/schema";
import { getCajaActorContext } from "@/lib/caja-access";
import { getDefaultsCobroRecientes } from "@/lib/dashboard-queries";
import { registrarAtencionExpressAction } from "../../actions";

type Props = {
  searchParams: Promise<{
    barberoId?: string;
    servicioId?: string;
    medioPagoId?: string;
    precioCobrado?: string;
    fromQuickAction?: string;
  }>;
};

export default async function NuevaAtencionModal({ searchParams }: Props) {
  const actor = await getCajaActorContext();
  const isAdmin = actor?.isAdmin ?? false;
  const params = await searchParams;

  const fechaHoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const [cierreExistente] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fechaHoy))
    .limit(1);

  if (cierreExistente) {
    return (
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">La caja del dia ya fue cerrada.</p>
          <p className="mt-1 text-sm text-zinc-400">No se pueden registrar nuevas atenciones.</p>
        </div>
      </Modal>
    );
  }

  if (!isAdmin && !actor?.barberoId) {
    return (
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">Tu usuario no tiene un barbero activo vinculado.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Vincula el usuario desde configuracion antes de registrar atenciones.
          </p>
        </div>
      </Modal>
    );
  }

  const [serviciosActivos, mediosPagoActivos, defaults] = await Promise.all([
    db.select().from(servicios).where(eq(servicios.activo, true)),
    db.select().from(mediosPago).where(eq(mediosPago.activo, true)),
    getDefaultsCobroRecientes(),
  ]);

  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Caja</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Nueva atencion
        </h2>
      </div>

      <div className="space-y-4">
        {params.fromQuickAction ? (
          <div className="rounded-[18px] border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-zinc-200">
            Configura el servicio y medio de pago por defecto del barbero para usar la accion
            rapida sin pasar por este formulario.
          </div>
        ) : null}

        <QuickCheckoutPanel
          servicios={serviciosActivos.map((s) => ({ id: s.id, nombre: s.nombre, precioBase: s.precioBase }))}
          mediosPago={mediosPagoActivos.map((m) => ({ id: m.id, nombre: m.nombre, comisionPorcentaje: m.comisionPorcentaje }))}
          action={registrarAtencionExpressAction}
          defaultServicioId={defaults.servicioId ?? undefined}
          defaultMedioPagoId={defaults.medioPagoId ?? undefined}
        />

        <div className="text-center">
          <Link
            href="/caja/nueva"
            className="text-sm text-zinc-500 transition-colors hover:text-[#8cff59]"
          >
            Carga completa (cliente, productos, extras)
          </Link>
        </div>
      </div>
    </Modal>
  );
}
