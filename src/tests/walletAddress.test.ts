import { describe, expect, it } from 'vitest';
import {
  getWalletAddressString,
  shortenWalletAddress,
  walletAccountAddress,
} from '@/solana/walletAddress';

describe('walletAddress', () => {
  it('returns null for undefined and null without throwing', () => {
    expect(getWalletAddressString(undefined)).toBeNull();
    expect(getWalletAddressString(null)).toBeNull();
  });

  it('normalizes non-empty strings', () => {
    expect(getWalletAddressString(' 7nYb…abc ')).toBe('7nYb…abc');
    expect(getWalletAddressString('')).toBeNull();
    expect(getWalletAddressString('   ')).toBeNull();
  });

  it('reads PublicKey-like objects with toBase58()', () => {
    expect(
      getWalletAddressString({
        toBase58: () => 'So11111111111111111111111111111111111111112',
      }),
    ).toBe('So11111111111111111111111111111111111111112');
  });

  it('does not throw when toBase58 throws', () => {
    expect(
      getWalletAddressString({
        toBase58: () => {
          throw new Error('boom');
        },
      }),
    ).toBeNull();
  });

  it('reads nested publicKey and wallet-standard address fields', () => {
    expect(
      getWalletAddressString({
        publicKey: { toBase58: () => 'NestedKey1111111111111111111111111111' },
      }),
    ).toBe('NestedKey1111111111111111111111111111');

    expect(getWalletAddressString({ address: 'WalletStandardAddress111111111111' })).toBe(
      'WalletStandardAddress111111111111',
    );
  });

  it('shortens addresses safely', () => {
    expect(shortenWalletAddress(undefined)).toBe('—');
    expect(shortenWalletAddress('abc')).toBe('abc');
    expect(shortenWalletAddress('12345678901234567890', 4)).toBe('1234…7890');
  });

  it('reads wallet-standard account address', () => {
    expect(walletAccountAddress({ address: 'Acct1111111111111111111111111111111' })).toBe(
      'Acct1111111111111111111111111111111',
    );
    expect(walletAccountAddress(undefined)).toBeNull();
  });
});
