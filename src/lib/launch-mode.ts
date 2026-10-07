import { redirect } from "next/navigation";

/**
 * Mientras el resto de la app no esté testeada, el portal de clientes (Club Marciano:
 * perfil, turnos, OVNIS, juegos, ruleta) permanece cerrado: el público solo ve el
 * torneo y un teaser. Se abre con PORTAL_CLIENTE_ABIERTO=true. Cerrado por defecto.
 */
export function isPortalClienteAbierto(): boolean {
  return process.env.PORTAL_CLIENTE_ABIERTO === "true";
}

/** Para páginas y server actions del portal: si está cerrado, vuelve al inicio. */
export function assertPortalClienteAbierto(): void {
  if (!isPortalClienteAbierto()) redirect("/");
}
