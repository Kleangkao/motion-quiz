import { describe, it, expect } from 'vitest';
import { getBinaryChoiceVariant } from '@/components/game/binaryChoiceLabel';

describe('getBinaryChoiceVariant', () => {
  it('maps SAFE and TRUE to positive', () => {
    expect(getBinaryChoiceVariant('SAFE')).toBe('positive');
    expect(getBinaryChoiceVariant('true')).toBe('positive');
  });

  it('maps RISKY and FALSE to negative', () => {
    expect(getBinaryChoiceVariant('RISKY')).toBe('negative');
    expect(getBinaryChoiceVariant('false')).toBe('negative');
  });

  it('returns null for regular choice labels', () => {
    expect(getBinaryChoiceVariant('Mobile Wallet Adapter')).toBeNull();
  });
});
