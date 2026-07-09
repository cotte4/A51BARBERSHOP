import { describe, expect, it } from "vitest";
import { resolveMarcianoCorteUsageDeltas } from "@/lib/finance/marciano-cortes";

describe("marciano-cortes-lifecycle: usage delta resolution", () => {
  it("create atención: Marciano client increments usage", () => {
    const deltas = resolveMarcianoCorteUsageDeltas({
      previousClientId: null,
      nextClientId: "client-marciano",
      previousIsMarciano: false,
      nextIsMarciano: true,
    });

    expect(deltas).toEqual([{ clientId: "client-marciano", delta: 1 }]);
  });

  it("anular atención: Marciano client decrements usage", () => {
    const deltas = resolveMarcianoCorteUsageDeltas({
      previousClientId: "client-marciano",
      nextClientId: null,
      previousIsMarciano: true,
      nextIsMarciano: false,
    });

    expect(deltas).toEqual([{ clientId: "client-marciano", delta: -1 }]);
  });

  it("editar atención: Marciano to non-Marciano removes one usage", () => {
    const deltas = resolveMarcianoCorteUsageDeltas({
      previousClientId: "client-marciano",
      nextClientId: "client-regular",
      previousIsMarciano: true,
      nextIsMarciano: false,
    });

    expect(deltas).toEqual([{ clientId: "client-marciano", delta: -1 }]);
  });

  it("editar atención: non-Marciano to Marciano adds one usage", () => {
    const deltas = resolveMarcianoCorteUsageDeltas({
      previousClientId: "client-regular",
      nextClientId: "client-marciano",
      previousIsMarciano: false,
      nextIsMarciano: true,
    });

    expect(deltas).toEqual([{ clientId: "client-marciano", delta: 1 }]);
  });

  it("editar atención: Marciano to same Marciano nets zero", () => {
    const deltas = resolveMarcianoCorteUsageDeltas({
      previousClientId: "client-marciano",
      nextClientId: "client-marciano",
      previousIsMarciano: true,
      nextIsMarciano: true,
    });

    const netDelta = deltas.reduce((acc, item) => acc + item.delta, 0);
    expect(netDelta).toBe(0);
  });
});
