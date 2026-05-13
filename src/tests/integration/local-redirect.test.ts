import { describe, expect, it } from "vitest";
import { sanitizeLocalRedirectPath } from "@/lib/local-redirect";

describe("sanitizeLocalRedirectPath", () => {
  it("keeps same-origin relative paths with query and hash", () => {
    expect(sanitizeLocalRedirectPath("/caja?ok=1#ticket", "/caja")).toBe("/caja?ok=1#ticket");
  });

  it("rejects absolute and protocol-relative URLs", () => {
    expect(sanitizeLocalRedirectPath("https://evil.example/phish", "/caja")).toBe("/caja");
    expect(sanitizeLocalRedirectPath("//evil.example/phish", "/caja")).toBe("/caja");
  });

  it("rejects non-path values", () => {
    expect(sanitizeLocalRedirectPath("caja", "/caja")).toBe("/caja");
    expect(sanitizeLocalRedirectPath(null, "/caja")).toBe("/caja");
  });
});
