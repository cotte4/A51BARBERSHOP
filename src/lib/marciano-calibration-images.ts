import type { AvatarPreset } from "./marciano-avatar-presets";

export type CalibrationImage = {
  id: string;
  url: string;
  preset: AvatarPreset;
  tags: string[];
};

export const CALIBRATION_IMAGES: readonly CalibrationImage[] = [
  // GALACTIC — espacio, nébulas, galaxias
  { id: "gal-1", preset: "galactic", url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80", tags: ["nebula", "cosmic"] },
  { id: "gal-2", preset: "galactic", url: "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800&q=80", tags: ["space", "stars"] },
  { id: "gal-3", preset: "galactic", url: "https://images.unsplash.com/photo-1454789548928-9efd52dc4031?w=800&q=80", tags: ["galaxy"] },
  { id: "gal-4", preset: "galactic", url: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&q=80", tags: ["milky-way"] },

  // MARCIANEKE — urbano, graffiti, neon, calles de noche
  { id: "mrk-1", preset: "marcianeke", url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80", tags: ["neon", "city", "urban"] },
  { id: "mrk-2", preset: "marcianeke", url: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80", tags: ["street", "neon"] },
  { id: "mrk-3", preset: "marcianeke", url: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=800&q=80", tags: ["graffiti", "urban"] },
  { id: "mrk-4", preset: "marcianeke", url: "https://images.unsplash.com/photo-1515169067868-5387ec356754?w=800&q=80", tags: ["neon", "city-lights"] },

  // RAPTUS — boxeo, combate, callejero, oscuro y gritty
  { id: "rap-1", preset: "raptus", url: "https://images.unsplash.com/photo-1549719418-21a25a6e0d7e?w=800&q=80", tags: ["boxing", "fight"] },
  { id: "rap-2", preset: "raptus", url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80", tags: ["boxing-gloves", "combat"] },
  { id: "rap-3", preset: "raptus", url: "https://images.unsplash.com/photo-1492112007959-c35ae067c37b?w=800&q=80", tags: ["dark", "fire"] },
  { id: "rap-4", preset: "raptus", url: "https://images.unsplash.com/photo-1513829596324-4bb2800c5efb?w=800&q=80", tags: ["dark", "gritty"] },

  // NAVI — exploración espacial, planetas, tecnología limpia
  { id: "nav-1", preset: "navi", url: "https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=800&q=80", tags: ["planet", "space"] },
  { id: "nav-2", preset: "navi", url: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=800&q=80", tags: ["stars", "explorer"] },
  { id: "nav-3", preset: "navi", url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80", tags: ["cosmos", "deep-space"] },
  { id: "nav-4", preset: "navi", url: "https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=800&q=80", tags: ["light", "orbital"] },

  // LISAIL — oscuro, ancestral, elegante, eterno
  { id: "lis-1", preset: "lisail", url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80", tags: ["dark", "dramatic"] },
  { id: "lis-2", preset: "lisail", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80", tags: ["gothic", "mist"] },
  { id: "lis-3", preset: "lisail", url: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800&q=80", tags: ["dark", "moody"] },
  { id: "lis-4", preset: "lisail", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80", tags: ["ancient", "storm"] },

  // HOMEW — música, estudio, hip-hop, luces de colores
  { id: "hom-1", preset: "homew", url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80", tags: ["concert", "stage"] },
  { id: "hom-2", preset: "homew", url: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80", tags: ["music", "studio"] },
  { id: "hom-3", preset: "homew", url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&q=80", tags: ["neon-lights", "crowd"] },
  { id: "hom-4", preset: "homew", url: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800&q=80", tags: ["hip-hop", "urban-art"] },

  // TRILOVITI — atlético, ancestral, ruinas con tech, poder
  { id: "tri-1", preset: "triloviti", url: "https://images.unsplash.com/photo-1552674605-db5fecabfe68?w=800&q=80", tags: ["athlete", "power"] },
  { id: "tri-2", preset: "triloviti", url: "https://images.unsplash.com/photo-1541534741688-6078c738baa2?w=800&q=80", tags: ["athletic", "training"] },
  { id: "tri-3", preset: "triloviti", url: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&q=80", tags: ["ancient-ruins", "temple"] },
  { id: "tri-4", preset: "triloviti", url: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=800&q=80", tags: ["storm", "epic"] },
];

const ALL_PRESETS: readonly AvatarPreset[] = [
  "galactic",
  "marcianeke",
  "raptus",
  "navi",
  "lisail",
  "homew",
  "triloviti",
];

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
