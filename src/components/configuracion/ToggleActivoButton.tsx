"use client";

import ActionButton from "@/components/ui/ActionButton";

interface ToggleActivoButtonProps {
  id: string;
  activo: boolean;
  toggleAction: (id: string, activo: boolean) => Promise<void>;
}

export default function ToggleActivoButton({
  id,
  activo,
  toggleAction,
}: ToggleActivoButtonProps) {
  return (
    <ActionButton
      variant={activo ? "subtle" : "ghost"}
      onAction={() => toggleAction(id, activo)}
      successText={activo ? "Desactivado" : "Activado"}
      loadingText={activo ? "Desactivando..." : "Activando..."}
      className="min-h-[46px] px-4"
    >
      {activo ? "Desactivar" : "Activar"}
    </ActionButton>
  );
}
