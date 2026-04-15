import { db } from "@/db";
import { costosFijosNegocio } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import EditarCostoForm from "./_EditarCostoForm";

export default async function EditarCostoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const costo = await db.query.costosFijosNegocio.findFirst({
    where: eq(costosFijosNegocio.id, id),
  });

  if (!costo) notFound();

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <BrandMark href="/finanzas" subtitle="Finanzas" />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
        <div>
          <Link href="/finanzas" className="text-sm text-zinc-400 hover:text-[#8cff59]">
            ← Volver a Finanzas
          </Link>
          <h1 className="font-display mt-4 text-2xl font-semibold text-white">
            Editar: {costo.nombre}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Actualizá el monto si cambió. El historial queda en los registros de caja.
          </p>
        </div>

        <div className="panel-card rounded-[28px] p-5">
          <EditarCostoForm costo={costo} />
        </div>
      </main>
    </div>
  );
}
