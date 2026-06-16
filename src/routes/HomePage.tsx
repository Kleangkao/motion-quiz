import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings } from '@/storage/settingsStorage';
import { getLesson } from '@/storage/lessonStorage';
import { useWallet, shortenAddress } from '@/solana/WalletProvider';
import type { LessonPack } from '@/storage/types';

export function HomePage() {
  const navigate = useNavigate();
  const { address, connect, connecting } = useWallet();
  const [lastLesson, setLastLesson] = useState<LessonPack | null>(null);

  useEffect(() => {
    async function load() {
      const settings = await getSettings();
      if (settings.lastUsedLessonId) {
        const found = await getLesson(settings.lastUsedLessonId);
        if (found) setLastLesson(found);
      }
    }
    load();
  }, []);

  const modes = [
    { path: '/solo', emoji: '🎯', title: 'Solo Play', desc: 'Built-in quiz packs' },
    { path: '/challenge', emoji: '🏁', title: 'Challenge Mode', desc: 'Import & play host challenges' },
    { path: '/challenge/host', emoji: '🛠', title: 'Host Mode', desc: 'Create & export quiz packs' },
    { path: '/results', emoji: '📊', title: 'Results', desc: 'Local history & proofs' },
    { path: '/settings', emoji: '⚙', title: 'Settings', desc: 'Camera & gesture tuning' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950 flex flex-col p-5 pb-8 gap-5 max-w-lg mx-auto">
      <header className="pt-4 space-y-1">
        <div className="text-4xl">📱</div>
        <h1 className="text-3xl font-black text-white tracking-tight">Seeker Motion Quiz</h1>
        <p className="text-white/60 text-sm">
          Point left or right with your camera — built for Solana Mobile workshops & community events.
        </p>
      </header>

      {lastLesson && (
        <button
          onClick={() =>
            navigate(`/play/${lastLesson.id}/calibrate`, {
              state: { playMode: lastLesson.packKind === 'challenge' ? 'challenge' : 'solo' },
            })
          }
          className="btn btn-primary btn-xl w-full"
        >
          ▶ Continue: {lastLesson.title}
        </button>
      )}

      <nav className="grid gap-3">
        {modes.map(({ path, emoji, title, desc }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="glass-card p-4 text-left flex items-center gap-4 active:scale-[0.99] transition hover:bg-white/15"
          >
            <span className="text-2xl">{emoji}</span>
            <div>
              <div className="font-bold text-white">{title}</div>
              <div className="text-xs text-white/45">{desc}</div>
            </div>
          </button>
        ))}
      </nav>

      <div className="glass-card p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wide">Wallet</p>
          <p className="text-sm text-white/80">
            {address ? shortenAddress(address, 6) : 'Not connected — optional for play'}
          </p>
        </div>
        {!address && (
          <button onClick={() => connect()} disabled={connecting} className="btn btn-secondary btn-sm">
            {connecting ? '…' : 'Connect'}
          </button>
        )}
      </div>

      <p className="text-xs text-white/30 text-center leading-relaxed">
        Camera processing stays on your device. Video is not uploaded. Wallet signing is off-chain only — no gas, no transfers.
      </p>
    </div>
  );
}
