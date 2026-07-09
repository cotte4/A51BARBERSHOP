import { describe, expect, it } from "vitest";
import { isAdminOrAsesorRole, isOwnerRole } from "@/lib/authz/roles";

describe("authz-owner-role: role matrix for sensitive mutations", () => {
  it("owner role is only admin", () => {
    expect(isOwnerRole("admin")).toBe(true);
    expect(isOwnerRole("asesor")).toBe(false);
    expect(isOwnerRole("barbero")).toBe(false);
    expect(isOwnerRole(undefined)).toBe(false);
  });

  it("admin-or-asesor matrix remains explicit", () => {
    expect(isAdminOrAsesorRole("admin")).toBe(true);
    expect(isAdminOrAsesorRole("asesor")).toBe(true);
    expect(isAdminOrAsesorRole("barbero")).toBe(false);
    expect(isAdminOrAsesorRole(undefined)).toBe(false);
  });
});
