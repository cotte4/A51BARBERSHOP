"use client";

import { useCallback, useEffect, useRef } from "react";

// ─── Constants ──────────────────────────────────────────────────────────────

const ENDPOINT = "/api/music/state";
const BASE_INTERVAL_MS = 20_000;     // 20s normal cadence
const MAX_INTERVAL_MS = 120_000;     // 2min backoff cap
const INITIAL_DELAY_MS = 6_000;      // let the page settle before first tick
const STORAGE_KEY = "a51_heartbeat_leader";
const LOCK_TTL_MS = 10_000;          // leader lock expires after 10s if not refreshed
const LOCK_REFRESH_MS = 4_500;       // refresh lock every 4.5s (well under TTL)

// ─── Leader lock helpers (localStorage) ────────────────────────────────────
// Only one tab should drive the heartbeat. We use a TTL-based lock in
// localStorage so that when the leader tab closes, another tab takes over
// within one TTL window (~10s), no BroadcastChannel needed.

type LeaderRecord = { tabId: string; expiresAt: number };

function readLock(): LeaderRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LeaderRecord;
  } catch {
    return null;
  }
}

function writeLock(tabId: string): void {
  try {
    const record: LeaderRecord = { tabId, expiresAt: Date.now() + LOCK_TTL_MS };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage unavailable — proceed as if we are the leader
  }
}

function releaseLock(tabId: string): void {
  try {
    const current = readLock();
    if (current?.tabId === tabId) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function isOrCanBeLeader(tabId: string): boolean {
  const lock = readLock();
  if (!lock) return true;                        // no lock → claim it
  if (lock.expiresAt < Date.now()) return true;  // expired → claim it
  return lock.tabId === tabId;                   // we already own it
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMusicHeartbeat(): void {
  // Stable tab identity for this mount — does not change on re-renders
  const tabIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const failuresRef = useRef<number>(0);
  const stoppedRef = useRef<boolean>(false);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute next interval with exponential backoff
  const nextInterval = useCallback((): number => {
    return Math.min(BASE_INTERVAL_MS * Math.pow(2, failuresRef.current), MAX_INTERVAL_MS);
  }, []);

  // Schedule the next tick (cancels any pending one first)
  const schedule = useCallback(
    (fn: () => void, delay?: number) => {
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = setTimeout(fn, delay ?? nextInterval());
    },
    [nextInterval],
  );

  const tick = useCallback(async () => {
    if (stoppedRef.current) return;

    // Don't fire while the tab is hidden — visibilitychange will re-trigger
    if (typeof document !== "undefined" && document.hidden) return;

    // Don't fire while offline — the 'online' event will re-trigger
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      schedule(tick); // keep scheduling so we recover when back online
      return;
    }

    // Leader check: only the elected tab fires the POST
    if (!isOrCanBeLeader(tabIdRef.current)) {
      schedule(tick);
      return;
    }

    // Claim / refresh the lock immediately before the network call
    writeLock(tabIdRef.current);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        // No body needed — the endpoint calls syncMusicEngine() on its own
        // Credentials are sent automatically via cookies (same-origin)
      });

      if (res.status === 401) {
        // Better Auth session has expired — no point retrying
        stoppedRef.current = true;
        return;
      }

      if (!res.ok) {
        // Server error — back off but keep trying
        throw new Error(`HTTP ${res.status}`);
      }

      // Success: reset backoff, schedule next normal tick
      failuresRef.current = 0;
      schedule(tick);
    } catch {
      // Network error or non-OK response — increment backoff counter
      failuresRef.current += 1;
      schedule(tick);
    }
  }, [schedule]);

  useEffect(() => {
    stoppedRef.current = false;
    failuresRef.current = 0;

    // Maintain the leader lock while this tab is mounted
    lockTimerRef.current = setInterval(() => {
      if (isOrCanBeLeader(tabIdRef.current)) {
        writeLock(tabIdRef.current);
      }
    }, LOCK_REFRESH_MS);

    // First tick after a short settle delay
    schedule(tick, INITIAL_DELAY_MS);

    // Fire immediately when the user switches back to this tab
    function onVisibilityChange() {
      if (!document.hidden) {
        schedule(tick, 0);
      }
    }

    // Fire immediately when network comes back
    function onOnline() {
      schedule(tick, 0);
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);

    return () => {
      stoppedRef.current = true;

      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      if (lockTimerRef.current) clearInterval(lockTimerRef.current);

      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);

      // Release leader lock so another tab can take over immediately
      releaseLock(tabIdRef.current);
    };
  }, [tick, schedule]);
}
