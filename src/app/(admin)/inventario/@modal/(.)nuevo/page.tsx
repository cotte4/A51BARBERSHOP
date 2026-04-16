import Modal from "@/components/ui/Modal";
import NuevoProductoForm from "../../_NuevoProductoForm";

export default function NuevoProductoModal() {
  return (
    <Modal>
      <div className="mb-4">
        <p className="eyebrow text-xs font-semibold text-zinc-500">Inventario</p>
        <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight text-white">
          Nuevo producto
        </h2>
      </div>

      <NuevoProductoForm />
    </Modal>
  );
}
