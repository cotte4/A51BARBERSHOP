"use client";

import { useMusicHeartbeat } from "@/hooks/useMusicHeartbeat";

/**
 * Mounts the music engine heartbeat in any authenticated staff layout.
 * Renders nothing — side-effect only.
 *
 * Behavior:
 * - POSTs /api/music/state every 20s to drive syncMusicEngine()
 * - Only one tab fires at a time (localStorage leader election, 10s TTL)
 * - Pauses when the tab is hidden or offline; fires immediately on recovery
 * - Backs off exponentially (20s → 40s → 80s → 120s cap) on consecutive errors
 * - Stops silently on 401 (session expired)
 */
export default function MusicHeartbeat() {
  useMusicHeartbeat();
  return null;
}
