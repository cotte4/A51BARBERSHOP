import { redirect } from "next/navigation";

// La ruta raíz redirige al login.
// El middleware maneja la redirección final según el rol del usuario.
export default function RootPage() {
  redirect("/login");
}
