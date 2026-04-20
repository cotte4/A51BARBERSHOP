import assert from "node:assert/strict";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const { canManageCajaBarbero } = await import("../src/lib/dal/caja");
  const { canManageTurnoForBarbero } = await import("../src/lib/dal/turnos");

  const adminCajaActor = {
    userId: "admin-user",
    role: "admin",
    isAdmin: true,
  };

  const barberoCajaActor = {
    userId: "barbero-user",
    role: "barbero",
    isAdmin: false,
    barberoId: "barbero-1",
  };

  const unlinkedCajaActor = {
    userId: "unlinked-user",
    role: "barbero",
    isAdmin: false,
  };

  assert.equal(canManageCajaBarbero(adminCajaActor, "barbero-2"), true);
  assert.equal(canManageCajaBarbero(barberoCajaActor, "barbero-1"), true);
  assert.equal(canManageCajaBarbero(barberoCajaActor, "barbero-2"), false);
  assert.equal(canManageCajaBarbero(unlinkedCajaActor, "barbero-1"), false);
  assert.equal(canManageCajaBarbero(unlinkedCajaActor, null), false);

  assert.equal(
    canManageTurnoForBarbero(
      { userId: "admin-user", isAdmin: true, barberoId: null },
      "barbero-2"
    ),
    true
  );
  assert.equal(
    canManageTurnoForBarbero(
      { userId: "barbero-user", isAdmin: false, barberoId: "barbero-1" },
      "barbero-1"
    ),
    true
  );
  assert.equal(
    canManageTurnoForBarbero(
      { userId: "barbero-user", isAdmin: false, barberoId: "barbero-1" },
      "barbero-2"
    ),
    false
  );

  console.log("DAL access predicates passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
