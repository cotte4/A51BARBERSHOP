export function isAdminOrAsesorRole(role: string | undefined): role is "admin" | "asesor" {
  return role === "admin" || role === "asesor";
}

export function isOwnerRole(role: string | undefined): role is "admin" {
  return role === "admin";
}
