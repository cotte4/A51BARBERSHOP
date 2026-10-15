// Sorteo con "tochos": los equipos fuertes salen con chance fija por giro. Puro: sin DB ni red.
import { describe, expect, it } from "vitest";
import { elegirEquipo, sortearTorneo, type ReglaTochos } from "@/lib/torneo";
import { CATALOGO_CLUBES, PROBABILIDAD_TOCHO, TOCHOS, esTocho } from "@/lib/torneo-escudos";

const nombres = CATALOGO_CLUBES.map((c) => c.nombre);
const ids = (prefijo: string, n: number) => Array.from({ length: n }, (_, i) => `${prefijo}${i + 1}`);
// En los tests el id del equipo es su nombre: la regla pregunta por nombre.
const regla: ReglaTochos = { esTocho, probabilidad: PROBABILIDAD_TOCHO };

/** Azar fijo para probar bordes: devuelve los valores en orden. */
function azarFijo(...valores: number[]): () => number {
  let i = 0;
  return () => valores[i++ % valores.length];
}

describe("configuración de los tochos", () => {
  it("son los cuatro que eligió Was, con el nombre exacto del catálogo", () => {
    expect([...TOCHOS].sort()).toEqual(["Barcelona", "Bayern Múnich", "PSG", "Real Madrid"]);
    for (const t of TOCHOS) expect(CATALOGO_CLUBES.some((c) => c.nombre === t)).toBe(true);
  });

  it("menos de 2% por giro", () => {
    expect(PROBABILIDAD_TOCHO).toBeGreaterThan(0);
    expect(PROBABILIDAD_TOCHO).toBeLessThan(0.02);
  });

  it("reconoce variantes del nombre y lo que no está en el catálogo es normal", () => {
    expect(esTocho("FC Barcelona")).toBe(true);
    expect(esTocho("Real Madrid")).toBe(true);
    expect(esTocho("Aston Villa")).toBe(false);
    expect(esTocho("Club Inventado")).toBe(false);
  });
});

describe("elegirEquipo", () => {
  it("sin regla, todos parejos (azar en los bordes = primero y último)", () => {
    expect(elegirEquipo(["a", "b", "c"], azarFijo(0))).toBe("a");
    expect(elegirEquipo(["a", "b", "c"], azarFijo(0.9999))).toBe("c");
  });

  it("con azar por debajo de la chance sale un tocho; por encima, un normal", () => {
    const libres = ["Real Madrid", "Aston Villa", "Ajax"];
    expect(esTocho(elegirEquipo(libres, azarFijo(0.01, 0), regla))).toBe(true);
    expect(esTocho(elegirEquipo(libres, azarFijo(0.5, 0), regla))).toBe(false);
  });

  it("si no quedan normales, salen los tochos", () => {
    expect(esTocho(elegirEquipo(["PSG", "Barcelona"], azarFijo(0.99), regla))).toBe(true);
  });

  it("rechaza la lista vacía", () => {
    expect(() => elegirEquipo([], azarFijo(0.5), regla)).toThrow();
  });

  it("Monte Carlo: cada tocho ronda 1,5% por giro, aunque queden pocos normales", () => {
    let azarSeed = 12345;
    const azar = () => {
      azarSeed = (azarSeed * 1103515245 + 12345) % 2 ** 31;
      return azarSeed / 2 ** 31;
    };
    const vueltas = 40_000;
    // Pocos normales libres: con pesos simples el tocho subiría mucho; con la regla, no.
    const libres = [...TOCHOS, "Aston Villa", "Ajax"];
    const cuenta = new Map<string, number>();
    for (let i = 0; i < vueltas; i++) {
      const e = elegirEquipo(libres, azar, regla);
      cuenta.set(e, (cuenta.get(e) ?? 0) + 1);
    }
    for (const t of TOCHOS) {
      const p = (cuenta.get(t) ?? 0) / vueltas;
      expect(p).toBeGreaterThan(0.009);
      expect(p).toBeLessThan(0.021);
    }
  });
});

describe("sortearTorneo con tochos", () => {
  const jugadores = ids("j", 16);

  it("no repite equipos, todos salen del pool y misma semilla = mismo sorteo", () => {
    for (let s = 0; s < 100; s++) {
      const r = sortearTorneo({ jugadorIds: jugadores, equipoIds: nombres, semilla: `s${s}`, tochos: regla });
      const equipos = r.asignaciones.map((a) => a.equipoId);
      expect(new Set(equipos).size).toBe(16);
      for (const e of equipos) expect(nombres).toContain(e);
    }
    const a = sortearTorneo({ jugadorIds: jugadores, equipoIds: nombres, semilla: "igual", tochos: regla });
    const b = sortearTorneo({ jugadorIds: jugadores, equipoIds: nombres, semilla: "igual", tochos: regla });
    expect(a).toEqual(b);
  });

  it("16 jugadores con 20 o 24 equipos: sale un tocho o ninguno, casi nunca más", () => {
    const sinTochos = nombres.filter((n) => !esTocho(n));
    for (const pool of [nombres, [...TOCHOS, ...sinTochos.slice(0, 16)]]) {
      const torneos = 3_000;
      let total = 0;
      let ninguno = 0;
      let tresOMas = 0;
      for (let s = 0; s < torneos; s++) {
        const r = sortearTorneo({ jugadorIds: jugadores, equipoIds: pool, semilla: `t${pool.length}-${s}`, tochos: regla });
        const n = r.asignaciones.filter((x) => esTocho(x.equipoId)).length;
        total += n;
        if (n === 0) ninguno++;
        if (n >= 3) tresOMas++;
      }
      // 16 giros x ~6%: en promedio ~0,9 tochos por torneo; ~37% sin ninguno.
      expect(total / torneos).toBeGreaterThan(0.6);
      expect(total / torneos).toBeLessThan(1.2);
      expect(ninguno / torneos).toBeGreaterThan(0.28);
      expect(tresOMas / torneos).toBeLessThan(0.12);
    }
  }, 30_000);

  it("sin regla, todos parejos (se puede sortear con exactamente n equipos)", () => {
    const r = sortearTorneo({ jugadorIds: jugadores, equipoIds: ids("e", 16), semilla: "x" });
    expect(new Set(r.asignaciones.map((a) => a.equipoId)).size).toBe(16);
  });
});
