import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  connectBrowserWallet,
  getPhantomProvider,
  getSolflareProvider,
  listBrowserWalletOptions,
  browserWalletSupportsTransactions,
  tryAutoConnectBrowserWallet,
} from '@/solana/web-wallet-browser';
import { isBrowserWalletMode } from '@/solana/platform';

describe('web-wallet-browser', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      phantom: undefined,
      solana: undefined,
      solflare: undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects Phantom when window.phantom.solana is present', () => {
    const phantom = { isPhantom: true, connect: vi.fn(), disconnect: vi.fn(), signMessage: vi.fn() };
    vi.stubGlobal('window', { phantom: { solana: phantom } });
    expect(getPhantomProvider()).toBe(phantom);
  });

  it('detects Solflare when window.solflare is present', () => {
    const solflare = { isSolflare: true, connect: vi.fn(), disconnect: vi.fn(), signMessage: vi.fn() };
    vi.stubGlobal('window', { solflare });
    expect(getSolflareProvider()).toBe(solflare);
  });

  it('lists install links when no wallets are installed', () => {
    const options = listBrowserWalletOptions();
    expect(options).toHaveLength(2);
    expect(options.every((o) => !o.installed)).toBe(true);
    expect(options.map((o) => o.id)).toEqual(['phantom', 'solflare']);
  });

  it('detects transaction support on injected browser wallets', () => {
    const phantom = {
      isPhantom: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signMessage: vi.fn(),
      signAndSendTransaction: vi.fn(),
    };
    vi.stubGlobal('window', { phantom: { solana: phantom } });
    expect(browserWalletSupportsTransactions('phantom')).toBe(true);
  });

  it('reports unsupported when browser wallet lacks transaction methods', () => {
    const phantom = {
      isPhantom: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signMessage: vi.fn(),
    };
    vi.stubGlobal('window', { phantom: { solana: phantom } });
    expect(browserWalletSupportsTransactions('phantom')).toBe(false);
  });

  it('connectBrowserWallet normalizes PublicKey-like connect results', async () => {
    const phantom = {
      isPhantom: true,
      connect: vi.fn().mockResolvedValue({
        publicKey: { toBase58: () => 'PhantomKey111111111111111111111111111' },
      }),
      disconnect: vi.fn(),
      signMessage: vi.fn(),
    };
    vi.stubGlobal('window', { phantom: { solana: phantom } });
    await expect(connectBrowserWallet('phantom')).resolves.toBe(
      'PhantomKey111111111111111111111111111',
    );
  });

  it('connectBrowserWallet falls back to provider.publicKey', async () => {
    const phantom = {
      isPhantom: true,
      publicKey: { toBase58: () => 'ProviderKey11111111111111111111111111' },
      connect: vi.fn().mockResolvedValue({}),
      disconnect: vi.fn(),
      signMessage: vi.fn(),
    };
    vi.stubGlobal('window', { phantom: { solana: phantom } });
    await expect(connectBrowserWallet('phantom')).resolves.toBe(
      'ProviderKey11111111111111111111111111',
    );
  });

  it('connectBrowserWallet rejects when no address is returned', async () => {
    const phantom = {
      isPhantom: true,
      connect: vi.fn().mockResolvedValue({}),
      disconnect: vi.fn(),
      signMessage: vi.fn(),
    };
    vi.stubGlobal('window', { phantom: { solana: phantom } });
    await expect(connectBrowserWallet('phantom')).rejects.toThrow(
      'Wallet connected but no address was returned.',
    );
  });

  it('tryAutoConnectBrowserWallet uses trusted reconnect without prompting', async () => {
    const connect = vi.fn().mockResolvedValue({
      publicKey: { toBase58: () => 'TrustedKey111111111111111111111111111' },
    });
    const phantom = {
      isPhantom: true,
      publicKey: null,
      connect,
      disconnect: vi.fn(),
      signMessage: vi.fn(),
    };
    vi.stubGlobal('window', { phantom: { solana: phantom } });
    await expect(tryAutoConnectBrowserWallet('phantom')).resolves.toBe(
      'TrustedKey111111111111111111111111111',
    );
    expect(connect).toHaveBeenCalledWith({ onlyIfTrusted: true });
  });

  it('tryAutoConnectBrowserWallet returns existing publicKey without connect', async () => {
    const connect = vi.fn();
    const phantom = {
      isPhantom: true,
      publicKey: { toBase58: () => 'ExistingKey11111111111111111111111111' },
      connect,
      disconnect: vi.fn(),
      signMessage: vi.fn(),
    };
    vi.stubGlobal('window', { phantom: { solana: phantom } });
    await expect(tryAutoConnectBrowserWallet('phantom')).resolves.toBe(
      'ExistingKey11111111111111111111111111',
    );
    expect(connect).not.toHaveBeenCalled();
  });
});

describe('platform', () => {
  it('treats desktop user agents as browser wallet mode', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' });
    expect(isBrowserWalletMode()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('treats Android user agents as MWA mode', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 14)' });
    expect(isBrowserWalletMode()).toBe(false);
    vi.unstubAllGlobals();
  });
});
