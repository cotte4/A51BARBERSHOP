// Sorteo ponderado: los "tochos" salen menos seguido. Puro: sin DB ni red.
import { describe, expect, it } from "vitest";
import { elegirEquipoPonderado, sortearTorneo } from "@/lib/torneo";
import {
  CATALOGO_CLUBES,
  PESO_NORMAL,
  PESO_TOCHO,
  PROBABILIDAD_TOCHO,
  TOCHOS,
  clubDelCatalogo,
  esTocho,
  pesoDeEquipoPorNombre,
  pesoTochoPara,
} from "@/lib/torneo-escudos";

const nombres = CATALOGO_CLUBES.map((c) => c.nombre);
const ids = (prefijo: string, n: number) => Array.from({ length: n }, (_, i) => `${prefijo}${i + 1}`);

describe("pesos de los tochos", () => {
  it("los tochos configurados existen en el catálogo con el nombre exacto", () => {
    expect(TOCHOS).toHaveLength(4);
    for (const t of TOCHOS) expect(CATALOGO_CLUBES.some((c) => c.nombre === t)).toBe(true);
    expect(TOCHOS).toEqual(expect.arrayContaining(["Bayern Múnich", "Real Madrid", "Barcelona", "PSG"]));
  });

  it("con el catálogo entero, cada tocho tiene PROBABILIDAD_TOCHO y los normales se reparten el resto", () => {
    const pesos = nombres.map(pesoDeEquipoPorNombre);
    const total = pesos.reduce((s, p) => s + p, 0);
    const probs = pesos.map((p) => p / total);
    expect(probs.reduce((s, p) => s + p, 0)).toBeCloseTo(1, 12);

    const cantidadTochos = nombres.filter(esTocho).length;
    expect(cantidadTochos).toBe(TOCHOS.length);
    nombres.forEach((n, i) => {
      if (esTocho(n)) expect(probs[i]).toBeCloseTo(PROBABILIDAD_TOCHO, 12);
      else expect(probs[i]).toBeCloseTo((1 - TOCHOS.length * PROBABILIDAD_TOCHO) / (24 - TOCHOS.length), 12);
    });
  });

  it("la fórmula: peso = p (N - T) / (1 - T p), con el normal en 1", () => {
    expect(PESO_NORMAL).toBe(1);
    expect(PESO_TOCHO).toBeCloseTo((0.015 * 20) / 0.94, 12);
    expect(pesoTochoPara(24, 4, 0.015)).toBe(PESO_TOCHO);
    expect(() => pesoTochoPara(24, 4, 0.25)).toThrow();
  });

  it("reconoce variantes del nombre y trata lo que no está en el catálogo como normal", () => {
    expect(esTocho("FC Barcelona")).toBe(true);
    expect(esTocho("Bayern")).toBe(true);
    expect(esTocho("Paris Saint-Germain")).toBe(true);
    expect(pesoDeEquipoPorNombre("Boca Juniors")).toBe(PESO_NORMAL);
    expect(clubDelCatalogo("Boca Juniors")).toBeUndefined();
    expect(pesoDeEquipoPorNombre("Liverpool")).toBe(PESO_NORMAL);
  });
});

describe("elegirEquipoPonderado", () => {
  it("elige según el peso: con azar en los bordes cae en el primero y en el último", () => {
    const peso = (id: string) => (id === "a" ? 1 : id === "b" ? 3 : 0);
    expect(elegirEquipoPonderado(["a", "b", "c"], peso, () => 0)).toBe("a");
    expect(elegirEquipoPonderado(["a", "b", "c"], peso, () => 0.24)).toBe("a");
    expect(elegirEquipoPonderado(["a", "b", "c"], peso, () => 0.25)).toBe("b");
    // el peso 0 nunca sale, ni siquiera con el azar más alto posible
    expect(elegirEquipoPonderado(["a", "b", "c"], peso, () => 0.9999999)).toBe("b");
  });

  it("rechaza lista vacía, pesos inválidos y todo en cero", () => {
    expect(() => elegirEquipoPonderado([], () => 1, () => 0.5)).toThrow();
    expect(() => elegirEquipoPonderado(["a"], () => -1, () => 0.5)).toThrow(/Peso inválido/);
    expect(() => elegirEquipoPonderado(["a"], () => Number.NaN, () => 0.5)).toThrow(/Peso inválido/);
    expect(() => elegirEquipoPonderado(["a", "b"], () => 0, () => 0.5)).toThrow(/peso 0/);
  });
});

describe("sortearTorneo con pesos", () => {
  const peso = pesoDeEquipoPorNombre;
  const porId = (equipos: readonly string[]) => (id: string) => peso(equipos[Number(id.slice(1)) - 1]);

  it("no repite equipos y todos salen del pool", () => {
    const equipoIds = ids("e", 24);
    for (let i = 0; i < 200; i++) {
      const r = sortearTorneo({
        jugadorIds: ids("j", 16),
        equipoIds,
        semilla: `unico-${i}`,
        pesoDeEquipo: porId(nombres),
      });
      const asignados = r.asignaciones.map((a) => a.equipoId);
      expect(new Set(asignados).size).toBe(16);
      expect(asignados.every((e) => equipoIds.includes(e))).toBe(true);
    }
  });

  it("misma semilla = mismo sorteo, con pesos", () => {
    const entrada = { jugadorIds: ids("j", 16), equipoIds: ids("e", 24), pesoDeEquipo: porId(nombres) };
    const a = sortearTorneo({ ...entrada, semilla: "2f:abc" });
    const b = sortearTorneo({ ...entrada, semilla: "2f:abc" });
    const c = sortearTorneo({ ...entrada, semilla: "2f:abd" });
    expect(b).toEqual(a);
    expect(c.asignaciones).not.toEqual(a.asignaciones);
  });

  it("sin pesos, todos los equipos valen lo mismo (se puede sortear con exactamente n equipos)", () => {
    const r = sortearTorneo({ jugadorIds: ids("j", 16), equipoIds: ids("e", 16), semilla: "parejo" });
    expect(new Set(r.asignaciones.map((a) => a.equipoId)).size).toBe(16);
  });

  it("un equipo con peso 0 no sale mientras haya otros", () => {
    const equipoIds = ids("e", 6);
    for (let i = 0; i < 100; i++) {
      const r = sortearTorneo({
        jugadorIds: ids("j", 5),
        equipoIds,
        semilla: `cero-${i}`,
        pesoDeEquipo: (id) => (id === "e1" ? 0 : 1),
      });
      expect(r.asignaciones.map((a) => a.equipoId)).not.toContain("e1");
    }
  });

  it("Monte Carlo, primer lugar: cada tocho ronda 1,5% y cada normal ~4,7%", () => {
    const equipoIds = ids("e", 24);
    const corridas = 20_000;
    const salidas = new Array<number>(24).fill(0);
    for (let i = 0; i < corridas; i++) {
      const r = sortearTorneo({
        jugadorIds: ["a", "b"],
        equipoIds,
        semilla: `mc-${i}`,
        pesoDeEquipo: porId(nombres),
      });
      // asignaciones[0] es el primer lugar del sorteo: un pick con los 24 equipos libres
      salidas[Number(r.asignaciones[0].equipoId.slice(1)) - 1]++;
    }
    nombres.forEach((n, i) => {
      const frecuencia = salidas[i] / corridas;
      if (esTocho(n)) {
        expect(frecuencia, n).toBeGreaterThan(0.008);
        expect(frecuencia, n).toBeLessThan(0.023);
      } else {
        expect(frecuencia, n).toBeGreaterThan(0.035);
        expect(frecuencia, n).toBeLessThan(0.06);
      }
    });
  });

  it("16 jugadores y 24 equipos: los tochos aparecen mucho menos que los normales", () => {
    const equipoIds = ids("e", 24);
    const corridas = 3_000;
    const apariciones = new Array<number>(24).fill(0);
    for (let i = 0; i < corridas; i++) {
      const r = sortearTorneo({
        jugadorIds: ids("j", 16),
        equipoIds,
        semilla: `mc16-${i}`,
        pesoDeEquipo: porId(nombres),
      });
      for (const a of r.asignaciones) apariciones[Number(a.equipoId.slice(1)) - 1]++;
    }
    const tasa = (soloTochos: boolean) => {
      const idx = nombres.map((n, i) => i).filter((i) => esTocho(nombres[i]) === soloTochos);
      return idx.reduce((s, i) => s + apariciones[i], 0) / idx.length / corridas;
    };
    // Parejo, cada equipo entraría en 16/24 = 66,7% de los torneos. Con pesos, como los lugares se
    // sortean sin reposición, un tocho igual entra en ~1 de cada 3 y un normal en ~3 de cada 4.
    expect(tasa(true)).toBeLessThan(0.45);
    expect(tasa(false)).toBeGreaterThan(0.65);
    expect(tasa(true) * 1.5).toBeLessThan(tasa(false));
  });
});
