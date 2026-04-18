export type AvatarPreset = "galactic" | "elf" | "demon" | "android" | "cosmic" | "orc";

export const AVATAR_PRESETS: Record<
  AvatarPreset,
  { label: string; vibe: string; prompt: string; negativePrompt: string }
> = {
  galactic: {
    label: "Galactic Alien",
    vibe: "Clásico espacial",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} alien skin, close-up portrait of a cartoon alien, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, elongated oval alien head, very large almond-shaped solid black eyes, small pointed ears, bioluminescent spots, visible hairstyle, detailed hair, outer space background with stars and colorful nebula.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, small eyes, round eyes, human eyes, full body, screaming, open mouth, bald, shaved head, no hair, blurry, low quality, ugly, deformed.",
  },
  elf: {
    label: "Fantasy Elf",
    vibe: "Mágico / RPG",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} fantasy elf skin, close-up portrait of a cartoon fantasy elf, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, very long pointed elven ears, glowing magical eyes, ethereal glowing aura on skin, visible hairstyle, detailed hair, enchanted glowing forest background with magical fireflies.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, round ears, human ears, human eyes, full body, screaming, open mouth, bald, shaved head, no hair, sci-fi, blurry, low quality, ugly, deformed.",
  },
  demon: {
    label: "Underworld Demon",
    vibe: "Dark fantasy",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} demon skin, close-up portrait of a cartoon demon, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, dark demonic horns protruding from forehead, glowing solid red eyes, pointed ears, subtle textured scales on jawline, visible hairstyle, detailed hair, background of dark glowing embers and fiery smoke.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, human eyes, round eyes, halo, angelic, full body, screaming, open mouth, bald, shaved head, no hair, blurry, low quality, ugly, deformed.",
  },
  android: {
    label: "Cyberpunk Android",
    vibe: "Sci-Fi / Tech",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} android skin, close-up portrait of a cartoon cyberpunk android, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, glowing mechanical neon eyes, subtle futuristic metallic panel lines on cheeks, glowing {COLOR} circuit lines on neck, visible hairstyle, detailed hair, futuristic neon cyberpunk city background at night.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, human eyes, completely organic face, primitive, full body, screaming, open mouth, bald, shaved head, no hair, nature background, blurry, low quality, ugly, deformed.",
  },
  cosmic: {
    label: "Cosmic Star-Being",
    vibe: "Celestial / Dios",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} cosmic skin, close-up portrait of a cartoon celestial star-being, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, skin looks like a sparkling galaxy with subtle stars, glowing solid white eyes with no pupils, radiant energy aura, visible hairstyle, detailed hair, bright cosmic supernova background.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, human eyes, flat skin texture, normal skin, full body, screaming, open mouth, bald, shaved head, no hair, blurry, low quality, ugly, deformed.",
  },
  orc: {
    label: "Orc / Goblin",
    vibe: "Gamer / Combate",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} orc skin, close-up portrait of a cartoon fantasy orc, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, rugged textured skin, prominent lower jaw, fierce glowing eyes, large pointed ears, visible hairstyle, detailed hair, dramatic fantasy battleground background with storm clouds.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, soft features, cute, human eyes, full body, screaming, open mouth, bald, shaved head, no hair, sci-fi, blurry, low quality, ugly, deformed.",
  },
};
