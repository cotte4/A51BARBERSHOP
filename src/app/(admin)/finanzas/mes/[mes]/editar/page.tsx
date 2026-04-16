import { db } from "@/db";
import { costosFijosNegocio, costosFijosValores } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { formatARS } from "@/lib/format";
import EditarMesForm from "./_EditarMesForm";

function getMesLabel(mes: string): string {
  const [year, month] = mes.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  const label = date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function EditarMesPage({
  params,
}: {
  params: Promise<{ mes: string }>;
}) {
  const { mes } = await params;

  // Validar formato YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return (
      <div className="app-shell min-h-screen flex items-center justify-center">
        <p className="text-zinc-400">Mes inválido.</p>
      </div>
    );
  }

  const [costos, valoresMes] = await Promise.all([
    db.select().from(costosFijosNegocio).orderBy(costosFijosNegocio.categoria, costosFijosNegocio.nombre),
    db.select().from(costosFijosValores).where(eq(costosFijosValores.mes, mes)),
  ]);

  const mesLabel = getMesLabel(mes);
  const totalMes = valoresMes.reduce((acc, v) => acc + Number(v.monto), 0);
  const valoresMap = new Map(valoresMes.map((v) => [v.costoId, v.monto]));

  const valoresParaForm = costos.map((c) => ({
    costoId: c.id,
    monto: valoresMap.get(c.id) ?? null,
  }));

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <BrandMark href="/finanzas" subtitle="Finanzas" />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
        <div>
          <Link href={`/finanzas?mes=${mes}`} className="text-sm text-zinc-400 hover:text-[#8cff59]">
            ← Volver a {mesLabel}
          </Link>
          <h1 className="font-display mt-4 text-2xl font-semibold text-white">
            Costos de {mesLabel}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Ingresá el valor de cada costo para este mes. Los cambios no afectan otros meses.
          </p>
        </div>

        {/* Resumen actual */}
        {valoresMes.length > 0 && (
          <div className="flex items-center justify-between rounded-[20px] border border-zinc-800 bg-zinc-900/60 px-4 py-3">
            <p className="text-sm text-zinc-400">Total actual del mes</p>
            <p className="font-display text-lg font-bold text-[#8cff59]">{formatARS(totalMes)}</p>
          </div>
        )}

        <div className="panel-card rounded-[28px] p-5">
          <EditarMesForm
            mes={mes}
            mesLabel={mesLabel}
            costos={costos}
            valoresExistentes={valoresParaForm}
          />
        </div>
      </main>
    </div>
  );
}
