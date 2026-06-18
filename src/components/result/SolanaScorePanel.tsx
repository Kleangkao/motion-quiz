import { buildScoresLeaderboardLink } from '@/leaderboard/scoresRoutes';
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
import {
  getRecordedScore,
  saveRecordedScore,
  type RecordedScoreReceipt,
} from '@/storage/scoreRecordStorage';

interface Props {
  session: ResultSession;
  lesson: LessonPack | null;
  onScoreRecorded?: (record: RecordedScoreReceipt) => void;
}

type RecordState = 'idle' | 'recording' | 'recorded' | 'error';

export function SolanaScorePanel({ session, lesson, onScoreRecorded }: Props) {
  const {
    address,
    connecting,
    error: walletError,
    supportsTransactions,
    requestConnect,
    sendTransaction,
  } = useWallet();

  const [recordState, setRecordState] = useState<RecordState>('idle');
  const [recordError, setRecordError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const cluster = getSolanaCluster();

  const eligible = isLeaderboardEligiblePack(session.lessonId);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    const saved = getRecordedScore(session.id);
    if (saved?.verified && saved.txSignature) {
      setTxSignature(saved.txSignature);
      setRecordState('recorded');
      onScoreRecorded?.(saved);
    }
  }, [session.id, onScoreRecorded]);

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

      const record: RecordedScoreReceipt = {
        sessionId: session.id,
        txSignature: signature,
        verified: true,
        cluster,
        packId: lesson.id,
        packContentHash: payload.packContentHash,
        recordedAt: new Date().toISOString(),
      };
      saveRecordedScore(record);

      setTxSignature(signature);
      setRecordState('recorded');
      onScoreRecorded?.(record);
    } catch (error) {
      setRecordError(error instanceof Error ? error.message : String(error));
      setRecordState('error');
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
            to={buildScoresLeaderboardLink(session.lessonId)}
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
    </div>
  );
}
