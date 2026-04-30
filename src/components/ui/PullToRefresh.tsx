"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const THRESHOLD = 72;

export function PullToRefresh() {
  const router = useRouter();
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  // Refs mirror state so handlers read current values without becoming deps
  const pullYRef = useRef(0);
  const refreshingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY === 0) {
        startYRef.current = e.touches[0].clientY;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (startYRef.current === null || window.scrollY > 0) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        startYRef.current = null;
        return;
      }
      pullingRef.current = true;
      // Resist: sqrt curve so it gets harder to pull further
      const next = Math.min(Math.sqrt(delta) * 5, THRESHOLD + 20);
      pullYRef.current = next;
      setPullY(next);
      if (delta > 8) {
        e.preventDefault();
      }
    }

    function onTouchEnd() {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      if (pullYRef.current >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        pullYRef.current = THRESHOLD;
        setPullY(THRESHOLD);
        navigator.vibrate?.(40);
        router.refresh();
        timerRef.current = setTimeout(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          pullYRef.current = 0;
          setPullY(0);
        }, 900);
      } else {
        pullYRef.current = 0;
        setPullY(0);
      }
      startYRef.current = null;
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router]);

  const progress = Math.min(pullY / THRESHOLD, 1);
  const isReady = progress >= 1;

  if (pullY === 0 && !refreshing) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center"
      style={{
        transform: `translateY(${pullY - THRESHOLD}px)`,
        transition: pullY === 0 || pullY === THRESHOLD ? "transform 300ms ease-out" : "none",
      }}
    >
      <div
        className={`mt-3 flex items-center gap-2.5 rounded-full border px-4 py-2 text-xs font-semibold backdrop-blur-sm transition-all duration-200 ${
          refreshing
            ? "animate-pulse border-[#8cff59]/30 bg-[#8cff59]/10 text-[#8cff59]"
            : isReady
              ? "border-[#8cff59]/40 bg-[#8cff59]/15 text-[#8cff59]"
              : "border-zinc-700/60 bg-zinc-900/80 text-zinc-400"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          style={
            !refreshing
              ? { transform: `rotate(${progress * 180}deg)`, transition: "transform 100ms" }
              : undefined
          }
        >
          {refreshing ? (
            <path
              d="M12 3a9 9 0 1 0 9 9"
              strokeLinecap="round"
            />
          ) : (
            <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
        <span>
          {refreshing ? "Actualizando..." : isReady ? "Soltar para actualizar" : "Bajá para actualizar"}
        </span>
      </div>
    </div>
  );
}
