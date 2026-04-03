import { getPantallaEventById, isPantallaEventVotable } from "@/lib/pantalla-votos";
import VotarClient from "./VotarClient";

function InvalidVoteLink() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(217,70,239,0.12),_transparent_35%),#020617] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <section className="w-full rounded-[32px] border border-white/10 bg-white/6 px-7 py-10 text-center shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">
            A51 Barber
          </p>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Link invalido</h1>
          <p className="mt-4 text-sm leading-6 text-zinc-300">
            Este QR ya no esta disponible. Pedi que escaneen el codigo que aparece ahora en la
            pantalla del local.
          </p>
        </section>
      </div>
    </main>
  );
}

export default async function PantallaVotarPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getPantallaEventById(eventId);

  if (!event || !isPantallaEventVotable(event.createdAt)) {
    return <InvalidVoteLink />;
  }

  return (
    <VotarClient
      eventId={event.id}
      cancion={event.cancion}
      clienteNombre={event.clienteNombre}
    />
  );
}
