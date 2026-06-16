import { useState } from 'react';
import { useWallet, shortenAddress } from '@/solana/WalletProvider';
import { buildScoreProofMessage, encodeScoreProof } from '@/solana/scoreProof';
import { updateResultSession } from '@/storage/resultStorage';
import { BrowserWalletPicker } from '@/components/wallet/BrowserWalletPicker';
import type { BrowserWalletId } from '@/solana/web-wallet-browser';
import type { ResultSession } from '@/storage/types';

interface Props {
  session: ResultSession;
  onUpdated: (session: ResultSession) => void;
}

export function ScoreProofPanel({ session, onUpdated }: Props) {
  const {
    address,
    walletLabel,
    isBrowserWalletMode,
    connecting,
    error,
    connect,
    disconnect,
    signMessage,
  } = useWallet();
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const proof = session.scoreProof;
  const linkedAddress = session.walletAddress ?? address;

  const handleBrowserConnect = async (id: BrowserWalletId) => {
    try {
      await connect(id);
    } catch {
      // error surfaced via wallet context
    }
  };

  const handleMwaConnect = async () => {
    try {
      await connect();
    } catch {
      // error surfaced via wallet context
    }
  };

  const handleSign = async () => {
    if (!address) {
      if (isBrowserWalletMode) return;
      await handleMwaConnect();
      return;
    }
    setSigning(true);
    setSignError(null);
    try {
      const message = buildScoreProofMessage({ ...session, walletAddress: address });
      const signature = await signMessage(message);
      const scoreProof = encodeScoreProof(message, signature, address);
      await updateResultSession(session.id, {
        walletAddress: address,
        scoreProof,
      });
      onUpdated({ ...session, walletAddress: address, scoreProof });
    } catch (e) {
      setSignError(e instanceof Error ? e.message : String(e));
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <div>
        <h3 className="font-bold text-white">Wallet & Score Proof</h3>
        <p className="text-xs text-white/50 mt-1">
          Optional. Connect your Solana wallet and sign a message to prove your score. This does not
          spend tokens, move funds, or send an on-chain transaction.
        </p>
      </div>

      {proof ? (
        <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-4 space-y-2">
          <p className="text-green-400 font-semibold text-sm">✓ Signed Score Proof</p>
          <p className="text-xs text-white/50 break-all font-mono">{proof.signatureBase58.slice(0, 48)}…</p>
          <p className="text-xs text-white/40">
            Wallet {shortenAddress(proof.walletAddress, 6)} · {new Date(proof.signedAt).toLocaleString()}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {linkedAddress && walletLabel ? (
            <p className="text-sm text-white/70">
              Connected via {walletLabel}:{' '}
              <span className="font-mono text-indigo-300">{shortenAddress(linkedAddress, 4)}</span>
            </p>
          ) : linkedAddress ? (
            <p className="text-sm text-white/70">
              Connected: <span className="font-mono text-indigo-300">{shortenAddress(linkedAddress, 6)}</span>
            </p>
          ) : isBrowserWalletMode ? (
            <BrowserWalletPicker
              onSelect={handleBrowserConnect}
              connecting={connecting}
              error={error}
            />
          ) : (
            <button onClick={handleMwaConnect} disabled={connecting} className="btn btn-secondary btn-md w-full">
              {connecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}

          {isBrowserWalletMode && !address && (
            <p className="text-xs text-white/45 text-center">
              Choose Phantom or Solflare before signing.
            </p>
          )}

          <button
            onClick={handleSign}
            disabled={signing || connecting || (isBrowserWalletMode && !address)}
            className="btn btn-primary btn-lg w-full"
          >
            {signing
              ? 'Signing…'
              : address
                ? 'Sign Score Proof'
                : isBrowserWalletMode
                  ? 'Choose a wallet above'
                  : 'Connect & Sign Proof'}
          </button>

          {address && !proof && (
            <button onClick={() => disconnect()} className="btn btn-secondary btn-sm w-full text-xs">
              Disconnect
            </button>
          )}
        </div>
      )}

      {(error || signError) && (
        <p className="text-xs text-red-400">{signError ?? error}</p>
      )}
    </div>
  );
}
