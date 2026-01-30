/**
 * Calculate new inventory after outbound operation with auto-unboxing
 * @returns null if not enough stock, otherwise new box/piece quantities
 */
export function calculateOutbound(
  currentBoxes: number,
  currentPcs: number,
  pcsPerBox: number,
  requestedBoxes: number,
  requestedPcs: number
): { newBoxes: number; newPcs: number } | null {
  // Convert everything to pieces for calculation
  const totalAvailable = currentBoxes * pcsPerBox + currentPcs;
  const totalRequested = requestedBoxes * pcsPerBox + requestedPcs;

  if (totalRequested > totalAvailable) {
    return null; // Not enough stock
  }

  const remaining = totalAvailable - totalRequested;
  const newBoxes = Math.floor(remaining / pcsPerBox);
  const newPcs = remaining % pcsPerBox;

  return { newBoxes, newPcs };
}

/**
 * Calculate total pieces from boxes and loose pieces
 */
export function calculateTotalPcs(
  boxes: number,
  pcs: number,
  pcsPerBox: number
): number {
  return boxes * pcsPerBox + pcs;
}

/**
 * Format stock display string
 */
export function formatStock(boxes: number, pcs: number): string {
  const parts: string[] = [];
  if (boxes > 0) parts.push(`${boxes} box${boxes > 1 ? 'es' : ''}`);
  if (pcs > 0) parts.push(`${pcs} pc${pcs > 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(' + ') : '0';
}
