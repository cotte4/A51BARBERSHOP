export const OVNIS_WELCOME_BONUS = 51;
export const BET_ACCEPTANCE_HOURS = 24;
export const BET_MAX_ACTIVE = 3;
export const PENDING_CREDIT_TTL_DAYS = 7;
export const BET_MAX_CLAIM_ATTEMPTS = 3;
export const BET_MIN_AMOUNT = 11;

export function formatOvnis(amount: number): string {
  return `${amount.toLocaleString("es-AR")} OVNIS`;
}

export type OvnisTransactionType =
  | "welcome"
  | "atencion"
  | "ruleta"
  | "redemption"
  | "redemption_refund"
  | "donation_sent"
  | "donation_received"
  | "bet_lock"
  | "bet_unlock"
  | "bet_win"
  | "bet_refund"
  | "bet_burn"
  | "admin_adjust";

export const PORTAL_OVNIS_PATH = "/marciano/ovnis";
export const PORTAL_RULETA_PATH = "/marciano/ruleta";
export const PORTAL_JUEGOS_PATH = "/marciano/juegos";
export const SCAN_PATH = (id: string) => `/marciano/ovnis/scan/${id}`;
