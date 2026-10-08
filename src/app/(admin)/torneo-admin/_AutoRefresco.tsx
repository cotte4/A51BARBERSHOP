"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CADA_MS = 15_000;

/** Los anotados nuevos aparecen solos: vuelve a pedir los datos mientras la pantalla está a la vista. */
export default function AutoRefresco() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      const escribiendo = document.activeElement instanceof HTMLInputElement;
      if (document.visibilityState === "visible" && !escribiendo) router.refresh();
    }, CADA_MS);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
