import { describe, expect, it } from "vitest";
import {
  assertAnulacionReversionAllowed,
  countMarcianoConsumicionesToRevert,
  hasRedeemedPendingCredits,
} from "@/lib/finance/anulacion-reversal";

describe("anulacion-reversal: transactional guardrails", () => {
  it("blocks annulment when at least one OVNIS pending credit was redeemed", () => {
    const credits = [{ redeemedAt: null }, { redeemedAt: new Date() }];

    expect(hasRedeemedPendingCredits(credits)).toBe(true);
    expect(() => assertAnulacionReversionAllowed(credits)).toThrow(
      "No se puede anular: esta atencion ya acreditó OVNIS canjeados por el cliente."
    );
  });

  it("allows annulment when all pending credits are not redeemed", () => {
    const credits = [{ redeemedAt: null }, { redeemedAt: null }];

    expect(hasRedeemedPendingCredits(credits)).toBe(false);
    expect(() => assertAnulacionReversionAllowed(credits)).not.toThrow();
  });

  it("counts only Marciano included consumiciones for reversal", () => {
    const total = countMarcianoConsumicionesToRevert([
      { cantidad: 2, esMarcianoIncluido: true },
      { cantidad: 1, esMarcianoIncluido: false },
      { cantidad: 3, esMarcianoIncluido: true },
    ]);

    expect(total).toBe(5);
  });
});
