"use client";

import DeleteButton from "@/components/configuracion/DeleteButton";
import { eliminarTemporada } from "./actions";

interface TemporadaDeleteButtonProps {
  id: string;
}

export default function TemporadaDeleteButton({ id }: TemporadaDeleteButtonProps) {
  const deleteAction = eliminarTemporada.bind(null, id);
  return (
    <DeleteButton
      deleteAction={deleteAction}
      label="Eliminar"
      confirmMessage="¿Estás seguro que querés eliminar esta temporada? Esta acción no se puede deshacer."
    />
  );
}
