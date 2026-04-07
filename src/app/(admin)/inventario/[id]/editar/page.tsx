import { db } from "@/db";
import { productos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import EditarProductoForm from "./_EditarProductoForm";
import { editarProducto } from "../../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params;

  const [producto] = await db
    .select()
    .from(productos)
    .where(eq(productos.id, id))
    .limit(1);

  if (!producto) notFound();

  const editarConId = editarProducto.bind(null, id);

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link href={`/inventario/${id}`} className="text-zinc-400 hover:text-[#8cff59] text-sm mb-2 block">← {producto.nombre}</Link>
          <h1 className="font-display text-xl font-bold text-white">Editar producto</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="panel-card rounded-[28px] p-5">
          <EditarProductoForm
            editarAction={editarConId}
            producto={{
              id: producto.id,
              nombre: producto.nombre,
              descripcion: producto.descripcion ?? "",
              precioVenta: producto.precioVenta ?? "",
              costoCompra: producto.costoCompra ?? "",
              stockMinimo: producto.stockMinimo ?? 5,
              stockActual: producto.stockActual ?? 0,
              esConsumicion: producto.esConsumicion ?? false,
            }}
          />
        </div>
      </main>
    </div>
  );
}
