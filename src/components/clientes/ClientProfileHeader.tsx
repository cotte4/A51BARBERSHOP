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
    <section className="space-y-4 rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-base font-semibold text-white">
            {client.avatarUrl ? (
              <Image src={client.avatarUrl} alt={client.name} fill sizes="64px" className="object-cover" />
            ) : (
              initials
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white">{client.name}</h1>
              {client.esMarciano ? (
                <span className="rounded-full border border-[#8cff59]/30 bg-[#8cff59]/10 px-2.5 py-0.5 text-xs font-semibold text-[#8cff59]">
                  Marciano
                </span>
              ) : null}
              {client.archivedAt ? (
                <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
                  Archivado
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-zinc-500">{client.phoneRaw || "Sin telefono"}</p>
          </div>
        </div>

        <div className="text-right text-xs text-zinc-500">
          <p className="font-medium text-white">{client.totalVisits} visitas</p>
          <p className="mt-0.5">{client.lastVisitBarberoNombre || "Sin barbero previo"}</p>
        </div>
      </div>

      {client.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {client.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
