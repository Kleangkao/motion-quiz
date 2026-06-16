import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getWallets } from '@wallet-standard/app';
import type { Wallet } from '@wallet-standard/base';
import {
  StandardConnect,
  StandardDisconnect,
  type StandardConnectFeature,
  type StandardDisconnectFeature,
} from '@wallet-standard/features';
import {
  SolanaSignMessage,
  type SolanaSignMessageFeature,
} from '@solana/wallet-standard-features';
import { ensureMwaRegistered } from './registerMwa';

interface PhantomLike {
  isPhantom?: boolean;
  publicKey?: { toBase58(): string };
  connect(): Promise<{ publicKey: { toBase58(): string } }>;
  signMessage(message: Uint8Array, display?: string): Promise<{ signature: Uint8Array }>;
  disconnect(): Promise<void>;
}

function getPhantom(): PhantomLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & { solana?: PhantomLike; phantom?: { solana?: PhantomLike } };
  return w.phantom?.solana ?? w.solana ?? null;
}

function pickSolanaWallet(wallets: readonly Wallet[]): Wallet | null {
  return (
    wallets.find((w) => w.chains.some((c) => c.startsWith('solana:'))) ??
    wallets[0] ??
    null
  );
}

interface WalletContextValue {
  address: string | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<Uint8Array>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [usePhantom, setUsePhantom] = useState(false);

  useEffect(() => {
    ensureMwaRegistered();
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const wallets = getWallets().get();
      const solWallet = pickSolanaWallet(wallets);
      if (solWallet) {
        const connectFeature = solWallet.features[StandardConnect] as StandardConnectFeature[typeof StandardConnect];
        const result = await connectFeature.connect({ silent: false });
        const account = result.accounts[0] ?? solWallet.accounts[0];
        if (!account) throw new Error('No wallet account returned');
        setWallet(solWallet);
        setUsePhantom(false);
        setAddress(account.address);
        return;
      }

      const phantom = getPhantom();
      if (phantom) {
        const res = await phantom.connect();
        setUsePhantom(true);
        setWallet(null);
        setAddress(res.publicKey.toBase58());
        return;
      }

      throw new Error('No Solana wallet found. Use a Seeker device or install a browser wallet for testing.');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      if (usePhantom) {
        await getPhantom()?.disconnect();
      } else if (wallet?.features[StandardDisconnect]) {
        const feat = wallet.features[StandardDisconnect] as StandardDisconnectFeature[typeof StandardDisconnect];
        await feat.disconnect();
      }
    } finally {
      setWallet(null);
      setUsePhantom(false);
      setAddress(null);
    }
  }, [wallet, usePhantom]);

  const signMessage = useCallback(
    async (message: string): Promise<Uint8Array> => {
      const bytes = new TextEncoder().encode(message);
      if (usePhantom) {
        const phantom = getPhantom();
        if (!phantom) throw new Error('Wallet disconnected');
        const { signature } = await phantom.signMessage(bytes, 'utf8');
        return signature;
      }
      if (!wallet) throw new Error('Connect a wallet first');
      const account = wallet.accounts[0];
      if (!account) throw new Error('No wallet account');
      const signFeature = wallet.features[SolanaSignMessage] as
        | SolanaSignMessageFeature[typeof SolanaSignMessage]
        | undefined;
      if (!signFeature) throw new Error('Wallet does not support message signing');
      const outputs = await signFeature.signMessage({ account, message: bytes });
      const sig = outputs[0]?.signature;
      if (!sig) throw new Error('Signing failed');
      return sig;
    },
    [wallet, usePhantom],
  );

  const value = useMemo(
    () => ({ address, connecting, error, connect, disconnect, signMessage }),
    [address, connecting, error, connect, disconnect, signMessage],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

export function shortenAddress(addr: string, chars = 4): string {
  return `${addr.slice(0, chars)}…${addr.slice(-chars)}`;
}
