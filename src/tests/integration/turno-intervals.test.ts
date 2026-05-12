import { describe, expect, it } from "vitest";
import { overlapsTurnoInterval } from "@/lib/turno-intervals";

describe("turno interval overlap checks", () => {
  it("blocks a slot that starts inside an existing longer turno", () => {
    expect(
      overlapsTurnoInterval("10:45", 45, [{ horaInicio: "10:00", duracionMinutos: 60 }])
    ).toBe(true);
  });

  it("allows a slot that starts exactly when the existing turno ends", () => {
    expect(
      overlapsTurnoInterval("11:00", 45, [{ horaInicio: "10:00", duracionMinutos: 60 }])
    ).toBe(false);
  });

  it("blocks a longer service that would run into an existing later turno", () => {
    expect(
      overlapsTurnoInterval("10:00", 60, [{ horaInicio: "10:45", duracionMinutos: 45 }])
    ).toBe(true);
  });
});
