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
      const resistance = Math.sqrt(delta) * 5;
      setPullY(Math.min(resistance, THRESHOLD + 20));
      // Prevent default scroll/bounce when actively pulling
      if (delta > 8) {
        e.preventDefault();
      }
    }

    function onTouchEnd() {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      if (pullY >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPullY(THRESHOLD); // snap to threshold while refreshing
        navigator.vibrate?.(40);
        router.refresh();
        setTimeout(() => {
          setRefreshing(false);
          setPullY(0);
        }, 900);
      } else {
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
    };
  }, [pullY, refreshing, router]);

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
        {/* Spinner / arrow icon */}
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
