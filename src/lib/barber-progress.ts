type Level = {
  label: string;
  next: string | null;
  remaining: number;
  progress: number; // 0–100
};

const LEVELS = [
  { label: "Rookie", min: 0, max: 49 },
  { label: "Junior", min: 50, max: 149 },
  { label: "Senior", min: 150, max: 299 },
  { label: "Master", min: 300, max: Infinity },
] as const;

export function getLevel(totalCuts: number): Level {
  for (let i = 0; i < LEVELS.length; i++) {
    const current = LEVELS[i];
    if (totalCuts <= current.max) {
      const next = i < LEVELS.length - 1 ? LEVELS[i + 1] : null;
      const range = current.max === Infinity ? 1 : current.max - current.min + 1;
      const done = totalCuts - current.min;
      const progress = current.max === Infinity ? 100 : Math.round((done / range) * 100);
      const remaining = current.max === Infinity ? 0 : current.max - totalCuts + 1;
      return {
        label: current.label,
        next: next ? next.label : null,
        remaining,
        progress,
      };
    }
  }
  return { label: "Master", next: null, remaining: 0, progress: 100 };
}
