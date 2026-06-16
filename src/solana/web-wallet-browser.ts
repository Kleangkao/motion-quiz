export type BrowserWalletId = 'phantom' | 'solflare';

export interface BrowserWalletOption {
  id: BrowserWalletId;
  name: string;
  installUrl: string;
  installed: boolean;
}

interface PublicKeyLike {
  toBase58(): string;
}

interface InjectedSolanaWallet {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: PublicKeyLike | null;
  connect(): Promise<{ publicKey: PublicKeyLike }>;
  disconnect(): Promise<void>;
  signMessage(
    message: Uint8Array,
    display?: string,
  ): Promise<{ signature: Uint8Array }>;
}

type WindowWithInjectedWallets = Window & {
  phantom?: { solana?: InjectedSolanaWallet };
  solana?: InjectedSolanaWallet;
  solflare?: InjectedSolanaWallet;
};

const BROWSER_WALLETS: Record<
  BrowserWalletId,
  { name: string; installUrl: string }
> = {
  phantom: {
    name: 'Phantom',
    installUrl: 'https://phantom.app/download',
  },
  solflare: {
    name: 'Solflare',
    installUrl: 'https://solflare.com/download',
  },
};

function getWindow(): WindowWithInjectedWallets | null {
  return typeof window !== 'undefined' ? window : null;
}

/** Phantom via window.phantom.solana or window.solana when marked as Phantom */
export function getPhantomProvider(): InjectedSolanaWallet | null {
  const win = getWindow();
  if (!win) return null;
  const fromPhantom = win.phantom?.solana;
  if (fromPhantom?.isPhantom) return fromPhantom;
  if (win.solana?.isPhantom) return win.solana;
  return null;
}

/** Solflare via window.solflare */
export function getSolflareProvider(): InjectedSolanaWallet | null {
  const win = getWindow();
  if (!win?.solflare?.isSolflare) return null;
  return win.solflare;
}

export function getBrowserWalletProvider(
  id: BrowserWalletId,
): InjectedSolanaWallet | null {
  return id === 'phantom' ? getPhantomProvider() : getSolflareProvider();
}

export function listBrowserWalletOptions(): BrowserWalletOption[] {
  return (Object.keys(BROWSER_WALLETS) as BrowserWalletId[]).map((id) => ({
    id,
    name: BROWSER_WALLETS[id].name,
    installUrl: BROWSER_WALLETS[id].installUrl,
    installed: getBrowserWalletProvider(id) != null,
  }));
}

export async function connectBrowserWallet(id: BrowserWalletId): Promise<string> {
  const provider = getBrowserWalletProvider(id);
  if (!provider) {
    throw new Error(`${BROWSER_WALLETS[id].name} is not installed in this browser.`);
  }
  const result = await provider.connect();
  return result.publicKey.toBase58();
}

export async function disconnectBrowserWallet(id: BrowserWalletId): Promise<void> {
  const provider = getBrowserWalletProvider(id);
  if (provider) await provider.disconnect();
}

export async function signMessageWithBrowserWallet(
  id: BrowserWalletId,
  message: Uint8Array,
): Promise<Uint8Array> {
  const provider = getBrowserWalletProvider(id);
  if (!provider) throw new Error('Wallet disconnected');
  const { signature } = await provider.signMessage(message, 'utf8');
  return signature;
}

export function browserWalletLabel(id: BrowserWalletId): string {
  return BROWSER_WALLETS[id].name;
}
