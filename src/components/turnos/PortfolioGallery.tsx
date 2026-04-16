import Image from "next/image";

type PortfolioItem = {
  id: string;
  fotoUrl: string;
  caption: string | null;
};

type Props = {
  items: PortfolioItem[];
};

export default function PortfolioGallery({ items }: Props) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.id} className="overflow-hidden rounded-2xl border border-white/10">
          <div className="relative h-40 w-full sm:h-48">
            <Image
              src={item.fotoUrl}
              alt={item.caption ?? "Trabajo del barbero"}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
          </div>
          {item.caption && (
            <p className="px-3 py-2 text-xs text-zinc-400 truncate">{item.caption}</p>
          )}
        </div>
      ))}
    </div>
  );
}
