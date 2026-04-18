import type { AvatarPreset } from "./marciano-avatar-presets";

export type CalibrationImage = {
  id: string;
  url: string;
  preset: AvatarPreset;
  tags: string[];
};

export const CALIBRATION_IMAGES: readonly CalibrationImage[] = [
  // GALACTIC — espacio, nébulas, sci-fi
  { id: "gal-1", preset: "galactic", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80", tags: ["nebula", "cosmic"] },
  { id: "gal-2", preset: "galactic", url: "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800&q=80", tags: ["space", "stars"] },
  { id: "gal-3", preset: "galactic", url: "https://images.unsplash.com/photo-1454789548928-9efd52dc4031?w=800&q=80", tags: ["galaxy"] },
  { id: "gal-4", preset: "galactic", url: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&q=80", tags: ["milky-way"] },

  // ELF — bosques mágicos, aurora, mística natural
  { id: "elf-1", preset: "elf", url: "https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80", tags: ["forest", "mystic"] },
  { id: "elf-2", preset: "elf", url: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80", tags: ["forest", "fog"] },
  { id: "elf-3", preset: "elf", url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80", tags: ["mountain", "mystic"] },
  { id: "elf-4", preset: "elf", url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80", tags: ["nature", "magical"] },

  // DEMON — llamas, gótico, dark
  { id: "dem-1", preset: "demon", url: "https://images.unsplash.com/photo-1492112007959-c35ae067c37b?w=800&q=80", tags: ["fire", "embers"] },
  { id: "dem-2", preset: "demon", url: "https://images.unsplash.com/photo-1513829596324-4bb2800c5efb?w=800&q=80", tags: ["dark", "volcanic"] },
  { id: "dem-3", preset: "demon", url: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800&q=80", tags: ["fire"] },
  { id: "dem-4", preset: "demon", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80", tags: ["gothic", "dark"] },

  // ANDROID — cyberpunk, neon city, tech
  { id: "and-1", preset: "android", url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80", tags: ["neon", "city"] },
  { id: "and-2", preset: "android", url: "https://images.unsplash.com/photo-1515169067868-5387ec356754?w=800&q=80", tags: ["tech", "neon"] },
  { id: "and-3", preset: "android", url: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&q=80", tags: ["cyberpunk"] },
  { id: "and-4", preset: "android", url: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80", tags: ["neon", "city"] },

  // COSMIC — celestial, dorado, supernova
  { id: "cos-1", preset: "cosmic", url: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800&q=80", tags: ["sun", "golden"] },
  { id: "cos-2", preset: "cosmic", url: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=800&q=80", tags: ["stars", "celestial"] },
  { id: "cos-3", preset: "cosmic", url: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=800&q=80", tags: ["light"] },
  { id: "cos-4", preset: "cosmic", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80", tags: ["supernova", "glow"] },

  // ORC — batalla, tormenta, dramático
  { id: "orc-1", preset: "orc", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80", tags: ["storm", "mountain"] },
  { id: "orc-2", preset: "orc", url: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&q=80", tags: ["rugged"] },
  { id: "orc-3", preset: "orc", url: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&q=80", tags: ["storm"] },
  { id: "orc-4", preset: "orc", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80", tags: ["battle", "dramatic"] },
];

const ALL_PRESETS: readonly AvatarPreset[] = ["galactic", "elf", "demon", "android", "cosmic", "orc"];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getCalibrationPair(options: {
  excludePresets?: AvatarPreset[];
  forcePresets?: [AvatarPreset, AvatarPreset];
  seenImageIds?: Set<string>;
}): [CalibrationImage, CalibrationImage] {
  const { excludePresets = [], forcePresets, seenImageIds = new Set() } = options;

  const pool = CALIBRATION_IMAGES.filter((i) => !seenImageIds.has(i.id));

  if (forcePresets) {
    const [a, b] = forcePresets;
    const candidatesA = pool.filter((i) => i.preset === a);
    const candidatesB = pool.filter((i) => i.preset === b);
    const imgA = candidatesA.length > 0 ? pickRandom(candidatesA) : CALIBRATION_IMAGES.find((i) => i.preset === a)!;
    const imgB = candidatesB.length > 0 ? pickRandom(candidatesB) : CALIBRATION_IMAGES.find((i) => i.preset === b)!;
    return [imgA, imgB];
  }

  const available = ALL_PRESETS.filter((p) => !excludePresets.includes(p));
  const presetA = pickRandom(available);
  const presetB = pickRandom(available.filter((p) => p !== presetA));

  const candidatesA = pool.filter((i) => i.preset === presetA);
  const candidatesB = pool.filter((i) => i.preset === presetB);
  const imgA = candidatesA.length > 0 ? pickRandom(candidatesA) : CALIBRATION_IMAGES.find((i) => i.preset === presetA)!;
  const imgB = candidatesB.length > 0 ? pickRandom(candidatesB) : CALIBRATION_IMAGES.find((i) => i.preset === presetB)!;
  return [imgA, imgB];
}
