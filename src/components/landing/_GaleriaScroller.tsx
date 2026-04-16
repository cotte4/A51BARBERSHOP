"use client";

import Image from "next/image";

type Foto = {
  id: string;
  fotoUrl: string;
  caption: string | null;
};

export default function GaleriaScroller({ fotos }: { fotos: Foto[] }) {
  const track = [...fotos, ...fotos];

  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="flex animate-marquee gap-3 hover:[animation-play-state:paused]">
        {track.map((foto, i) => (
          <div
            key={`${foto.id}-${i}`}
            className="group relative h-64 w-48 shrink-0 overflow-hidden rounded-[22px] border border-zinc-800 sm:h-72 sm:w-56"
          >
            <Image
              src={foto.fotoUrl}
              alt={foto.caption ?? "Corte A51 Barber"}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="224px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            {foto.caption && (
              <p className="absolute inset-x-0 bottom-0 px-3 pb-3 text-xs font-semibold text-white">
                {foto.caption}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
