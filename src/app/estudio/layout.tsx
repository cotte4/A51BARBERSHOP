import { notFound } from "next/navigation";
import { getEstudioActor } from "@/lib/estudio";

// Para cualquiera que no esté en ESTUDIO_EMAILS, la sección no existe.
export default async function EstudioLayout({ children }: { children: React.ReactNode }) {
  if (!(await getEstudioActor())) notFound();
  return children;
}
