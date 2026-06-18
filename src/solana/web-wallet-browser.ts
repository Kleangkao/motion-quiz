import { getWalletAddressString } from './walletAddress';

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
  signTransaction?(transaction: unknown): Promise<unknown>;
  signAndSendTransaction?(
    transaction: unknown,
    options?: { skipPreflight?: boolean; preflightCommitment?: string },
  ): Promise<{ signature: string | Uint8Array }>;
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
  const address =
    getWalletAddressString(result?.publicKey) ??
    getWalletAddressString(provider.publicKey) ??
    getWalletAddressString(result);
  if (!address) {
    throw new Error('Wallet connected but no address was returned.');
  }
  return address;
}

/** Reconnect only when the wallet extension already trusts this site. Never prompts for signatures. */
export async function tryAutoConnectBrowserWallet(id: BrowserWalletId): Promise<string | null> {
  const provider = getBrowserWalletProvider(id);
  if (!provider) return null;

  const existing = getWalletAddressString(provider.publicKey);
  if (existing) return existing;

  try {
    const connect = provider.connect as (
      options?: { onlyIfTrusted?: boolean },
    ) => Promise<{ publicKey?: PublicKeyLike | null }>;
    const result = await connect({ onlyIfTrusted: true });
    return (
      getWalletAddressString(result?.publicKey) ??
      getWalletAddressString(provider.publicKey)
    );
  } catch {
    return null;
  }
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

export function browserWalletSupportsTransactions(id: BrowserWalletId): boolean {
  const provider = getBrowserWalletProvider(id);
  if (!provider) return false;
  return (
    typeof provider.signAndSendTransaction === 'function' ||
    typeof provider.signTransaction === 'function'
  );
}

export async function signAndSendTransactionWithBrowserWallet(
  id: BrowserWalletId,
  transaction: unknown,
): Promise<string> {
  const provider = getBrowserWalletProvider(id);
  if (!provider) throw new Error('Wallet disconnected');

  if (typeof provider.signAndSendTransaction === 'function') {
    const result = await provider.signAndSendTransaction(transaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });
    return normalizeSignature(result.signature);
  }

  if (typeof provider.signTransaction === 'function') {
    throw new Error('This wallet must support signAndSendTransaction to record scores.');
  }

  throw new Error('This wallet cannot record scores yet.');
}

function normalizeSignature(signature: string | Uint8Array): string {
  if (typeof signature === 'string') return signature;
  return bs58Encode(signature);
}

function bs58Encode(bytes: Uint8Array): string {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;

  const size = ((bytes.length - zeros) * 138) / 100 + 1;
  const b58 = new Uint8Array(size);
  let length = 0;

  for (let i = zeros; i < bytes.length; i += 1) {
    let carry = bytes[i];
    let j = 0;
    for (let k = size - 1; (carry !== 0 || j < length) && k >= 0; k -= 1, j += 1) {
      carry += 256 * b58[k];
      b58[k] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    length = j;
  }

  let it = size - length;
  while (it < size && b58[it] === 0) it += 1;

  let str = '';
  for (let i = 0; i < zeros; i += 1) str += alphabet[0];
  for (let i = it; i < size; i += 1) str += alphabet[b58[i]];
  return str;
}
