import type { OvnisTransactionType } from "@/lib/ovnis";

type LedgerStatus = string | null | undefined;

export type OvnisLedgerRow = {
  amount: number;
  type: OvnisTransactionType;
  redemptionStatus?: LedgerStatus;
  betStatus?: LedgerStatus;
};

export function classifyOvnisLedgerRow(row: OvnisLedgerRow): "emitted" | "burned" | "internal" {
  if (row.amount > 0) {
    if (row.type === "welcome" || row.type === "atencion" || row.type === "ruleta") {
      return "emitted";
    }

    if (row.type === "admin_adjust") {
      return "emitted";
    }

    return "internal";
  }

  if (row.amount < 0) {
    if (row.type === "admin_adjust") {
      return "burned";
    }

    if (row.type === "redemption" && row.redemptionStatus === "delivered") {
      return "burned";
    }

    if (
      row.type === "bet_burn" &&
      (row.betStatus === "both_lost" || row.betStatus === "stale_burned")
    ) {
      return "burned";
    }
  }

  return "internal";
}

export function calculateOvnisLedgerTotals(rows: OvnisLedgerRow[]): {
  emittedTotal: number;
  burnedTotal: number;
} {
  return rows.reduce(
    (totals, row) => {
      const classification = classifyOvnisLedgerRow(row);

      if (classification === "emitted") {
        totals.emittedTotal += row.amount;
      }

      if (classification === "burned") {
        totals.burnedTotal += Math.abs(row.amount);
      }

      return totals;
    },
    { emittedTotal: 0, burnedTotal: 0 }
  );
}
