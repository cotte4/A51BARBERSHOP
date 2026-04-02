import type { ClientProfileEvent } from "@/lib/types";

type ClientProfileAuditLogProps = {
  events: ClientProfileEvent[];
};

export default function ClientProfileAuditLog({ events }: ClientProfileAuditLogProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Audit log</p>
      <div className="mt-3 space-y-2">
        {events.map((event) => (
          <article key={event.id} className="rounded-[16px] border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-zinc-300">{event.fieldName}</p>
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
            <p className="mt-1 font-mono text-xs text-zinc-500">
              <span className="text-red-400/70">{event.oldValue || "vacío"}</span>
              {" → "}
              <span className="text-[#8cff59]/70">{event.newValue || "vacío"}</span>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
