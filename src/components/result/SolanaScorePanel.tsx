import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useWallet, shortenAddress } from '@/solana/WalletProvider';
import type { LessonPack, ResultSession } from '@/storage/types';
import { isLeaderboardEligiblePack } from '@/solana/leaderboardEligibility';
import { isSupabaseConfigured, getSolanaCluster } from '@/solana/env';
import {
  buildScoreReceiptFromSession,
  scoreReceiptExpectedFromPayload,
} from '@/solana/scoreReceipt';
import { buildScoreReceiptTransaction } from '@/solana/scoreReceiptTransaction';
import { verifyScoreReceipt } from '@/solana/scoreReceiptVerifier';
import { solanaExplorerTxUrl } from '@/solana/explorer';
import { getRecordedScore, saveRecordedScore } from '@/storage/scoreRecordStorage';
import { buildScoreProofMessage, encodeScoreProof } from '@/solana/scoreProof';
import { updateResultSession } from '@/storage/resultStorage';

interface Props {
  session: ResultSession;
  lesson: LessonPack | null;
  onUpdated: (session: ResultSession) => void;
}

type RecordState = 'idle' | 'recording' | 'recorded' | 'error';

export function SolanaScorePanel({ session, lesson, onUpdated }: Props) {
  const {
    address,
    connecting,
    error: walletError,
    supportsTransactions,
    requestConnect,
    sendTransaction,
    signMessage,
  } = useWallet();

  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [recordError, setRecordError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const cluster = getSolanaCluster();

  const eligible = isLeaderboardEligiblePack(session.lessonId);
  const configured = isSupabaseConfigured();
  const proof = session.scoreProof;

  useEffect(() => {
    const saved = getRecordedScore(session.id);
    if (saved?.verified && saved.txSignature) {
      setTxSignature(saved.txSignature);
      setRecordState('recorded');
    }
  }, [session.id]);

  const handleConnect = () => {
    requestConnect().catch(() => {
      // surfaced via wallet context
    });
  };

  const handleRecord = async () => {
    if (!address || !lesson) return;
    if (cluster !== 'devnet') {
      setRecordError('Only devnet score recording is enabled right now.');
      setRecordState('error');
      return;
    }

    setRecordState('recording');
    setRecordError(null);

    try {
      const payload = await buildScoreReceiptFromSession(lesson, session, address, cluster);
      const transaction = await buildScoreReceiptTransaction(address, payload);
      const signature = await sendTransaction(transaction);
      const verifyResult = await verifyScoreReceipt({
        txSignature: signature,
        expected: scoreReceiptExpectedFromPayload(payload),
      });

      if (!verifyResult.ok) {
        throw new Error(verifyResult.error);
      }

      saveRecordedScore({
        sessionId: session.id,
        txSignature: signature,
        verified: true,
        cluster,
        packId: lesson.id,
        packContentHash: payload.packContentHash,
        recordedAt: new Date().toISOString(),
      });

      setTxSignature(signature);
      setRecordState('recorded');
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : String(error));
      setRecordState('error');
    }
  };

  const handleSignProof = async () => {
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

  if (!eligible) {
    return (
      <div className="glass-card p-5 space-y-2">
        <h3 className="font-bold text-white">Solana Score</h3>
        <p className="text-xs text-white/50 leading-relaxed">
          Leaderboard is available for built-in topics only.
        </p>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="glass-card p-5 space-y-2">
        <h3 className="font-bold text-white">Solana Score</h3>
        <p className="text-xs text-white/50 leading-relaxed">
          Score recording is not configured yet. Add Supabase env vars to enable devnet leaderboard recording.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5 space-y-4">
      <div>
        <h3 className="font-bold text-white">Solana Score</h3>
        <p className="text-xs text-white/50 mt-1 leading-relaxed">
          Record this score on Solana devnet and add it to the topic leaderboard.
        </p>
      </div>

      {recordState === 'recorded' && txSignature ? (
        <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-4 space-y-3">
          <p className="text-green-400 font-semibold text-sm">Recorded on Solana</p>
          <p className="text-xs text-white/50 font-mono break-all">{shortenAddress(txSignature, 8)}</p>
          <a
            href={solanaExplorerTxUrl(txSignature, cluster)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm w-full text-xs"
          >
            View transaction
          </a>
          <Link
            to={`/leaderboard?pack=${encodeURIComponent(session.lessonId)}`}
            className="btn btn-secondary btn-sm w-full text-xs text-center"
          >
            View leaderboard
          </Link>
        </div>
      ) : !address ? (
        <div className="space-y-3">
          <p className="text-xs text-white/50">Connect wallet to record this score.</p>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="btn btn-primary btn-lg w-full"
          >
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        </div>
      ) : !supportsTransactions ? (
        <div className="space-y-3">
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-xs text-white/45 mb-1">Connected wallet</p>
            <p className="text-sm text-white font-mono">{shortenAddress(address, 6)}</p>
          </div>
          <p className="text-xs text-amber-300/90">
            This wallet cannot record scores yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-xs text-white/45 mb-1">Connected wallet</p>
            <p className="text-sm text-white font-mono">{shortenAddress(address, 6)}</p>
          </div>
          <button
            onClick={handleRecord}
            disabled={recordState === 'recording' || !lesson}
            className="btn btn-primary btn-lg w-full"
          >
            {recordState === 'recording' ? 'Recording score…' : 'Record Score on Solana'}
          </button>
          <p className="text-xs text-white/45">
            Creates a devnet memo transaction. No token transfer.
          </p>
          {!lesson && (
            <p className="text-xs text-white/45">Loading topic details…</p>
          )}
        </div>
      )}

      {(walletError || recordError) && (
        <p className="text-xs text-red-400">{recordError ?? walletError}</p>
      )}

      {address && (
        <div className="border-t border-white/10 pt-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-white/35">Advanced</p>
          {proof ? (
            <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 space-y-1">
              <p className="text-xs text-green-400/90">Local score proof signed</p>
              <p className="text-[10px] text-white/40 font-mono break-all">
                {proof.signatureBase58.slice(0, 32)}…
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSignProof}
                disabled={signing || connecting}
                className="btn btn-secondary btn-sm w-full text-xs"
              >
                {signing ? 'Signing…' : 'Sign local score proof'}
              </button>
              <p className="text-[10px] text-white/35 leading-relaxed">
                Off-chain message only. Does not record on Solana or move funds.
              </p>
            </>
          )}
          {signError && <p className="text-xs text-red-400">{signError}</p>}
        </div>
      )}
    </div>
  );
}
