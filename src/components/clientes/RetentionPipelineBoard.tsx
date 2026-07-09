import Link from "next/link";
import { upsertRetentionFollowupAction } from "@/app/(barbero)/clientes/actions";
import type { ClientSummary } from "@/lib/types";

type PipelineRow = {
  client: ClientSummary;
  status: "pendiente" | "contactado" | "reagendado";
  notes: string | null;
  lastManagedAt: Date | null;
};

type RetentionPipelineBoardProps = {
  rows: PipelineRow[];
};

export default function RetentionPipelineBoard({ rows }: RetentionPipelineBoardProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="panel-card rounded-[28px] p-5">
      <div className="mb-4">
        <p className="eyebrow text-[11px] font-semibold">Retencion accionable</p>
        <h2 className="font-display mt-1 text-xl font-semibold text-white">Pipeline de seguimiento</h2>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row.client.id} className="panel-soft rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">{row.client.name}</p>
                <p className="text-xs text-zinc-400">
                  {row.client.lastVisitAt
                    ? `Ultima visita: ${new Intl.DateTimeFormat("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        timeZone: "America/Argentina/Buenos_Aires",
                      }).format(new Date(row.client.lastVisitAt))}`
                    : "Sin ultima visita registrada"}
                </p>
              </div>
              <Link
                href={`/clientes/${row.client.id}`}
                className="text-xs text-zinc-300 hover:text-[#8cff59] hover:underline"
              >
                Abrir cliente
              </Link>
            </div>

            <form
              action={async (formData) => {
                "use server";
                await upsertRetentionFollowupAction(row.client.id, formData);
              }}
              className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_auto]"
            >
              <select
                name="status"
                defaultValue={row.status}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none"
              >
                <option value="pendiente">pendiente</option>
                <option value="contactado">contactado</option>
                <option value="reagendado">reagendado</option>
              </select>
              <input
                name="notes"
                defaultValue={row.notes ?? ""}
                placeholder="Nota de seguimiento"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              <button type="submit" className="ghost-button rounded-xl px-4 py-2 text-sm font-semibold">
                Guardar
              </button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
}
