export type AvatarPreset = "galactic" | "elf" | "demon" | "android" | "cosmic" | "orc";

export type AvatarPresetData = {
  label: string;
  vibe: string;
  prompt: string;
  negativePrompt: string;
  restylePrompt: string;
  emoji: string;
};

export const INTENSITY_MODIFIERS: Record<1 | 2 | 3, string> = {
  1: "Apply subtle, understated modifications while keeping the character clearly recognizable. ",
  2: "",
  3: "Apply extreme, dramatic, and exaggerated modifications. Push every feature to the maximum for a bold stylized result. ",
};

export const AVATAR_PRESETS: Record<AvatarPreset, AvatarPresetData> = {
  galactic: {
    label: "Galactic Alien",
    vibe: "Clásico espacial",
    emoji: "👽",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} alien skin, close-up portrait of a cartoon alien, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, elongated oval alien head, very large almond-shaped solid black eyes, small pointed ears, bioluminescent spots, visible hairstyle, detailed hair, outer space background with stars and colorful nebula.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, small eyes, round eyes, human eyes, full body, screaming, open mouth, bald, shaved head, no hair, blurry, low quality, ugly, deformed.",
    restylePrompt:
      "Transform this character into a classic space alien. Keep the hair, facial structure, and skin color. Replace the features with: elongated oval alien head, very large almond-shaped solid black eyes, small pointed ears, subtle bioluminescent spots on the face. Change the background to outer space with stars and colorful nebula.",
  },
  elf: {
    label: "Fantasy Elf",
    vibe: "Mágico / RPG",
    emoji: "🧝",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} fantasy elf skin, close-up portrait of a cartoon fantasy elf, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, very long pointed elven ears, glowing magical eyes, ethereal glowing aura on skin, visible hairstyle, detailed hair, enchanted glowing forest background with magical fireflies.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, round ears, human ears, human eyes, full body, screaming, open mouth, bald, shaved head, no hair, sci-fi, blurry, low quality, ugly, deformed.",
    restylePrompt:
      "Transform this character into a fantasy elf. Keep the hair, facial structure, and skin color. Add very long pointed elven ears, glowing magical eyes, subtle ethereal glow on the skin. Change the background to an enchanted glowing forest with magical fireflies.",
  },
  demon: {
    label: "Underworld Demon",
    vibe: "Dark fantasy",
    emoji: "😈",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} demon skin, close-up portrait of a cartoon demon, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, dark demonic horns protruding from forehead, glowing solid red eyes, pointed ears, subtle textured scales on jawline, visible hairstyle, detailed hair, background of dark glowing embers and fiery smoke.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, human eyes, round eyes, halo, angelic, full body, screaming, open mouth, bald, shaved head, no hair, blurry, low quality, ugly, deformed.",
    restylePrompt:
      "Transform this character into a demon. Keep the hair, facial structure, and skin color. Add dark demonic horns protruding from the forehead, glowing solid red eyes, pointed ears, subtle textured scales on the jawline. Change the background to dark glowing embers and fiery smoke.",
  },
  android: {
    label: "Cyberpunk Android",
    vibe: "Sci-Fi / Tech",
    emoji: "🤖",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} android skin, close-up portrait of a cartoon cyberpunk android, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, glowing mechanical neon eyes, subtle futuristic metallic panel lines on cheeks, glowing {COLOR} circuit lines on neck, visible hairstyle, detailed hair, futuristic neon cyberpunk city background at night.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, human eyes, completely organic face, primitive, full body, screaming, open mouth, bald, shaved head, no hair, nature background, blurry, low quality, ugly, deformed.",
    restylePrompt:
      "Transform this character into a cyberpunk android. Keep the hair, facial structure, and skin color. Add glowing mechanical neon eyes, subtle futuristic metallic panel lines on the cheeks, glowing circuit lines on the neck. Change the background to a futuristic neon cyberpunk city at night.",
  },
  cosmic: {
    label: "Cosmic Star-Being",
    vibe: "Celestial / Dios",
    emoji: "✨",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} cosmic skin, close-up portrait of a cartoon celestial star-being, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, skin looks like a sparkling galaxy with subtle stars, glowing solid white eyes with no pupils, radiant energy aura, visible hairstyle, detailed hair, bright cosmic supernova background.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, human eyes, flat skin texture, normal skin, full body, screaming, open mouth, bald, shaved head, no hair, blurry, low quality, ugly, deformed.",
    restylePrompt:
      "Transform this character into a celestial star-being. Keep the hair and facial structure. Make the skin look like a sparkling galaxy with subtle stars on it. Change the eyes to glowing solid white with no pupils, add a radiant energy aura around the head. Change the background to a bright cosmic supernova.",
  },
  orc: {
    label: "Orc / Goblin",
    vibe: "Gamer / Combate",
    emoji: "👹",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} orc skin, close-up portrait of a cartoon fantasy orc, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, rugged textured skin, prominent lower jaw, fierce glowing eyes, large pointed ears, visible hairstyle, detailed hair, dramatic fantasy battleground background with storm clouds.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, soft features, cute, human eyes, full body, screaming, open mouth, bald, shaved head, no hair, sci-fi, blurry, low quality, ugly, deformed.",
    restylePrompt:
      "Transform this character into a fantasy orc. Keep the hair, facial structure, and skin color. Add rugged textured skin, a prominent lower jaw, fierce glowing eyes, large pointed ears. Change the background to a dramatic fantasy battleground with storm clouds.",
  },
};
