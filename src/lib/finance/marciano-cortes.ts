export function resolveMarcianoCorteUsageDeltas(input: {
  previousClientId?: string | null;
  nextClientId?: string | null;
  previousIsMarciano: boolean;
  nextIsMarciano: boolean;
}) {
  const previousClientId = input.previousClientId ?? null;
  const nextClientId = input.nextClientId ?? null;

  const deltas: Array<{ clientId: string; delta: number }> = [];

  if (input.previousIsMarciano && previousClientId) {
    deltas.push({ clientId: previousClientId, delta: -1 });
  }

  if (input.nextIsMarciano && nextClientId) {
    deltas.push({ clientId: nextClientId, delta: 1 });
  }

  return deltas;
}
