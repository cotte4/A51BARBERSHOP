import Link from "next/link";
import { getOwnerSessionContext } from "@/lib/admin-action";
import { computeGoLiveChecks, getGoLiveReadinessState } from "@/lib/go-live-readiness";
import { signoffGoLiveAction } from "./actions";

export default async function GoLiveReadinessPage() {
  const owner = await getOwnerSessionContext();
  if (!owner) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-zinc-400">
        Solo el owner puede acceder a go-live readiness.
      </div>
    );
  }

  const [checks, readinessState] = await Promise.all([
    computeGoLiveChecks(),
    getGoLiveReadinessState(),
  ]);
  const blockers = checks.filter((check) => !check.passed);

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Negocio / go-live</p>
            <h1 className="font-display text-2xl font-semibold text-white">Readiness de lanzamiento</h1>
          </div>
          <Link href="/negocio" className="ghost-button rounded-2xl px-4 py-2 text-sm font-medium">
            Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 pb-24">
        <section className="panel-card rounded-[28px] p-5">
          <p className="text-sm text-zinc-400">
            Estado actual:{" "}
            <span className={blockers.length === 0 ? "text-[#8cff59]" : "text-amber-300"}>
              {blockers.length === 0 ? "Listo para firmar go-live" : `${blockers.length} bloqueantes`}
            </span>
          </p>
          <div className="mt-4 space-y-2">
            {checks.map((check) => (
              <div
                key={check.id}
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  check.passed
                    ? "border-[#8cff59]/25 bg-[#8cff59]/10 text-[#8cff59]"
                    : "border-amber-500/35 bg-amber-500/10 text-amber-300"
                }`}
              >
                <p className="font-semibold">{check.label}</p>
                <p className="mt-1 text-xs opacity-90">{check.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-card rounded-[28px] p-5">
          <p className="text-sm font-medium text-white">Firma de lanzamiento</p>
          <p className="mt-1 text-xs text-zinc-400">
            Solo se firma cuando todos los checks automaticos estan en verde.
          </p>

          <form action={signoffGoLiveAction} className="mt-4 space-y-3">
            <textarea
              name="notes"
              placeholder="Notas de lanzamiento (opcional)"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
            />
            <button
              type="submit"
              disabled={blockers.length > 0}
              className="neon-button rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Firmar go-live
            </button>
          </form>

          {readinessState?.signedOffAt ? (
            <p className="mt-3 text-xs text-zinc-400">
              Ultima firma:{" "}
              {new Intl.DateTimeFormat("es-AR", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "America/Argentina/Buenos_Aires",
              }).format(new Date(readinessState.signedOffAt))}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
