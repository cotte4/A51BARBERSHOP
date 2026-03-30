export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let digits = raw.replace(/\D+/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("54")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.startsWith("9")) {
    digits = digits.slice(1);
  }

  return digits ? `54${digits}` : null;
}
