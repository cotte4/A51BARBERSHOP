import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { escudoDeEquipo, inicialesEquipo, slugEquipo } from "@/lib/torneo-escudos";

// La lista que carga el panel por defecto (src/lib/torneo-data.ts): todos tienen que tener escudo.
const EQUIPOS_DEL_PANEL = [
  "Real Madrid", "Barcelona", "Atlético de Madrid", "Manchester City", "Liverpool", "Arsenal", "Chelsea",
  "Manchester United", "Tottenham", "Aston Villa", "Bayern Múnich", "Borussia Dortmund", "Inter",
  "Inter Miami", "Roma", "PSG",
];

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
  it("cada equipo del panel tiene su PNG en public/equipos", () => {
    for (const equipo of EQUIPOS_DEL_PANEL) {
      const ruta = escudoDeEquipo(equipo);
      expect(ruta, equipo).not.toBeNull();
      expect(existsSync(path.join(process.cwd(), "public", ruta!)), ruta!).toBe(true);
    }
  });

  it("devuelve null para un equipo sin archivo (cae al genérico)", () => {
    expect(escudoDeEquipo("Boca Juniors")).toBeNull();
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
