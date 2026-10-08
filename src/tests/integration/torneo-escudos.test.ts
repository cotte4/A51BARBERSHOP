import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATALOGO_CLUBES,
  LIGAS,
  clubDelCatalogo,
  escudoDeEquipo,
  inicialesEquipo,
  nombresDelCatalogo,
  slugEquipo,
} from "@/lib/torneo-escudos";

const LOS_24 = [
  "Real Madrid", "Barcelona", "Atlético de Madrid", "Manchester City", "Liverpool", "Arsenal", "Chelsea",
  "Manchester United", "Tottenham", "Aston Villa", "Newcastle", "Bayern Múnich", "Borussia Dortmund",
  "Bayer Leverkusen", "PSG", "Inter", "Milan", "Juventus", "Napoli", "Roma", "Inter Miami", "Benfica",
  "Porto", "Ajax",
];

describe("catálogo de clubes", () => {
  it("son los 24 pedidos, sin repetidos, cada uno en una liga conocida", () => {
    expect(CATALOGO_CLUBES).toHaveLength(24);
    expect(new Set(CATALOGO_CLUBES.map((c) => c.nombre))).toEqual(new Set(LOS_24));
    expect(new Set(CATALOGO_CLUBES.map((c) => c.slug)).size).toBe(24);
    for (const club of CATALOGO_CLUBES) expect(LIGAS, club.nombre).toContain(club.liga);
  });

  it("cada club tiene su PNG en public/equipos y el slug de su nombre es el del archivo", () => {
    for (const club of CATALOGO_CLUBES) {
      expect(existsSync(path.join(process.cwd(), "public", "equipos", `${club.slug}.png`)), club.slug).toBe(true);
      expect(slugEquipo(club.nombre), club.nombre).toBe(club.slug);
    }
  });

  it("nombresDelCatalogo acepta slugs o nombres, descarta lo ajeno y no repite", () => {
    expect(nombresDelCatalogo(["juventus", "Real Madrid", "real-madrid", "Boca Juniors", "AC Milan", ""])).toEqual([
      "Real Madrid",
      "Milan",
      "Juventus",
    ]);
    expect(nombresDelCatalogo([])).toEqual([]);
  });

  it("clubDelCatalogo reconoce variantes comunes", () => {
    expect(clubDelCatalogo("Newcastle United")?.slug).toBe("newcastle");
    expect(clubDelCatalogo("Leverkusen")?.slug).toBe("bayer-leverkusen");
    expect(clubDelCatalogo("SSC Napoli")?.slug).toBe("napoli");
    expect(clubDelCatalogo("River Plate")).toBeUndefined();
  });
});

describe("slugEquipo", () => {
  it("saca acentos, mayúsculas y espacios", () => {
    expect(slugEquipo("Bayern Múnich")).toBe("bayern-munich");
    expect(slugEquipo("Atlético de Madrid")).toBe("atletico-de-madrid");
    expect(slugEquipo("  REAL   madrid ")).toBe("real-madrid");
  });

  it("une las variantes razonables del mismo club", () => {
    expect(slugEquipo("Bayern Munich")).toBe("bayern-munich");
    expect(slugEquipo("Paris Saint-Germain")).toBe("psg");
    expect(slugEquipo("PSG")).toBe("psg");
    expect(slugEquipo("Man City")).toBe("manchester-city");
    expect(slugEquipo("Atletico Madrid")).toBe("atletico-de-madrid");
    expect(slugEquipo("Inter Miami CF")).toBe("inter-miami");
    expect(slugEquipo("Inter de Milán")).toBe("inter");
  });
});

describe("escudoDeEquipo", () => {
  it("resuelve los 24 del catálogo a un PNG existente", () => {
    for (const equipo of LOS_24) {
      const ruta = escudoDeEquipo(equipo);
      expect(ruta, equipo).not.toBeNull();
      expect(existsSync(path.join(process.cwd(), "public", ruta!)), ruta!).toBe(true);
    }
  });

  it("devuelve null para un equipo sin archivo (cae al genérico)", () => {
    expect(escudoDeEquipo("Boca Juniors")).toBeNull();
    expect(escudoDeEquipo("Napoli")).toBe("/equipos/napoli.png");
    expect(escudoDeEquipo("")).toBeNull();
  });

  it("Inter y Inter Miami no se confunden", () => {
    expect(escudoDeEquipo("Inter")).toBe("/equipos/inter.png");
    expect(escudoDeEquipo("Inter Miami")).toBe("/equipos/inter-miami.png");
  });
});

describe("inicialesEquipo", () => {
  it("toma hasta 3 iniciales, o las 3 primeras letras si es una sola palabra", () => {
    expect(inicialesEquipo("Boca Juniors")).toBe("BJ");
    expect(inicialesEquipo("Napoli")).toBe("NAP");
    expect(inicialesEquipo("Club Atlético de San Martín")).toBe("CAS");
    expect(inicialesEquipo("")).toBe("?");
  });
});
