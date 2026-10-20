import MarcianoPasswordRecoveryForm from "@/components/marciano/MarcianoPasswordRecoveryForm";
import MarcianoPublicShell from "@/components/marciano/MarcianoPublicShell";

export default function MarcianoRecoverPage() {
  return (
    <MarcianoPublicShell
      badge="Recuperación Marciana"
      title="Recupera tu acceso"
      description="Te mandamos un link seguro al email registrado para que vuelvas a entrar sin pasar por soporte."
      sideTitle="Recupera tu cuenta sin interrupciones."
      sideDescription="Es un paso único y cliente-first: pedís el link, creás una nueva clave y volvés al portal con la misma cuenta."
      notes={[
        { label: "Destino", value: "Tu email Marciano" },
        { label: "Uso", value: "Solo reset de clave" },
        { label: "Tiempo", value: "En pocos minutos" },
        { label: "Ruta", value: "/marciano/recuperar" },
      ]}
    >
      <MarcianoPasswordRecoveryForm />
    </MarcianoPublicShell>
  );
}
