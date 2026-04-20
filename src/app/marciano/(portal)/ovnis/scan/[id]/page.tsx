import Link from "next/link";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { redeemPendingCredit } from "@/lib/ovnis-server";
import OvnisRevealAnimation from "../../_OvnisRevealAnimation";

const ERROR_MESSAGES: Record<string, string> = {
  already_redeemed: "Ya escaneaste este QR anteriormente.",
  expired: "Este QR venció. Pedile uno nuevo al barbero.",
  wrong_client: "Este QR no es tuyo.",
  not_found: "QR no encontrado.",
  client_not_marciano: "Tu membresía Marciano está inactiva.",
};

export default async function ScanOvnisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { client } = await requireMarcianoClient();
  const { id } = await params;

  const result = await redeemPendingCredit({
    pendingCreditId: id,
    scannedByClientId: client.id,
  });

  if (result.success) {
    return (
      <OvnisRevealAnimation amount={result.amount} description={result.description} />
    );
  }

  const message = ERROR_MESSAGES[result.reason] ?? "Algo salió mal.";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <p className="text-5xl">👽</p>
      <div className="space-y-2">
        <p className="font-display text-xl font-semibold text-white">
          El universo no pudo procesarlo
        </p>
        <p className="text-sm text-zinc-400">{message}</p>
      </div>
      <Link
        href="/marciano/ovnis"
        className="ghost-button rounded-[20px] px-6 py-3 text-sm font-semibold"
      >
        Volver a mi wallet
      </Link>
    </div>
  );
}
