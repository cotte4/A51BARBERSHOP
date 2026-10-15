// Ventana premium: cuándo se puede abrir. Puro: sin DB.
import { describe, expect, it } from "vitest";
import { momentoPremium, revealDesdePaso } from "@/lib/torneo";

// 16 jugadores, 8 cruces: pasos 0..16 son la ruleta; 17..24, los cruces.
const r = (paso: number) => revealDesdePaso(paso, 16, 8);

describe("momentoPremium", () => {
  it("durante la ruleta de equipos todavía no", () => {
    expect(momentoPremium(r(0), null)).toBe("todavia");
    expect(momentoPremium(r(15), null)).toBe("todavia");
  });

  it("con todos los equipos a la vista y ningún cruce, se puede abrir", () => {
    expect(momentoPremium(r(16), null)).toBe("disponible");
    // Cerrada sin haber mostrado cruces: se puede volver a abrir.
    expect(momentoPremium(r(16), "cerrada")).toBe("disponible");
  });

  it("abierta manda, y con un cruce a la vista ya pasó", () => {
    expect(momentoPremium(r(16), "abierta")).toBe("abierta");
    expect(momentoPremium(r(17), null)).toBe("paso");
    expect(momentoPremium(r(24), "cerrada")).toBe("paso");
  });
});
