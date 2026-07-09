import { beforeEach, describe, expect, it, vi } from "vitest";

const hasCajaCerradaMock = vi.fn<() => Promise<boolean>>();

vi.mock("@/lib/dal/caja", () => ({
  hasCajaCerrada: hasCajaCerradaMock,
}));

describe("closure-guard: mutation blocking on closed day", () => {
  beforeEach(() => {
    hasCajaCerradaMock.mockReset();
  });

  it("allows mutation when caja is open", async () => {
    hasCajaCerradaMock.mockResolvedValue(false);
    const { assertCajaAbiertaOrThrow } = await import("@/lib/finance/closure-guard");

    await expect(assertCajaAbiertaOrThrow("2026-05-05")).resolves.toBeUndefined();
  });

  it("blocks mutation when caja is closed", async () => {
    hasCajaCerradaMock.mockResolvedValue(true);
    const { assertCajaAbiertaOrThrow } = await import("@/lib/finance/closure-guard");

    await expect(assertCajaAbiertaOrThrow("2026-05-05")).rejects.toThrow(
      "La caja del dia ya fue cerrada."
    );
  });
});
