// Reglas del horario semanal (planning/features/horario-semanal-barbero.md).
// Protege: que haya turnos para reservar y que nunca se den dos turnos encimados.
import { describe, expect, it } from "vitest";
import { calcularTurnosLibres, leerHorarioId, rangosDelDia, sumarDias } from "@/lib/horario";

// Martes 2026-10-20 · miércoles 21 · domingo 25.
const PINKY = [2, 3, 4, 5, 6].map((diaSemana) => ({ diaSemana, desde: "10:00:00", hasta: "19:00:00" }));

describe("rangosDelDia", () => {
  it("usa el horario semanal del día y no trabaja los días que no tiene cargados", () => {
    expect(rangosDelDia({ fecha: "2026-10-20", semanal: PINKY, especiales: [] })).toEqual([
      { desde: "10:00", hasta: "19:00" },
    ]);
    expect(rangosDelDia({ fecha: "2026-10-25", semanal: PINKY, especiales: [] })).toEqual([]);
  });

  it("un día especial del barbero pisa al semanal (cerrado u otro horario)", () => {
    const vacaciones = [{ barberoId: "p", cerrado: true, desde: null, hasta: null }];
    expect(rangosDelDia({ fecha: "2026-10-21", semanal: PINKY, especiales: vacaciones })).toEqual([]);

    const corto = [{ barberoId: "p", cerrado: false, desde: "10:00", hasta: "13:00" }];
    expect(rangosDelDia({ fecha: "2026-10-21", semanal: PINKY, especiales: corto })).toEqual([
      { desde: "10:00", hasta: "13:00" },
    ]);
  });

  it("un feriado del local cierra a todos aunque el barbero tenga otro horario ese día", () => {
    const especiales = [
      { barberoId: null, cerrado: true, desde: null, hasta: null },
      { barberoId: "p", cerrado: false, desde: "10:00", hasta: "13:00" },
    ];
    expect(rangosDelDia({ fecha: "2026-10-21", semanal: PINKY, especiales })).toEqual([]);
  });
});

describe("calcularTurnosLibres", () => {
  const dia = [{ desde: "10:00", hasta: "12:00" }];

  it("ofrece arranques cada 30 min y no deja que el servicio se pase del cierre", () => {
    expect(calcularTurnosLibres({ rangos: dia, tomados: [], duracionMinutos: 60 })).toEqual([
      "10:00",
      "10:30",
      "11:00",
    ]);
  });

  it("un turno de 60 min a las 11:00 bloquea también las 11:30 (bug de la disponibilidad vieja)", () => {
    const libres = calcularTurnosLibres({
      rangos: [{ desde: "10:00", hasta: "13:00" }],
      tomados: [{ horaInicio: "11:00:00", duracionMinutos: 60 }],
      duracionMinutos: 30,
    });
    expect(libres).toEqual(["10:00", "10:30", "12:00", "12:30"]);
  });

  it("un servicio de 60 no se ofrece si se pisa con el turno siguiente", () => {
    const libres = calcularTurnosLibres({
      rangos: dia,
      tomados: [{ horaInicio: "11:00", duracionMinutos: 30 }],
      duracionMinutos: 60,
    });
    expect(libres).toEqual(["10:00"]);
  });

  it("respeta el corte de mediodía (dos rangos) y la hora actual", () => {
    const libres = calcularTurnosLibres({
      rangos: [
        { desde: "10:00", hasta: "11:00" },
        { desde: "15:00", hasta: "16:00" },
      ],
      tomados: [],
      duracionMinutos: 30,
      noAntesDe: 10 * 60 + 15,
    });
    expect(libres).toEqual(["10:30", "15:00", "15:30"]);
  });
});

describe("ids y fechas", () => {
  it("lee el id fecha|hora y rechaza cualquier otra cosa", () => {
    expect(leerHorarioId("2026-10-21|11:30")).toEqual({ fecha: "2026-10-21", hora: "11:30" });
    expect(leerHorarioId("0f8b1c1e-0000-4000-8000-000000000000")).toBeNull();
  });

  it("suma días cruzando de mes", () => {
    expect(sumarDias("2026-10-30", 3)).toBe("2026-11-02");
  });
});
