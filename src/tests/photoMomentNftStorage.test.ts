import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  getMostRecentPhotoMomentMintForSession,
  getPhotoMomentNftRecord,
  hasAnyPhotoMomentMintForSession,
  hasPhotoMomentMintForSession,
  savePhotoMomentNftRecord,
} from '@/storage/photoMomentNftStorage';

describe('photoMomentNftStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('saves and reads minted records', () => {
    savePhotoMomentNftRecord({
      sessionId: 'session-1',
      photoIndex: 0,
      walletAddress: 'wallet-a',
      packId: 'islanddao-challenge',
      cluster: 'devnet',
      mintAddress: 'Mint111111111111111111111111111111111111111',
      txSignature: 'tx-abc',
      metadataUri: 'https://example.com/meta.json',
      imageUri: 'https://example.com/image.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const record = getPhotoMomentNftRecord({
      cluster: 'devnet',
      walletAddress: 'wallet-a',
      sessionId: 'session-1',
      photoIndex: 0,
    });

    expect(record?.mintAddress).toContain('Mint');
    expect(record?.txSignature).toBe('tx-abc');
  });

  it('keeps devnet and mainnet-beta records separate', () => {
    savePhotoMomentNftRecord({
      sessionId: 'session-1',
      photoIndex: 0,
      walletAddress: 'wallet-a',
      packId: 'pack',
      cluster: 'devnet',
      mintAddress: 'MintDevnet1111111111111111111111111111111111',
      txSignature: 'tx-devnet',
      metadataUri: 'https://example.com/devnet.json',
      imageUri: 'https://example.com/devnet.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    savePhotoMomentNftRecord({
      sessionId: 'session-1',
      photoIndex: 0,
      walletAddress: 'wallet-a',
      packId: 'pack',
      cluster: 'mainnet-beta',
      mintAddress: 'MintMainnet111111111111111111111111111111111',
      txSignature: 'tx-mainnet',
      metadataUri: 'https://example.com/mainnet.json',
      imageUri: 'https://example.com/mainnet.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(
      getPhotoMomentNftRecord({
        cluster: 'devnet',
        walletAddress: 'wallet-a',
        sessionId: 'session-1',
        photoIndex: 0,
      })?.txSignature,
    ).toBe('tx-devnet');
    expect(
      getPhotoMomentNftRecord({
        cluster: 'mainnet-beta',
        walletAddress: 'wallet-a',
        sessionId: 'session-1',
        photoIndex: 0,
      })?.txSignature,
    ).toBe('tx-mainnet');
  });

  it('normalizes wallet address on save and read', () => {
    savePhotoMomentNftRecord({
      sessionId: 'session-1',
      photoIndex: 0,
      walletAddress: ' wallet-a ',
      packId: 'pack',
      cluster: 'devnet',
      mintAddress: 'Mint111111111111111111111111111111111111111',
      txSignature: 'tx-abc',
      metadataUri: 'https://example.com/meta.json',
      imageUri: 'https://example.com/image.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(
      getPhotoMomentNftRecord({
        cluster: 'devnet',
        walletAddress: 'wallet-a',
        sessionId: 'session-1',
        photoIndex: 0,
      })?.txSignature,
    ).toBe('tx-abc');
  });

  it('detects session mint without wallet address', () => {
    savePhotoMomentNftRecord({
      sessionId: 'session-1',
      photoIndex: 1,
      walletAddress: 'wallet-a',
      packId: 'pack',
      cluster: 'devnet',
      mintAddress: 'Mint111111111111111111111111111111111111111',
      txSignature: 'tx-abc',
      metadataUri: 'https://example.com/meta.json',
      imageUri: 'https://example.com/image.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(
      hasPhotoMomentMintForSession({
        cluster: 'devnet',
        sessionId: 'session-1',
        photoIndex: 1,
      }),
    ).toBe(true);
    expect(
      hasPhotoMomentMintForSession({
        cluster: 'devnet',
        sessionId: 'session-1',
        photoIndex: 0,
      }),
    ).toBe(false);
  });

  it('reports any session mint and returns most recent for wallet', () => {
    savePhotoMomentNftRecord({
      sessionId: 'session-1',
      photoIndex: 0,
      walletAddress: 'wallet-a',
      packId: 'pack',
      cluster: 'devnet',
      mintAddress: 'Mint111111111111111111111111111111111111111',
      txSignature: 'tx-old',
      metadataUri: 'https://example.com/old.json',
      imageUri: 'https://example.com/old.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    savePhotoMomentNftRecord({
      sessionId: 'session-1',
      photoIndex: 1,
      walletAddress: 'wallet-a',
      packId: 'pack',
      cluster: 'devnet',
      mintAddress: 'Mint222222222222222222222222222222222222222',
      txSignature: 'tx-new',
      metadataUri: 'https://example.com/new.json',
      imageUri: 'https://example.com/new.png',
      createdAt: '2026-06-17T12:00:00.000Z',
    });

    expect(hasAnyPhotoMomentMintForSession({ cluster: 'devnet', sessionId: 'session-1' })).toBe(
      true,
    );
    expect(
      getMostRecentPhotoMomentMintForSession({
        cluster: 'devnet',
        sessionId: 'session-1',
        walletAddress: 'wallet-a',
      })?.txSignature,
    ).toBe('tx-new');
  });
});
