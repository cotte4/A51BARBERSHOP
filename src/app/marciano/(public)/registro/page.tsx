import MarcianoPublicShell from "@/components/marciano/MarcianoPublicShell";
import MarcianoRegisterForm from "@/components/marciano/MarcianoRegisterForm";

export default function MarcianoRegistroPage() {
  return (
    <MarcianoPublicShell
      badge="Activación Marciana"
      title="Creá tu acceso VIP"
      description="Si A51 ya cargo tu email en la membresia, desde acá activas tu cuenta y entramos directo al portal."
      sideTitle="Activa tu portal y entra con ventaja."
      sideDescription="La activación está pensada para ser corta y clara: validamos email, generás clave y te llevamos al portal sin mezclarte con el ingreso del staff."
      notes={[
        { label: "Paso 1", value: "Validar tu email" },
        { label: "Paso 2", value: "Crear tu clave" },
        { label: "Paso 3", value: "Entrar al portal" },
        { label: "Ruta", value: "/marciano/registro" },
      ]}
      footer={
        <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-sm text-zinc-400">
          Si todavía no figuras, escribinos en la barber para validar tu email primero.
        </div>
      }
    >
      <MarcianoRegisterForm />
    </MarcianoPublicShell>
  );
}
