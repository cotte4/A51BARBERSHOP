import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import BrandMark from "@/components/BrandMark";
import { auth } from "@/lib/auth";
import { calcularBep } from "@/lib/bep";
import { getDatosBep, getKpisDia, getKpisMes } from "@/lib/dashboard-queries";
import { formatARS } from "@/lib/format";

function formatFechaHoy(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function getBepProgress(actual: number, objetivo: number): number {
  if (objetivo <= 0) return 0;
  return Math.min(100, Math.round((actual / objetivo) * 100));
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  );
  const mesActual = now.getMonth() + 1;
  const anioActual = now.getFullYear();

  const [kpisDia, kpisMes, datosBep] = await Promise.all([
    getKpisDia(),
    getKpisMes(mesActual, anioActual),
    getDatosBep(),
  ]);

  const bep = calcularBep(datosBep);
  const bepProgress = getBepProgress(kpisDia.atencionesHoy, bep.cortesBep);

  const enlaces = [
    { href: "/dashboard/pl", label: "El mes completo" },
    { href: "/dashboard/flujo", label: "Entradas y salidas por día" },
    { href: "/inventario", label: "Inventario" },
  ];

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <BrandMark href="/dashboard" subtitle="Números" />
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6 pb-28">
        <section className="panel-card rounded-[28px] p-6">
          <p className="eyebrow text-xs font-semibold">{formatFechaHoy(kpisDia.fechaHoy)}</p>
          <p className="mt-4 text-sm text-zinc-300">Cortes de hoy</p>
          <p className="font-display mt-1 text-5xl font-bold tabular-nums tracking-tight text-white">
            {kpisDia.atencionesHoy}
          </p>
          <p className="mt-2 text-sm tabular-nums text-zinc-300">
            Pinky {kpisDia.atencionesPinky} · Gabote {kpisDia.atencionesGabote}
          </p>

          {!bep.sinReferencia && bep.cortesBep > 0 ? (
            <div className="mt-5 border-t border-zinc-800 pt-4">
              <p className="text-sm text-zinc-200">
                {bep.superado
                  ? `✓ Ya se cubrieron los gastos del día (hacían falta ${bep.cortesBep} cortes).`
                  : `Para cubrir los gastos del día hacen falta ${bep.cortesBep} cortes: faltan ${bep.faltanCortes}.`}
              </p>
              <div
                className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-900"
                role="img"
                aria-label={`${kpisDia.atencionesHoy} de ${bep.cortesBep} cortes`}
              >
                <div className="h-full rounded-full bg-[#8cff59]" style={{ width: `${bepProgress}%` }} />
              </div>
            </div>
          ) : null}
        </section>

        <section className="panel-card rounded-[28px] p-5">
          <h2 className="font-display text-xl font-semibold text-white">Este mes</h2>
          <dl className="mt-3 text-base tabular-nums">
            <div className="flex items-baseline justify-between gap-4 py-1.5">
              <dt className="text-zinc-300">Cortes</dt>
              <dd className="font-semibold text-white">{kpisMes.atencionesTotales}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-1.5">
              <dt className="text-zinc-300">Queda para la barber</dt>
              <dd className="font-semibold text-white">{formatARS(kpisMes.resultadoCasaMes)}</dd>
            </div>
          </dl>
        </section>

        <section className="panel-card rounded-[28px] p-5">
          <ul className="divide-y divide-zinc-800/70">
            {enlaces.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  className="flex items-center justify-between gap-4 rounded-xl py-3 text-zinc-200 hover:bg-white/4 hover:text-white"
                >
                  {enlace.label}
                  <span aria-hidden="true" className="text-zinc-500">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
