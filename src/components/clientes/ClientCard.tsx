import Link from "next/link";
import type { ClientSummary } from "@/lib/types";

type ClientCardProps = {
  client: ClientSummary;
};

export default function ClientCard({ client }: ClientCardProps) {
  const lastVisitLabel = client.lastVisitAt
    ? new Intl.DateTimeFormat("es-AR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(new Date(client.lastVisitAt))
    : "Sin visitas";

  return (
    <Link
      href={`/clientes/${client.id}`}
      className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{client.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{client.phoneRaw || "Sin teléfono"}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {client.esMarciano ? (
            <span className="rounded-full bg-lime-100 px-2.5 py-1 text-xs font-semibold text-lime-800">
              Marciano
            </span>
          ) : null}
          {client.archivedAt ? (
            <span className="rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
              Archivado
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
        <span>{lastVisitLabel}</span>
        <span>{client.totalVisits} visitas</span>
        <span>{client.lastVisitBarberoNombre || "Sin barbero previo"}</span>
      </div>
    </Link>
  );
}
