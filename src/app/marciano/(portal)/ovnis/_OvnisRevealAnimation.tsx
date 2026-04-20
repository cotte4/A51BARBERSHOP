"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatOvnis } from "@/lib/ovnis";

interface Props {
  amount: number;
  description: string;
}

export default function OvnisRevealAnimation({ amount, description }: Props) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          router.push("/marciano/ovnis");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="animate-[a51-scale-in_0.5s_ease-out]">
        <p className="text-6xl">🛸</p>
      </div>

      <div className="space-y-3">
        <p className="eyebrow text-xs">El universo habló</p>
        <p className="font-display text-4xl font-bold text-[#8cff59]">
          +{formatOvnis(amount)}
        </p>
        <p className="text-sm text-zinc-400">{description}</p>
      </div>

      <div className="rounded-[22px] border border-[#8cff59]/20 bg-[#8cff59]/8 px-6 py-4">
        <p className="text-sm font-medium text-white">
          El universo te depositó{" "}
          <span className="font-bold text-[#8cff59]">{formatOvnis(amount)}</span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Ya están en tu wallet
        </p>
      </div>

      <p className="text-xs text-zinc-600">
        Redirigiendo en {countdown}s...
      </p>
    </div>
  );
}
