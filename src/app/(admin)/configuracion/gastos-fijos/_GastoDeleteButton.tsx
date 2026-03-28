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
      label="Eliminar"
      confirmMessage="¿Estás seguro que querés eliminar este gasto? Esta acción no se puede deshacer."
    />
  );
}
