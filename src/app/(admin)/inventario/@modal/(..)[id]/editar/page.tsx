import { db } from "@/db";
import { productos } from "@/db/schema";
import { eq } from "drizzle-orm";
import Modal from "@/components/ui/Modal";
import EditarProductoForm from "../../../[id]/editar/_EditarProductoForm";
import { editarProducto } from "../../../actions";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarProductoModal({ params }: Props) {
  const { id } = await params;

  const [producto] = await db
    .select()
    .from(productos)
    .where(eq(productos.id, id))
    .limit(1);

  if (!producto) {
    return (
      <Modal>
        <div className="py-4 text-center">
          <p className="font-medium text-white">Producto no encontrado.</p>
          <p className="mt-1 text-sm text-zinc-400">
            Este producto no existe o fue eliminado.
          </p>
        </div>
      </Modal>
    );
  }

  const editarConId = editarProducto.bind(null, id);

  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Inventario</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Editar producto
        </h2>
        <p className="mt-0.5 text-sm text-zinc-400">{producto.nombre}</p>
      </div>

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
    </Modal>
  );
}
