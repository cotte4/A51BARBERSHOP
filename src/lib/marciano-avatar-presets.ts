export type AvatarPreset =
  | "galactic"
  | "marcianeke"
  | "raptus"
  | "navi"
  | "lisail"
  | "homew"
  | "triloviti";

export type AvatarPresetData = {
  label: string;
  vibe: string;
  prompt: string;
  negativePrompt: string;
  restylePrompt: string;
  emoji: string;
  bald?: boolean; // Triloviti: única raza sin pelo — ignora el hairstyle del cliente
};

export const INTENSITY_MODIFIERS: Record<1 | 2 | 3, string> = {
  1: "Apply subtle, understated modifications while keeping the character clearly recognizable. ",
  2: "",
  3: "Apply extreme, dramatic, and exaggerated modifications. Push every feature to the maximum for a bold stylized result. ",
};

export const AVATAR_PRESETS: Record<AvatarPreset, AvatarPresetData> = {
  galactic: {
    label: "Galáctico",
    vibe: "Clásico espacial",
    emoji: "👽",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} alien skin, close-up portrait of a cartoon alien, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, elongated oval alien head, very large almond-shaped solid black eyes, small pointed ears, bioluminescent spots, visible hairstyle, detailed hair, outer space background with stars and colorful nebula.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, small eyes, round eyes, human eyes, full body, screaming, open mouth, bald, shaved head, no hair, blurry, low quality, ugly, deformed.",
    restylePrompt:
      "Transform this character into a classic space alien. Keep the hair, facial structure, and skin color. Replace the features with: elongated oval alien head, very large almond-shaped solid black eyes, small pointed ears, subtle bioluminescent spots on the face. Change the background to outer space with stars and colorful nebula.",
  },

  marcianeke: {
    label: "Marcianeke",
    vibe: "Trap / Urbano argentino",
    emoji: "🧢",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} alien skin, close-up portrait of a cartoon street alien, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, relaxed cool expression, mouth closed, slightly oversized alien head, large expressive almond eyes with a chill look, subtle glowing street-art marks on cheeks, visible hairstyle, detailed hair, urban neon city background at night with graffiti and colorful lights.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, angry expression, scary, horror, full body, screaming, open mouth, bald, shaved head, no hair, forest, nature, blurry, low quality, ugly, deformed.",
    restylePrompt:
      "Transform this character into a street-style alien from the barrio. Keep the hair, facial structure, and skin color. Add a slightly oversized alien head shape, large expressive almond eyes with a relaxed cool look, subtle glowing marks on the cheeks like street-art tags. Change the background to an urban neon city at night with graffiti and colorful lights.",
  },

  raptus: {
    label: "Raptus",
    vibe: "Peleador callejero",
    emoji: "🥊",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} alien skin, close-up portrait of a cartoon alien street fighter, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, intense fierce expression, mouth closed, strong prominent jaw, deep-set glowing eyes with vertical pupils, alien battle scars and markings across the face, thick alien brow ridges, visible hairstyle, detailed hair, dark gritty urban alley background with dim neon lights and smoke.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, soft features, cute, friendly, full body, screaming, open mouth, bald, shaved head, no hair, nature, bright background, blurry, low quality, ugly, deformed.",
    restylePrompt:
      "Transform this character into an alien street fighter. Keep the hair, facial structure, and skin color. Add a strong prominent alien jaw, deep-set glowing eyes with vertical pupils, alien battle scars and markings on the face, thick brow ridges. Change the background to a dark gritty urban alley with dim neon lights and smoke.",
  },

  navi: {
    label: "Navi",
    vibe: "Explorador espacial",
    emoji: "🚀",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} alien skin, close-up portrait of a cartoon alien space explorer, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm intelligent expression, mouth closed, smooth elongated head, large clear luminous eyes, subtle technological markings on temples, faint antenna-like sensory organs on forehead, visible hairstyle, detailed hair, outer space background with distant planets and star clusters.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, scary, aggressive, full body, screaming, open mouth, bald, shaved head, no hair, urban, dark alley, blurry, low quality, ugly, deformed.",
    restylePrompt:
      "Transform this character into an alien space explorer. Keep the hair, facial structure, and skin color. Add a smooth elongated head, large clear luminous eyes, subtle technological markings on the temples, faint antenna-like sensory organs on the forehead. Change the background to outer space with distant planets and star clusters.",
  },

  lisail: {
    label: "Lisail",
    vibe: "Inmortal / Oscuro",
    emoji: "🌑",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} alien skin, close-up portrait of a cartoon immortal alien, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, cold timeless expression, mouth closed, sharp elegant alien features, ageless smooth face, solid glowing silver eyes with no pupils, subtle ancient alien rune markings etched on skin, elongated neck, visible hairstyle, detailed hair, dark atmospheric background with ancient stone arches and ethereal mist.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, warm expression, friendly, young, full body, screaming, open mouth, bald, shaved head, no hair, bright background, cheerful, blurry, low quality, ugly, deformed.",
    restylePrompt:
      "Transform this character into an immortal alien. Keep the hair, facial structure, and skin color. Add sharp elegant alien features, solid glowing silver eyes with no pupils, subtle ancient alien rune markings etched into the skin, an elongated elegant neck. Change the background to a dark atmospheric scene with ancient stone arches and ethereal mist.",
  },

  homew: {
    label: "Homew",
    vibe: "Hip-hop / Artista urbano",
    emoji: "🎤",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} alien skin, close-up portrait of a cartoon urban artist alien, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, confident cool expression, mouth closed, rounded alien head with attitude, large stylized eyes with gold or neon iris, subtle holographic tattoo markings on neck, glowing alien jewelry accents near ears, visible hairstyle, detailed hair, vibrant neon music studio background with colorful lights and sound waves.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, scared, aggressive, full body, screaming, open mouth, bald, shaved head, no hair, nature, dark forest, blurry, low quality, ugly, deformed.",
    restylePrompt:
      "Transform this character into an urban artist alien. Keep the hair, facial structure, and skin color. Add large stylized eyes with a gold or neon iris, subtle holographic tattoo markings on the neck, glowing alien jewelry accents near the ears. Change the background to a vibrant neon music studio with colorful lights and sound waves.",
  },

  triloviti: {
    label: "Triloviti",
    vibe: "Ancestral / Tecnológico / Deportivo",
    emoji: "⚡",
    bald: true,
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} alien skin, close-up portrait of a cartoon ancient athletic alien, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, confident proud expression, mouth closed, completely bald perfectly smooth alien head, intricate ancient tribal markings combined with glowing tech circuit tattoos covering the entire scalp, strong defined athletic jaw, intense calm glowing eyes that command respect, absolutely no hair of any kind, visible powerful neck hinting elite athletic build, ancient alien colosseum with glowing technological ruins background.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, hair, hairstyle, any hair, wig, bangs, curls, stubble on head, full body, screaming, open mouth, blurry, low quality, ugly, deformed.",
    restylePrompt:
      "Transform this character into an ancient athletic alien of the Triloviti — the only hairless alien race, proud of their baldness like a badge of power. Remove ALL hair completely, make the head completely bald and perfectly smooth. Cover the entire scalp with intricate ancient tribal markings combined with glowing tech circuit tattoos. Add intense calm glowing eyes that command respect, a strong defined athletic jaw. Change the background to an ancient alien colosseum with glowing technological ruins.",
    // bald: true signals the generator to skip the hairstyle step and add hair removal to the prompt
  },
};
