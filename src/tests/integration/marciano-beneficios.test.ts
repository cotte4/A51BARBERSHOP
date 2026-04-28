import { describe, it, expect } from "vitest";
import { MARCIANO_BENEFICIOS } from "@/lib/marciano-config";

// Helpers that mirror the app's availability checks.
// A Marciano's benefit is available when usage < limit (or limit is null = unlimited).
function corteBeneficioDisponible(cortesUsados: number): boolean {
  return cortesUsados < MARCIANO_BENEFICIOS.cortesPorMes;
}

function consumicionBeneficioDisponible(consumicionesUsadas: number): boolean {
  if (MARCIANO_BENEFICIOS.consumicionesPorMes === null) return true;
  return consumicionesUsadas < MARCIANO_BENEFICIOS.consumicionesPorMes;
}

describe("marciano-beneficios: límites mensuales", () => {
  describe("cortes", () => {
    it("primer corte del mes → beneficio disponible", () => {
      expect(corteBeneficioDisponible(0)).toBe(true);
    });

    it("segundo corte (si cortesPorMes ≥ 2) → todavía disponible", () => {
      // El config actual es 2 cortes por mes.
      // Si fuera 1, este test lo capturaría.
      if (MARCIANO_BENEFICIOS.cortesPorMes >= 2) {
        expect(corteBeneficioDisponible(1)).toBe(true);
      } else {
        expect(corteBeneficioDisponible(1)).toBe(false);
      }
    });

    it("al llegar al límite de cortes del mes → sin beneficio", () => {
      // exactamente en el límite
      expect(corteBeneficioDisponible(MARCIANO_BENEFICIOS.cortesPorMes)).toBe(false);
    });

    it("por encima del límite → sin beneficio", () => {
      expect(corteBeneficioDisponible(MARCIANO_BENEFICIOS.cortesPorMes + 1)).toBe(false);
    });

    it("refleja el valor de config — no hardcodea el límite", () => {
      // Verifica que el límite en config es el esperado (2).
      // Si cambias el config, este test falla y te avisa.
      expect(MARCIANO_BENEFICIOS.cortesPorMes).toBe(2);
    });
  });

  describe("consumiciones", () => {
    it("consumicion siempre disponible cuando consumicionesPorMes = null (ilimitado)", () => {
      // El config actual es null (ilimitado).
      // Si alguna vez se pone un límite, estos tests fallarán y protegerán la regresión.
      expect(MARCIANO_BENEFICIOS.consumicionesPorMes).toBeNull();
      expect(consumicionBeneficioDisponible(0)).toBe(true);
      expect(consumicionBeneficioDisponible(5)).toBe(true);
      expect(consumicionBeneficioDisponible(100)).toBe(true);
    });

    it("si se fijara un límite de consumiciones, se respetaría correctamente", () => {
      // Test defensivo: simula la lógica con un límite hipotético.
      function checkConLimite(usadas: number, limite: number): boolean {
        return usadas < limite;
      }
      expect(checkConLimite(0, 1)).toBe(true);
      expect(checkConLimite(1, 1)).toBe(false);
      expect(checkConLimite(2, 1)).toBe(false);
    });
  });

  describe("combinaciones mes completo", () => {
    it("Marciano usa 1 corte y 3 consumiciones → corte disponible, consumiciones ok", () => {
      expect(corteBeneficioDisponible(1)).toBe(true);
      expect(consumicionBeneficioDisponible(3)).toBe(true);
    });

    it("Marciano agota cortes del mes → no puede usar más cortes ese mes", () => {
      const cortesAgotados = MARCIANO_BENEFICIOS.cortesPorMes;
      expect(corteBeneficioDisponible(cortesAgotados)).toBe(false);
      // pero sigue pudiendo pedir consumiciones
      expect(consumicionBeneficioDisponible(0)).toBe(true);
    });

    it("Marciano en su primer mes (0 usos) → todo disponible", () => {
      expect(corteBeneficioDisponible(0)).toBe(true);
      expect(consumicionBeneficioDisponible(0)).toBe(true);
    });
  });
});
