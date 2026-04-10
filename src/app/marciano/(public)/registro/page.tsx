import Link from "next/link";
import MarcianoPublicShell from "@/components/marciano/MarcianoPublicShell";
import MarcianoRegisterForm from "@/components/marciano/MarcianoRegisterForm";

export default function MarcianoRegistroPage() {
  return (
    <MarcianoPublicShell
      badge="Activacion Marciana"
      title="Crea tu acceso VIP"
      description="Si A51 ya cargo tu email en la membresia, desde aca activas tu cuenta y entramos directo al portal."
      sideTitle="Activa tu portal y entra con ventaja."
      sideDescription="La activacion esta pensada para ser corta y clara: validamos email, generas clave y te llevamos al portal sin mezclarte con el ingreso del staff."
      notes={[
        { label: "Paso 1", value: "Validar tu email" },
        { label: "Paso 2", value: "Crear tu clave" },
        { label: "Paso 3", value: "Entrar al portal" },
        { label: "Ruta", value: "/marciano/registro" },
      ]}
      footer={
        <>
          <p className="text-center text-sm text-zinc-500">
            Si todavia no figuras, escribinos en la barber para validar tu email primero.
          </p>
          <p className="mt-3 text-center text-sm text-zinc-400">
            <Link href="/marciano/login" className="hover:text-white">
              Volver al login Marciano
            </Link>
          </p>
        </>
      }
    >
      <MarcianoRegisterForm />
    </MarcianoPublicShell>
  );
}
