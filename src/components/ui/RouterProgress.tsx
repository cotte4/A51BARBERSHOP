"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function RouterProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "completing">("idle");
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Intercept link clicks to start the bar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Element;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http") || anchor.target) return;
      // Only trigger for same-origin navigation to a different path
      if (href !== pathname && !href.startsWith("mailto:") && !href.startsWith("tel:")) {
        setState("loading");
        setWidth(30);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  // Creep the bar forward while loading
  useEffect(() => {
    if (state !== "loading") return;
    const interval = setInterval(() => {
      setWidth((w) => (w < 85 ? w + (85 - w) * 0.08 : w));
    }, 200);
    return () => clearInterval(interval);
  }, [state]);

  // Complete when pathname changes (navigation done)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setState("completing");
    setWidth(100);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState("idle");
      setWidth(0);
    }, 400);
  }, [pathname]);

  if (state === "idle") return null;

  return (
    <div
      role="progressbar"
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[2px] origin-left"
      style={{
        background: "#8cff59",
        width: `${width}%`,
        boxShadow: "0 0 10px rgba(140,255,89,0.7), 0 0 4px rgba(140,255,89,0.4)",
        transition: state === "completing" ? "width 300ms ease-out" : "width 200ms ease-in-out",
      }}
    />
  );
}
