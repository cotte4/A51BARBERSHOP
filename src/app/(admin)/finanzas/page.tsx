import { db } from "@/db";
import { costosFijosNegocio, costosFijosValores, capitalMovimientos } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { formatARS } from "@/lib/format";
import { formatFecha } from "@/lib/fecha";
import { eliminarCosto, eliminarMovimiento, copiarMesAnterior } from "./actions";

function getMesActualAR(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).slice(0, 7);
}

function getMesLabel(mes: string): string {
  const [year, month] = mes.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}

function getAdjacentMonth(mes: string, delta: number): string {
  const [year, month] = mes.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function categoriaLabel(cat: string) {
  const map: Record<string, string> = {
    alquiler: "Alquiler",
    servicios: "Servicios",
    insumos: "Insumos",
    sueldos: "Sueldos",
    marketing: "Marketing",
    otro: "Otro",
  };
  return map[cat] ?? cat;
}

function DeleteCostoButton({ id }: { id: string }) {
  const action = eliminarCosto.bind(null, id);
  return (
    <form action={action}>
      <button
        type="submit"
        className="inline-flex min-h-[36px] items-center rounded-xl bg-red-500/10 px-3 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
      >
        Eliminar
      </button>
    </form>
  );
}

function DeleteMovimientoButton({ id }: { id: string }) {
  const action = eliminarMovimiento.bind(null, id);
  return (
    <form action={action}>
      <button
        type="submit"
        className="inline-flex min-h-[40px] items-center rounded-xl bg-red-500/10 px-3 text-xs font-medium text-red-400 transition hover:bg-red-500/20"
      >
        Eliminar
      </button>
    </form>
  );
}

function CopiarMesButton({ mes }: { mes: string }) {
  const action = copiarMesAnterior.bind(null, mes);
  return (
    <form action={action}>
      <button
        type="submit"
        className="ghost-button inline-flex min-h-[40px] items-center rounded-2xl px-4 text-sm font-semibold"
      >
        Copiar mes anterior
      </button>
    </form>
  );
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mes = mesParam ?? getMesActualAR();
  const mesPrev = getAdjacentMonth(mes, -1);
  const mesNext = getAdjacentMonth(mes, 1);
  const mesActual = getMesActualAR();

  const [costos, valoresMes, valoresMesPrev, movimientos] = await Promise.all([
    db.select().from(costosFijosNegocio).orderBy(costosFijosNegocio.categoria, costosFijosNegocio.nombre),
    db.select().from(costosFijosValores).where(eq(costosFijosValores.mes, mes)),
    db.select().from(costosFijosValores).where(eq(costosFijosValores.mes, mesPrev)),
    db.select().from(capitalMovimientos).orderBy(desc(capitalMovimientos.fecha)),
  ]);

  const valoresMap = new Map(valoresMes.map((v) => [v.costoId, v.monto]));
  const totalMes = valoresMes.reduce((acc, v) => acc + Number(v.monto), 0);
  const hasMesValues = valoresMes.length > 0;
  const hasPrevValues = valoresMesPrev.length > 0;

  const totalAportado = movimientos
    .filter((m) => m.tipo === "aporte")
    .reduce((acc, m) => acc + Number(m.monto ?? 0), 0);
  const totalRetirado = movimientos
    .filter((m) => m.tipo === "retiro")
    .reduce((acc, m) => acc + Number(m.monto ?? 0), 0);
  const capitalNeto = totalAportado - totalRetirado;

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <BrandMark href="/finanzas" subtitle="Finanzas" />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">

        {/* ── COSTOS FIJOS ── */}
        <section className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.10),_transparent_34%)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-xs font-semibold">Costos del negocio</p>
                <h2 className="font-display mt-2 text-xl font-semibold text-white">
                  Costos fijos mensuales
                </h2>
              </div>
              <Link
                href="/finanzas/nuevo"
                className="neon-button inline-flex min-h-[44px] items-center rounded-2xl px-4 text-sm font-semibold"
              >
                + Nuevo ítem
              </Link>
            </div>

            {/* Navegación de meses */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <Link
                href={`/finanzas?mes=${mesPrev}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>

              <div className="flex flex-col items-center">
                <p className="font-display text-base font-semibold capitalize text-white">
                  {getMesLabel(mes)}
                </p>
                {mes === mesActual && (
                  <span className="mt-0.5 rounded-full bg-[#8cff59]/15 px-2 py-0.5 text-[10px] font-semibold text-[#8cff59]">
                    Mes actual
                  </span>
                )}
              </div>

              <Link
                href={`/finanzas?mes=${mesNext}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-300 transition hover:bg-zinc-800"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            {/* Total del mes */}
            <div className="mt-4 flex items-center justify-between rounded-[20px] border border-zinc-800 bg-zinc-900/60 px-4 py-3">
              <p className="text-sm font-medium text-zinc-400">Total del mes</p>
              <p className={`font-display text-xl font-bold ${hasMesValues ? "text-[#8cff59]" : "text-zinc-600"}`}>
                {hasMesValues ? formatARS(totalMes) : "Sin datos"}
              </p>
            </div>
          </div>

          {/* Lista de costos */}
          {costos.length === 0 ? (
            <div className="px-5 pb-6 pt-2 text-center">
              <p className="text-sm text-zinc-500">No hay ítems de costo configurados.</p>
              <Link href="/finanzas/nuevo" className="mt-3 inline-flex min-h-[44px] items-center rounded-2xl bg-zinc-800 px-4 text-sm font-medium text-white hover:bg-zinc-700">
                Agregar el primero
              </Link>
            </div>
          ) : (
            <>
              <div className="divide-y divide-zinc-800/60">
                {costos.map((costo) => {
                  const valor = valoresMap.get(costo.id);
                  return (
                    <div key={costo.id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">{costo.nombre}</p>
                          <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                            {categoriaLabel(costo.categoria)}
                          </span>
                        </div>
                      </div>
                      <p className={`font-display shrink-0 text-base font-semibold ${valor ? "text-white" : "text-zinc-700"}`}>
                        {valor ? formatARS(valor) : "—"}
                      </p>
                      <div className="flex shrink-0 gap-1.5">
                        <Link
                          href={`/finanzas/${costo.id}/editar`}
                          className="inline-flex min-h-[36px] items-center rounded-xl bg-zinc-800 px-3 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                        >
                          Ítem
                        </Link>
                        <DeleteCostoButton id={costo.id} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Acciones del mes */}
              <div className="flex flex-wrap gap-3 border-t border-zinc-800/60 px-5 py-4">
                <Link
                  href={`/finanzas/mes/${mes}/editar`}
                  className="neon-button inline-flex min-h-[44px] items-center rounded-2xl px-5 text-sm font-semibold"
                >
                  Editar valores de {getMesLabel(mes).split(" ")[0]}
                </Link>
                {!hasMesValues && hasPrevValues && (
                  <CopiarMesButton mes={mes} />
                )}
              </div>
            </>
          )}
        </section>

        {/* ── ÍTEMS DE COSTO (gestión) ── */}
        <details className="group overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
            <div>
              <p className="eyebrow text-xs font-semibold">Configuración</p>
              <p className="mt-1 text-sm font-semibold text-white">Gestionar ítems de costo</p>
            </div>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-zinc-500 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="divide-y divide-zinc-800/60 border-t border-zinc-800/60">
            {costos.map((costo) => (
              <div key={costo.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{costo.nombre}</p>
                  {costo.notas && <p className="text-xs text-zinc-500">{costo.notas}</p>}
                </div>
                <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                  {categoriaLabel(costo.categoria)}
                </span>
                <Link
                  href={`/finanzas/${costo.id}/editar`}
                  className="inline-flex min-h-[36px] items-center rounded-xl bg-zinc-800 px-3 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                >
                  Editar
                </Link>
                <DeleteCostoButton id={costo.id} />
              </div>
            ))}
          </div>
        </details>

        {/* ── CAPITAL E INVERSIÓN ── */}
        <section className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(140,255,89,0.07),_transparent_40%)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-xs font-semibold">Inversión inicial</p>
                <h2 className="font-display mt-2 text-xl font-semibold text-white">
                  Capital e inversión
                </h2>
              </div>
              <Link
                href="/finanzas/movimiento/nuevo"
                className="ghost-button inline-flex min-h-[44px] items-center rounded-2xl px-4 text-sm font-semibold"
              >
                + Registrar movimiento
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-[20px] bg-white/6 px-3 py-3 ring-1 ring-white/8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Aportado</p>
                <p className="mt-1.5 font-display text-lg font-bold text-[#8cff59]">{formatARS(totalAportado)}</p>
              </div>
              <div className="rounded-[20px] bg-white/6 px-3 py-3 ring-1 ring-white/8">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Retirado</p>
                <p className="mt-1.5 font-display text-lg font-bold text-amber-300">{formatARS(totalRetirado)}</p>
              </div>
              <div className={`rounded-[20px] px-3 py-3 ring-1 ${capitalNeto >= 0 ? "bg-[#8cff59]/8 ring-[#8cff59]/20" : "bg-red-500/8 ring-red-500/20"}`}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">Neto</p>
                <p className={`mt-1.5 font-display text-lg font-bold ${capitalNeto >= 0 ? "text-[#8cff59]" : "text-red-400"}`}>
                  {formatARS(capitalNeto)}
                </p>
              </div>
            </div>
          </div>

          {movimientos.length === 0 ? (
            <div className="px-5 pb-6 pt-2 text-center">
              <p className="text-sm text-zinc-500">No hay movimientos registrados.</p>
              <Link href="/finanzas/movimiento/nuevo" className="mt-3 inline-flex min-h-[44px] items-center rounded-2xl bg-zinc-800 px-4 text-sm font-medium text-white hover:bg-zinc-700">
                Registrar el primero
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {movimientos.map((mov) => (
                <div key={mov.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      mov.tipo === "aporte" ? "bg-[#8cff59]/15 text-[#8cff59]" : "bg-amber-500/15 text-amber-300"
                    }`}>
                      {mov.tipo === "aporte" ? "+" : "−"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold capitalize text-white">{mov.tipo}</p>
                      <p className="text-xs text-zinc-500">
                        {formatFecha(mov.fecha)}{mov.descripcion ? ` · ${mov.descripcion}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className={`font-display text-base font-semibold ${mov.tipo === "aporte" ? "text-[#8cff59]" : "text-amber-300"}`}>
                      {mov.tipo === "retiro" ? "−" : "+"}{formatARS(mov.monto)}
                    </p>
                    <Link
                      href={`/finanzas/movimiento/${mov.id}/editar`}
                      className="inline-flex min-h-[40px] items-center rounded-xl bg-zinc-800 px-3 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
                    >
                      Editar
                    </Link>
                    <DeleteMovimientoButton id={mov.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
