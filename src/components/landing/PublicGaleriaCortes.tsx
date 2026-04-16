import { asc } from "drizzle-orm";
import { db } from "@/db";
import { barberoPortfolioItems } from "@/db/schema";
import GaleriaScroller from "./_GaleriaScroller";

export default async function PublicGaleriaCortes() {
  const fotos = await db
    .select({
      id: barberoPortfolioItems.id,
      fotoUrl: barberoPortfolioItems.fotoUrl,
      caption: barberoPortfolioItems.caption,
    })
    .from(barberoPortfolioItems)
    .orderBy(asc(barberoPortfolioItems.orden));

  if (fotos.length === 0) return null;

  return (
    <div>
      <div className="mb-8 flex flex-col gap-1">
        <p className="eyebrow text-[11px] font-semibold">El trabajo habla solo</p>
        <h2 className="font-display mt-2 text-3xl font-semibold text-white sm:text-4xl">
          Galería de cortes.
        </h2>
      </div>
      <GaleriaScroller fotos={fotos} />
    </div>
  );
}
