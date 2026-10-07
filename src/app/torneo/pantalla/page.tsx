import type { Metadata } from "next";
import { getDatosPantalla } from "@/lib/torneo-juego";
import Pantalla from "./_Pantalla";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Torneo A51 · En vivo",
  robots: { index: false },
};

export default async function PantallaPage() {
  return <Pantalla inicial={await getDatosPantalla()} />;
}
