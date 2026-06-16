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
  const { address, connecting, error, connect, disconnect, signMessage } = useWallet();
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const proof = session.scoreProof;
  const linkedAddress = session.walletAddress ?? address;

  const handleConnect = async () => {
    await connect();
  };

  const handleSign = async () => {
    if (!address) {
      await connect();
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
          {linkedAddress ? (
            <p className="text-sm text-white/70">
              Connected: <span className="font-mono text-indigo-300">{shortenAddress(linkedAddress, 6)}</span>
            </p>
          ) : (
            <button onClick={handleConnect} disabled={connecting} className="btn btn-secondary btn-md w-full">
              {connecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}

          <button
            onClick={handleSign}
            disabled={signing || connecting}
            className="btn btn-primary btn-lg w-full"
          >
            {signing ? 'Signing…' : address ? 'Sign Score Proof' : 'Connect & Sign Proof'}
          </button>

          {address && !proof && (
            <button onClick={() => disconnect()} className="btn btn-secondary btn-sm w-full text-xs">
              Disconnect
            </button>
          )}
        </div>
      )}

      {(error || signError) && (
        <p className="text-xs text-red-400">{error ?? signError}</p>
      )}
    </div>
  );
}
