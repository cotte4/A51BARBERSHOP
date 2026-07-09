import { desc, inArray } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { internalBugDeliveryEvents, internalBugReports, internalSupportIntakes } from "@/db/schema";
import { getOwnerSessionContext } from "@/lib/admin-action";
import { updateBugReportStatusAction } from "./actions";

export default async function SoportePage() {
  const owner = await getOwnerSessionContext();
  if (!owner) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-zinc-400">
        Solo el owner puede ver soporte interno.
      </div>
    );
  }

  const reports = await db
    .select()
    .from(internalBugReports)
    .orderBy(desc(internalBugReports.createdAt))
    .limit(100);
  const reportIds = reports.map((report) => report.id);
  const deliveryEvents =
    reportIds.length > 0
      ? await db
          .select()
          .from(internalBugDeliveryEvents)
          .where(inArray(internalBugDeliveryEvents.bugReportId, reportIds))
          .orderBy(desc(internalBugDeliveryEvents.createdAt))
      : [];
  const latestDeliveryByReport = new Map<string, (typeof deliveryEvents)[number]>();
  for (const event of deliveryEvents) {
    if (!latestDeliveryByReport.has(event.bugReportId)) {
      latestDeliveryByReport.set(event.bugReportId, event);
    }
  }
  const intakes = await db
    .select()
    .from(internalSupportIntakes)
    .orderBy(desc(internalSupportIntakes.createdAt))
    .limit(100);

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Negocio / soporte</p>
            <h1 className="font-display text-2xl font-semibold text-white">Reportes internos</h1>
          </div>
          <Link href="/negocio" className="ghost-button rounded-2xl px-4 py-2 text-sm font-medium">
            Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 pb-24">
        {reports.length === 0 ? (
          <section className="panel-card rounded-[28px] p-5 text-sm text-zinc-400">
            No hay reportes todavia.
          </section>
        ) : (
          reports.map((report) => (
            <section key={report.id} className="panel-card rounded-[28px] p-5">
              {(() => {
                const delivery = latestDeliveryByReport.get(report.id);
                if (!delivery) return null;
                return (
                  <p className="mb-2 text-xs text-zinc-500">
                    Delivery: {delivery.status}
                    {delivery.responseCode ? ` (${delivery.responseCode})` : ""}
                  </p>
                );
              })()}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                  {report.status}
                </span>
                <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">
                  {report.severity}
                </span>
                <span className="text-xs text-zinc-500">{report.pathname}</span>
              </div>

              <p className="mt-3 text-sm font-medium text-white">{report.summary}</p>
              <p className="mt-2 text-sm text-zinc-400">
                <strong className="text-zinc-300">Esperado:</strong> {report.expectedBehavior}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                <strong className="text-zinc-300">Actual:</strong> {report.actualBehavior}
              </p>
              <p className="mt-3 text-xs text-zinc-500">
                Rol: {report.reporterRole} · User: {report.reporterUserId} · Session:{" "}
                {report.sessionHash ?? "-"}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {(["new", "triaged", "fixed", "verified", "closed"] as const).map((status) => (
                  <form
                    key={status}
                    action={async () => {
                      "use server";
                      await updateBugReportStatusAction(report.id, status);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-[#8cff59]/40 hover:text-[#8cff59]"
                    >
                      {status}
                    </button>
                  </form>
                ))}
              </div>
            </section>
          ))
        )}

        <section className="panel-card rounded-[28px] p-5">
          <div className="mb-3">
            <p className="eyebrow text-[10px]">Propuestas internas</p>
            <p className="text-sm text-zinc-400">
              Ideas de feature e implementacion enviadas por barberos y admins.
            </p>
          </div>
          {intakes.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin propuestas por ahora.</p>
          ) : (
            <div className="space-y-3">
              {intakes.map((intake) => (
                <article key={intake.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">
                      {intake.intakeType}
                    </span>
                    <span className="rounded-full border border-[#8cff59]/25 bg-[#8cff59]/10 px-2.5 py-1 text-[11px] text-[#8cff59]">
                      {intake.urgency}
                    </span>
                    <span className="text-xs text-zinc-500">{intake.pathname}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-white">{intake.title}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    <strong className="text-zinc-300">Problema:</strong> {intake.problem}
                  </p>
                  {intake.proposal ? (
                    <p className="mt-1 text-sm text-zinc-400">
                      <strong className="text-zinc-300">Propuesta:</strong> {intake.proposal}
                    </p>
                  ) : null}
                  {intake.impact ? (
                    <p className="mt-1 text-sm text-zinc-400">
                      <strong className="text-zinc-300">Impacto:</strong> {intake.impact}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-zinc-500">
                    Rol: {intake.reporterRole} · User: {intake.reporterUserId}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
