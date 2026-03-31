import Image from "next/image";
import type { ClientProfile } from "@/lib/types";

type ClientProfileHeaderProps = {
  client: ClientProfile;
};

export default function ClientProfileHeader({ client }: ClientProfileHeaderProps) {
  const initials =
    client.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "CL";

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-lg font-semibold text-white">
            {client.avatarUrl ? (
              <Image src={client.avatarUrl} alt={client.name} fill sizes="80px" className="object-cover" />
            ) : (
              initials
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              {client.esMarciano ? (
                <span className="rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold text-lime-800">
                  Marciano
                </span>
              ) : null}
              {client.archivedAt ? (
                <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-700">
                  Archivado
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-gray-500">{client.phoneRaw || "Sin telefono"}</p>
          </div>
        </div>

        <div className="text-right text-xs text-gray-500">
          <p>{client.totalVisits} visitas</p>
          <p>{client.lastVisitBarberoNombre || "Sin barbero previo"}</p>
        </div>
      </div>

      {client.tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {client.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
