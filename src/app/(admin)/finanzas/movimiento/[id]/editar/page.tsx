import { db } from "@/db";
import { capitalMovimientos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import EditarMovimientoForm from "./_EditarMovimientoForm";

export default async function EditarMovimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const mov = await db.query.capitalMovimientos.findFirst({
    where: eq(capitalMovimientos.id, id),
  });

  if (!mov) notFound();

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
          <h1 className="font-display mt-4 text-2xl font-semibold capitalize text-white">
            Editar {mov.tipo}
          </h1>
        </div>

        <div className="panel-card rounded-[28px] p-5">
          <EditarMovimientoForm mov={mov} />
        </div>
      </main>
    </div>
  );
}
