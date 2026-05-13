import { describe, expect, it } from "vitest";
import {
  filterAvailableSlotsForTurnos,
  hasOverlappingTurno,
  isAvailabilityCovered,
} from "@/lib/turno-availability";

const slots = [
  { id: "10", horaInicio: "10:00", duracionMinutos: 45 },
  { id: "1045", horaInicio: "10:45", duracionMinutos: 45 },
  { id: "1130", horaInicio: "11:30", duracionMinutos: 45 },
];

describe("turno availability interval checks", () => {
  it("removes slots whose requested service would overlap an existing longer turno", () => {
    const disponibles = filterAvailableSlotsForTurnos(
      slots,
      [{ horaInicio: "10:00", duracionMinutos: 60 }],
      45
    );

    expect(disponibles.map((slot) => slot.horaInicio)).toEqual(["11:30"]);
  });

  it("allows a longer service only when consecutive availability covers the duration", () => {
    expect(isAvailabilityCovered("10:00", 60, slots)).toBe(true);
    expect(isAvailabilityCovered("11:30", 60, slots)).toBe(false);
  });

  it("detects overlaps even when start times are different", () => {
    expect(
      hasOverlappingTurno("10:45", 45, [{ horaInicio: "10:00", duracionMinutos: 60 }])
    ).toBe(true);
    expect(
      hasOverlappingTurno("11:30", 45, [{ horaInicio: "10:00", duracionMinutos: 60 }])
    ).toBe(false);
  });
});
