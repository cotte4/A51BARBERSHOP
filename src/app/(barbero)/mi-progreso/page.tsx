import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { barberCutsLog } from "@/db/schema";
import { getCajaActorContext } from "@/lib/caja-access";
import { getLevel } from "@/lib/barber-progress";

function formatFecha(dateStr: string): string {
  // Parse YYYY-MM-DD as local date (Argentina)
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(d);
}

export default async function MiProgresoPage() {
  const ctx = await getCajaActorContext();
  if (!ctx?.barberoId) {
    redirect("/caja");
  }
  const barberoId = ctx.barberoId;

  const [[totalRow], recentCuts] = await Promise.all([
    db
      .select({ total: count() })
      .from(barberCutsLog)
      .where(eq(barberCutsLog.barberoId, barberoId)),
    db
      .select()
      .from(barberCutsLog)
      .where(eq(barberCutsLog.barberoId, barberoId))
      .orderBy(desc(barberCutsLog.creadoEn))
      .limit(20),
  ]);

  const totalCuts = totalRow?.total ?? 0;
  const level = getLevel(totalCuts);

  const LEVEL_COLORS: Record<string, string> = {
    Rookie: "border-zinc-600/40 bg-zinc-600/15 text-zinc-300",
    Junior: "border-sky-500/35 bg-sky-500/12 text-sky-300",
    Senior: "border-amber-400/35 bg-amber-400/12 text-amber-300",
    Master: "border-[#8cff59]/30 bg-[#8cff59]/12 text-[#8cff59]",
  };

  const levelColor = LEVEL_COLORS[level.label] ?? LEVEL_COLORS.Rookie;

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-xs font-semibold">Barbero</p>
            <h1 className="font-display text-xl font-semibold text-white">Mi Progreso</h1>
          </div>
          <Link
            href="/mi-progreso/nuevo"
            className="neon-button rounded-[20px] px-4 py-2.5 text-sm font-semibold"
          >
            + Registrar corte
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
        {/* Nivel + progreso */}
        <section className="panel-card rounded-[28px] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span
                className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${levelColor}`}
              >
                {level.label}
              </span>
              <p className="font-display mt-3 text-5xl font-bold text-white">
                {totalCuts}
              </p>
              <p className="mt-1 text-sm text-zinc-400">cortes registrados</p>
            </div>
            {level.next && (
              <div className="rounded-[20px] border border-white/8 bg-white/4 px-4 py-3 text-right">
                <p className="text-xs text-zinc-500">Próximo nivel</p>
                <p className="mt-1 font-semibold text-white">{level.next}</p>
                <p className="mt-0.5 text-sm text-zinc-400">
                  Faltan {level.remaining} corte{level.remaining !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

          {level.next && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                <span>{level.label}</span>
                <span>{level.next}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-[#8cff59] transition-all duration-700"
                  style={{ width: `${level.progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-right text-xs text-zinc-500">{level.progress}%</p>
            </div>
          )}

          {!level.next && (
            <p className="mt-4 text-sm font-semibold text-[#8cff59]">
              Nivel máximo alcanzado. Leyenda de A51.
            </p>
          )}
        </section>

        {/* Historial */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <p className="eyebrow text-xs font-semibold">Últimos cortes</p>
            <span className="text-xs text-zinc-500">{recentCuts.length} registros</span>
          </div>

          {recentCuts.length === 0 ? (
            <div className="panel-card rounded-[28px] p-6 text-center">
              <p className="text-zinc-400">Todavía no registraste ningún corte.</p>
              <Link
                href="/mi-progreso/nuevo"
                className="mt-4 inline-block text-sm font-semibold text-[#8cff59] hover:underline"
              >
                Registrá tu primer corte →
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recentCuts.map((corte) => (
                <div
                  key={corte.id}
                  className="panel-card rounded-[22px] overflow-hidden"
                >
                  {corte.fotoUrl && (
                    <div className="relative h-40 w-full">
                      <Image
                        src={corte.fotoUrl}
                        alt={`Corte de ${corte.servicioNombre}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 50vw"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-white">{corte.servicioNombre}</p>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {formatFecha(corte.fecha)}
                      </span>
                    </div>
                    {corte.clienteNombre && (
                      <p className="mt-1 text-sm text-zinc-400">{corte.clienteNombre}</p>
                    )}
                    {corte.notas && (
                      <p className="mt-2 text-xs text-zinc-500 line-clamp-2">{corte.notas}</p>
                    )}
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
