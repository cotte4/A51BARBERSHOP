"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CADA_MS = 15_000;

/** Vuelve a pedir los datos mientras la página está a la vista (sin WebSockets en Vercel). */
export default function Refrescar() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, CADA_MS);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
