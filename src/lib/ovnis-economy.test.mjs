import assert from "node:assert/strict";

import { calculateOvnisLedgerTotals } from "./ovnis-economy.ts";

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

test("keeps pending redemptions in circulation until delivered", () => {
  const pending = calculateOvnisLedgerTotals([
    { amount: 111, type: "atencion" },
    { amount: -55, type: "redemption", redemptionStatus: "pending" },
  ]);

  assert.equal(pending.emittedTotal - pending.burnedTotal, 111);

  const delivered = calculateOvnisLedgerTotals([
    { amount: 111, type: "atencion" },
    { amount: -55, type: "redemption", redemptionStatus: "delivered" },
  ]);

  assert.equal(delivered.emittedTotal - delivered.burnedTotal, 56);
});

test("treats donations and normal bet settlements as internal transfers", () => {
  const totals = calculateOvnisLedgerTotals([
    { amount: 200, type: "welcome" },
    { amount: -20, type: "donation_sent" },
    { amount: 20, type: "donation_received" },
    { amount: -10, type: "bet_lock", betStatus: "accepted" },
    { amount: -10, type: "bet_lock", betStatus: "accepted" },
    { amount: 20, type: "bet_win", betStatus: "challenger_won" },
    { amount: -10, type: "bet_burn", betStatus: "challenger_won" },
  ]);

  assert.equal(totals.emittedTotal - totals.burnedTotal, 200);
});

test("counts abandoned or both-lost bets as burned OVNIS", () => {
  const totals = calculateOvnisLedgerTotals([
    { amount: 200, type: "welcome" },
    { amount: -10, type: "bet_lock", betStatus: "both_lost" },
    { amount: -10, type: "bet_lock", betStatus: "both_lost" },
    { amount: -10, type: "bet_burn", betStatus: "both_lost" },
    { amount: -10, type: "bet_burn", betStatus: "both_lost" },
  ]);

  assert.equal(totals.emittedTotal - totals.burnedTotal, 180);
});
