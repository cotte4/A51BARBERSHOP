"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { SCAN_PATH, formatOvnis } from "@/lib/ovnis";

type Props = {
  pendingCreditId: string;
  clientName: string;
  amount: number;
};

export default function OvnisQRDisplay({ pendingCreditId, clientName, amount }: Props) {
  const [copied, setCopied] = useState(false);

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${SCAN_PATH(pendingCreditId)}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="border border-[#8cff59]/30 bg-zinc-900 rounded-[22px] p-5 flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="eyebrow text-xs mb-1">OVNIS disponibles</p>
        <p className="font-display text-2xl font-bold" style={{ color: "#8cff59" }}>
          +{formatOvnis(amount)}
        </p>
        <p className="text-sm text-zinc-400 mt-0.5">para {clientName}</p>
      </div>

      <div className="bg-white p-3 rounded-xl">
        <QRCodeSVG value={url} size={180} />
      </div>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-zinc-200">Escaneá para acumular {formatOvnis(amount)}</p>
        <p className="text-xs text-zinc-500">Válido 7 días — el cliente escanea desde su celu</p>
      </div>

      <button
        onClick={handleCopy}
        className="ghost-button rounded-[20px] px-4 py-2 text-sm font-semibold w-full min-h-[44px]"
      >
        {copied ? "¡Link copiado!" : "Copiar link"}
      </button>
    </div>
  );
}
