import { useState } from 'react';
import { useWallet, shortenAddress } from '@/solana/WalletProvider';
import { buildScoreProofMessage, encodeScoreProof } from '@/solana/scoreProof';
import { updateResultSession } from '@/storage/resultStorage';
import type { ResultSession } from '@/storage/types';

interface Props {
  session: ResultSession;
  onUpdated: (session: ResultSession) => void;
}

export function ScoreProofPanel({ session, onUpdated }: Props) {
  const {
    address,
    walletLabel,
    connecting,
    error,
    requestConnect,
    disconnect,
    signMessage,
  } = useWallet();
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const proof = session.scoreProof;
  const linkedAddress = session.walletAddress ?? address;

  const handleConnect = () => {
    requestConnect().catch(() => {
      // error surfaced via wallet context
    });
  };

  const handleSign = async () => {
    if (!address) return;
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
        <p className="text-xs text-white/50 mt-1 leading-relaxed">
          Optional. Connect one wallet and sign a message to prove your score. No tokens spent, no
          on-chain transaction.
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
          {address ? (
            <>
              <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <p className="text-xs text-white/45 mb-1">Connected wallet</p>
                <p className="text-sm text-white font-mono">
                  {walletLabel ? `${walletLabel} · ` : ''}
                  {shortenAddress(address, 6)}
                </p>
              </div>
              <button
                onClick={handleSign}
                disabled={signing || connecting}
                className="btn btn-primary btn-lg w-full"
              >
                {signing ? 'Signing…' : 'Sign Score Proof'}
              </button>
              <button
                onClick={() => disconnect()}
                disabled={signing || connecting}
                className="btn btn-secondary btn-sm w-full text-xs"
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              {linkedAddress && !address && (
                <p className="text-xs text-white/45 text-center">
                  Session linked to {shortenAddress(linkedAddress, 6)}. Connect the same wallet to sign.
                </p>
              )}
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="btn btn-primary btn-lg w-full"
              >
                {connecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            </>
          )}
        </div>
      )}

      {(error || signError) && (
        <p className="text-xs text-red-400">{signError ?? error}</p>
      )}
    </div>
  );
}
