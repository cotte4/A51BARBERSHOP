import type { ClientProfileEvent } from "@/lib/types";

type ClientProfileAuditLogProps = {
  events: ClientProfileEvent[];
};

export default function ClientProfileAuditLog({ events }: ClientProfileAuditLogProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">Audit log</h2>
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <article key={event.id} className="rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-900">{event.fieldName}</p>
              <p className="text-xs text-gray-500">
                {new Intl.DateTimeFormat("es-AR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Argentina/Buenos_Aires",
                }).format(new Date(event.createdAt))}
              </p>
            </div>
            <p className="mt-2 text-xs text-gray-500">{event.changedByName || "Cambio sin autor visible"}</p>
            <p className="mt-2 text-sm text-gray-700">
              {event.oldValue || "vacío"} → {event.newValue || "vacío"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
