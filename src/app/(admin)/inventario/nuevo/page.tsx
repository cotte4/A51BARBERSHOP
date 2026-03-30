import Link from "next/link";
import NuevoProductoForm from "../_NuevoProductoForm";

export default function NuevoProductoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/inventario"
            className="mb-2 block text-sm text-gray-400 hover:text-gray-600"
          >
            ← Inventario
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Nuevo producto</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <NuevoProductoForm />
        </div>
      </main>
    </div>
  );
}
