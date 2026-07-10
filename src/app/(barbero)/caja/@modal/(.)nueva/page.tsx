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
  await searchParams;
  const actor = await getCajaActorContext();
  const isAdmin = actor?.isAdmin ?? false;

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
          <p className="font-medium text-white">Ya cerraste la caja de hoy — para cargar algo más, hablá con el owner.</p>
        </div>
      </Modal>
    );
  }

  if (!isAdmin && !actor?.barberoId) {
    return (
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">Todavía no te asociamos a un perfil de barbero.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Pedile al owner que te vincule desde Configuración.
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
          Nueva atención
        </h2>
      </div>

      <div className="space-y-4">
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
            ¿Necesitás sumar cliente o productos? Cargalo completo
          </Link>
        </div>
      </div>
    </Modal>
  );
}
