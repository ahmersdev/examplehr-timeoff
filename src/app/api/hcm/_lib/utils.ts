export async function sleep(minMs: number, maxMs: number): Promise<void> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

export function roll(probability: number): boolean {
  return Math.random() < probability;
}

export function staleAvailable(actual: number): number {
  const offset = Math.random() < 0.5 ? -1 : 1;
  return Math.max(0, actual + offset);
}

export function balanceKey(
  employeeId: string,
  locationId: string,
  leaveType: string,
): string {
  return `${employeeId}:${locationId}:${leaveType}`;
}
