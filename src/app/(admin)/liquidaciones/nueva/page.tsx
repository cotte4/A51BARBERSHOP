import { db } from "@/db";
import { barberos } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import NuevaLiquidacionForm from "./_NuevaLiquidacionForm";

export default async function NuevaLiquidacionPage() {
  const barberosActivos = await db.select().from(barberos).where(eq(barberos.activo, true));
  const barberosLiquidables = barberosActivos.filter((barbero) => barbero.rol !== "admin");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/liquidaciones" className="text-gray-400 hover:text-gray-600 text-sm mb-2 block">← Liquidaciones</Link>
          <h1 className="text-xl font-bold text-gray-900">Nueva liquidación</h1>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <NuevaLiquidacionForm
            barberosList={barberosLiquidables.map(b => ({ id: b.id, nombre: b.nombre }))}
          />
        </div>
      </main>
    </div>
  );
}
