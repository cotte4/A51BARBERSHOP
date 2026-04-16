export const ASSET_CATEGORIAS = [
  "Mobiliario",
  "Equipamiento",
  "Iluminación",
  "Herramientas",
  "Tecnología",
  "Otros",
] as const;

export type AssetCategoria = (typeof ASSET_CATEGORIAS)[number];
