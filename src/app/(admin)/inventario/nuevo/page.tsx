import Link from "next/link";
import NuevoProductoForm from "../_NuevoProductoForm";

export default function NuevoProductoPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900 px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/inventario"
            className="mb-2 block text-sm text-zinc-400 hover:text-[#8cff59]"
          >
            ← Inventario
          </Link>
          <h1 className="font-display text-xl font-bold text-white">Nuevo producto</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="panel-card rounded-[28px] p-5">
          <NuevoProductoForm />
        </div>
      </main>
    </div>
  );
}
