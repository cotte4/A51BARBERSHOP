import { eq } from "drizzle-orm";
import { db } from "@/db";
import { barberos } from "@/db/schema";
import Modal from "@/components/ui/Modal";
import NuevaLiquidacionForm from "../../nueva/_NuevaLiquidacionForm";

type Props = {
  searchParams: Promise<{
    barberoId?: string;
    fecha?: string;
  }>;
};

export default async function NuevaLiquidacionModal({ searchParams }: Props) {
  const params = await searchParams;
  const barberosActivos = await db.select().from(barberos).where(eq(barberos.activo, true));
  const barberosLiquidables = barberosActivos.filter((b) => b.rol !== "admin");

  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Liquidaciones</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Nueva liquidación
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {barberosLiquidables.length} barbero{barberosLiquidables.length !== 1 ? "s" : ""}{" "}
          disponible{barberosLiquidables.length !== 1 ? "s" : ""}
        </p>
      </div>

      <NuevaLiquidacionForm
        barberosList={barberosLiquidables.map((b) => ({
          id: b.id,
          nombre: b.nombre,
        }))}
        initialBarberoId={params.barberoId}
        initialFecha={params.fecha}
      />
    </Modal>
  );
}
