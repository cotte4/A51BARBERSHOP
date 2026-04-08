"use client";

type SoundName = "tick" | "select" | "capture" | "reveal";

const SOUND_PATHS: Record<SoundName, string> = {
  tick: "/sounds/marciano/tick.mp3",
  select: "/sounds/marciano/select.mp3",
  capture: "/sounds/marciano/capture.mp3",
  reveal: "/sounds/marciano/reveal.mp3",
};

const VOLUMES: Record<SoundName, number> = {
  tick: 0.25,
  select: 0.30,
  capture: 0.30,
  reveal: 0.35,
};

const MUTE_KEY = "marciano:sounds:muted";

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MUTE_KEY) === "true";
}

export function toggleSoundMute(): boolean {
  const next = !isSoundMuted();
  localStorage.setItem(MUTE_KEY, String(next));
  return next;
}

export function playSound(name: SoundName): void {
  if (typeof window === "undefined") return;

  // Respect prefers-reduced-motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Respect user mute preference
  if (isSoundMuted()) return;

  // Respect autoplay policy — only play after user interaction
  if (!navigator.userActivation?.hasBeenActive) return;

  const audio = new Audio(SOUND_PATHS[name]);
  audio.volume = VOLUMES[name];
  audio.play().catch(() => {
    // Silently fail — audio is a nice-to-have, never blocking
  });
}
