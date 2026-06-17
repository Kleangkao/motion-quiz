import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Transaction } from '@solana/web3.js';
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
import { isBrowserWalletMode } from './platform';
import { ensureMwaRegistered } from './registerMwa';
import {
  browserWalletLabel,
  connectBrowserWallet,
  disconnectBrowserWallet,
  signMessageWithBrowserWallet,
  type BrowserWalletId,
} from './web-wallet-browser';
import { friendlyWalletError } from './walletErrors';
import { getSolanaRpcUrl } from './env';
import { sendScoreReceiptTransaction, walletSupportsScoreRecording } from './scoreReceiptSender';
import { getWalletAddressString, shortenWalletAddress } from './walletAddress';
import { BrowserWalletPicker } from '@/components/wallet/BrowserWalletPicker';

function pickSolanaWallet(wallets: readonly Wallet[]): Wallet | null {
  return (
    wallets.find((w) => w.chains.some((c) => c.startsWith('solana:'))) ??
    wallets[0] ??
    null
  );
}

interface WalletContextValue {
  address: string | null;
  walletLabel: string | null;
  isBrowserWalletMode: boolean;
  connecting: boolean;
  error: string | null;
  supportsTransactions: boolean;
  pickerOpen: boolean;
  connect: (browserWallet?: BrowserWalletId) => Promise<void>;
  requestConnect: () => Promise<void>;
  closeWalletPicker: () => void;
  disconnect: () => Promise<void>;
  signMessage: (message: string) => Promise<Uint8Array>;
  sendTransaction: (transaction: Transaction) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const browserMode = isBrowserWalletMode();
  const [address, setAddress] = useState<string | null>(null);
  const [walletLabel, setWalletLabel] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [browserWalletId, setBrowserWalletId] = useState<BrowserWalletId | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    ensureMwaRegistered();
  }, []);

  const connect = useCallback(
    async (selectedBrowserWallet?: BrowserWalletId) => {
      setConnecting(true);
      setError(null);
      try {
        if (browserMode) {
          if (!selectedBrowserWallet) {
            throw new Error('Choose Phantom or Solflare to connect.');
          }
          const pubkey = await connectBrowserWallet(selectedBrowserWallet);
          setBrowserWalletId(selectedBrowserWallet);
          setWallet(null);
          setWalletLabel(browserWalletLabel(selectedBrowserWallet));
          setAddress(pubkey);
          return;
        }

        const wallets = getWallets().get();
        const solWallet = pickSolanaWallet(wallets);
        if (!solWallet) {
          throw new Error(
            'No Solana Mobile wallet found. Open this app on a Seeker device or supported Android browser.',
          );
        }
        const connectFeature = solWallet.features[StandardConnect] as StandardConnectFeature[typeof StandardConnect];
        const result = await connectFeature.connect({ silent: false });
        const account = result.accounts[0] ?? solWallet.accounts[0];
        if (!account) throw new Error('No wallet account returned');
        const accountAddress = getWalletAddressString(account);
        if (!accountAddress) throw new Error('Wallet connected but no address was returned.');
        setWallet(solWallet);
        setBrowserWalletId(null);
        setWalletLabel(solWallet.name);
        setAddress(accountAddress);
      } catch (e) {
        setError(friendlyWalletError(e));
        throw e;
      } finally {
        setConnecting(false);
      }
    },
    [browserMode],
  );

  const requestConnect = useCallback(async () => {
    if (browserMode) {
      setPickerOpen(true);
      return;
    }
    await connect();
  }, [browserMode, connect]);

  const closeWalletPicker = useCallback(() => {
    setPickerOpen(false);
  }, []);

  const handleBrowserPickerSelect = useCallback(
    async (id: BrowserWalletId) => {
      try {
        await connect(id);
        setPickerOpen(false);
      } catch {
        // surfaced via wallet context
      }
    },
    [connect],
  );

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      if (browserWalletId) {
        await disconnectBrowserWallet(browserWalletId);
      } else if (wallet?.features[StandardDisconnect]) {
        const feat = wallet.features[StandardDisconnect] as StandardDisconnectFeature[typeof StandardDisconnect];
        await feat.disconnect();
      }
    } finally {
      setWallet(null);
      setBrowserWalletId(null);
      setWalletLabel(null);
      setAddress(null);
    }
  }, [browserWalletId, wallet]);

  const signMessage = useCallback(
    async (message: string): Promise<Uint8Array> => {
      const bytes = new TextEncoder().encode(message);
      try {
        if (browserWalletId) {
          return await signMessageWithBrowserWallet(browserWalletId, bytes);
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
      } catch (e) {
        throw new Error(friendlyWalletError(e), { cause: e });
      }
    },
    [browserWalletId, wallet],
  );

  const supportsTransactions = useMemo(
    () => walletSupportsScoreRecording({ browserWalletId, wallet }),
    [browserWalletId, wallet],
  );

  const sendTransaction = useCallback(
    async (transaction: Transaction): Promise<string> => {
      return sendScoreReceiptTransaction(
        { browserWalletId, wallet },
        transaction,
        getSolanaRpcUrl(),
      );
    },
    [browserWalletId, wallet],
  );

  const value = useMemo(
    () => ({
      address,
      walletLabel,
      isBrowserWalletMode: browserMode,
      connecting,
      error,
      supportsTransactions,
      pickerOpen,
      connect,
      requestConnect,
      closeWalletPicker,
      disconnect,
      signMessage,
      sendTransaction,
    }),
    [
      address,
      walletLabel,
      browserMode,
      connecting,
      error,
      supportsTransactions,
      pickerOpen,
      connect,
      requestConnect,
      closeWalletPicker,
      disconnect,
      signMessage,
      sendTransaction,
    ],
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
      {browserMode && pickerOpen && (
        <BrowserWalletPicker
          open
          onClose={closeWalletPicker}
          onSelect={handleBrowserPickerSelect}
          connecting={connecting}
          error={error}
        />
      )}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

export function shortenAddress(addr: string | null | undefined, chars = 4): string {
  return shortenWalletAddress(addr, chars);
}
