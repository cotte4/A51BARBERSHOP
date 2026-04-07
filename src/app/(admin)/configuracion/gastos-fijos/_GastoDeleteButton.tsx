"use client";

import DeleteButton from "@/components/configuracion/DeleteButton";
import { eliminarGasto } from "./actions";

interface GastoDeleteButtonProps {
  id: string;
}

export default function GastoDeleteButton({ id }: GastoDeleteButtonProps) {
  const deleteAction = eliminarGasto.bind(null, id);
  return (
    <DeleteButton
      deleteAction={deleteAction}
      label="Eliminar gasto"
      confirmMessage="Vas a eliminar este gasto fijo. Si era recurrente, vas a tener que volver a cargarlo manualmente. Esta accion no se puede deshacer."
    />
  );
}
