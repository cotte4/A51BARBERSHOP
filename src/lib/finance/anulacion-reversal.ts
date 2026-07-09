export type PendingCreditState = {
  redeemedAt: Date | null;
};

export type AtencionProductoState = {
  cantidad: number | null;
  esMarcianoIncluido: boolean;
};

export function hasRedeemedPendingCredits(credits: PendingCreditState[]): boolean {
  return credits.some((credit) => credit.redeemedAt !== null);
}

export function assertAnulacionReversionAllowed(credits: PendingCreditState[]): void {
  if (hasRedeemedPendingCredits(credits)) {
    throw new Error(
      "No se puede anular: esta atencion ya acreditó OVNIS canjeados por el cliente."
    );
  }
}

export function countMarcianoConsumicionesToRevert(
  productosPrevios: AtencionProductoState[]
): number {
  return productosPrevios.reduce((total, item) => {
    if (!item.esMarcianoIncluido) {
      return total;
    }
    return total + (item.cantidad ?? 0);
  }, 0);
}
