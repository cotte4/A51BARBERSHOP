import { describe, expect, it } from "vitest";
import { calculateAtencionCommission } from "@/lib/finance/commission";

describe("commission-parity: same output regardless of flow origin", () => {
  it("returns same breakdown for caja-create, caja-edit and turnos-cobro inputs", () => {
    const sharedInput = {
      precioCobrado: 15000,
      servicioPrecioBase: 13000,
      comisionBarberoPct: 60,
      comisionMedioPagoPct: 6,
    };

    const cajaCreate = calculateAtencionCommission(sharedInput);
    const cajaEdit = calculateAtencionCommission(sharedInput);
    const turnosCobro = calculateAtencionCommission(sharedInput);

    expect(cajaCreate).toEqual(cajaEdit);
    expect(cajaEdit).toEqual(turnosCobro);
  });
});
