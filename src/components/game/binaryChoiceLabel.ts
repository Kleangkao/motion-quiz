/** SAFE / TRUE → green check; RISKY / FALSE → red X */
export type BinaryChoiceVariant = 'positive' | 'negative';

const POSITIVE_LABELS = new Set(['SAFE', 'TRUE']);
const NEGATIVE_LABELS = new Set(['RISKY', 'FALSE']);

export function getBinaryChoiceVariant(label: string): BinaryChoiceVariant | null {
  const key = label.trim().toUpperCase();
  if (POSITIVE_LABELS.has(key)) return 'positive';
  if (NEGATIVE_LABELS.has(key)) return 'negative';
  return null;
}
