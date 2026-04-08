import type { ClientProfileEvent } from "@/lib/types";

type ClientProfileAuditLogProps = {
  events: ClientProfileEvent[];
};

function formatAuditValue(value: string | null) {
  if (!value) {
    return "Vacio";
  }

  if (value === "true") {
    return "Si";
  }

  if (value === "false") {
    return "No";
  }

  if (/^https?:\/\//i.test(value)) {
    return "Archivo en storage";
  }

  return value.length > 72 ? `${value.slice(0, 69)}...` : value;
}

export default function ClientProfileAuditLog({ events }: ClientProfileAuditLogProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <details className="group rounded-[28px] border border-zinc-800 bg-zinc-900">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Registro del sistema
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {events.length} {events.length === 1 ? "cambio reciente" : "cambios recientes"}
          </p>
        </div>
        <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-medium text-zinc-300 transition group-open:border-zinc-700 group-open:text-white">
          Ver
        </span>
      </summary>

      <div className="space-y-2 border-t border-zinc-800 px-5 pb-5 pt-3">
        {events.map((event) => (
          <article key={event.id} className="rounded-[18px] border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-400">
                {event.fieldName}
              </p>
              <p className="text-xs text-zinc-600">
                {new Intl.DateTimeFormat("es-AR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Argentina/Buenos_Aires",
                }).format(new Date(event.createdAt))}
              </p>
            </div>
            <p className="mt-1 text-xs text-zinc-600">{event.changedByName || "Sin autor"}</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">Antes</p>
                <p className="mt-1 text-sm text-zinc-300">{formatAuditValue(event.oldValue)}</p>
              </div>
              <div className="rounded-xl border border-[#8cff59]/15 bg-[#8cff59]/5 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">Ahora</p>
                <p className="mt-1 text-sm text-zinc-100">{formatAuditValue(event.newValue)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </details>
  );
}
