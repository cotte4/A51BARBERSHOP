import Link from "next/link";
import MarcianoPasswordResetForm from "@/components/marciano/MarcianoPasswordResetForm";
import MarcianoPublicShell from "@/components/marciano/MarcianoPublicShell";

type MarcianoResetPageProps = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

export default async function MarcianoResetPage({ searchParams }: MarcianoResetPageProps) {
  const params = await searchParams;
  const tokenError =
    params.error === "INVALID_TOKEN" ? "El link de recuperación ya venció o no es válido." : null;

  return (
    <MarcianoPublicShell
      badge="Nueva contraseña"
      title="Volvé a entrar al portal"
      description="Creá una nueva clave para tu acceso Marciano y seguí con la misma cuenta."
      sideTitle="Reinicio limpio, mismo portal."
      sideDescription="Cuando el token está bien, cambiás la clave y listo. Si venció, desde acá mismo pedís otro enlace sin perderte en rutas raras."
      notes={[
        { label: "Token", value: tokenError ? "Vencido" : "Válido" },
        { label: "Clave", value: "Nueva y segura" },
        { label: "Acceso", value: "Portal Marciano" },
        { label: "Ruta", value: "/marciano/reset" },
      ]}
      footer={
        <p className="text-center text-sm text-zinc-400">
          <Link href="/marciano/login" className="text-[#8cff59] hover:text-[#b6ff84]">
            Volver al login
          </Link>
        </p>
      }
    >
      <MarcianoPasswordResetForm token={params.token ?? null} tokenError={tokenError} />
    </MarcianoPublicShell>
  );
}
