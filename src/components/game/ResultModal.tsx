import { useNavigate } from 'react-router-dom';
import type { GameState } from '@/game/types';
import { computeAccuracy } from '@/game/scoring';

interface Props {
  state: GameState;
  sessionId: string;
  lessonId: string;
  sessionPhotos?: string[];
  onPlayAgain: () => void;
}

export function ResultModal({ state, sessionId, lessonId, sessionPhotos = [], onPlayAgain }: Props) {
  const navigate = useNavigate();
  const accuracy = computeAccuracy(state.correctCount, state.totalAnswered);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="glass-card w-full max-w-sm p-8 text-center animate-bounce-in">
        <div className="text-5xl mb-3">
          {accuracy >= 70 ? '🏆' : accuracy >= 50 ? '⭐' : '💪'}
        </div>
        <h2 className="text-2xl font-black text-white mb-1">Time's Up!</h2>
        <p className="text-white/60 text-sm mb-6">Great job playing!</p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl bg-white/10 p-3">
            <div className="text-2xl font-black text-white">{state.score}</div>
            <div className="text-xs text-white/60 mt-1">Score</div>
          </div>
          <div className="rounded-xl bg-green-500/20 border border-green-500/30 p-3">
            <div className="text-2xl font-black text-green-400">{state.correctCount}</div>
            <div className="text-xs text-white/60 mt-1">Correct</div>
          </div>
          <div className="rounded-xl bg-red-500/20 border border-red-500/30 p-3">
            <div className="text-2xl font-black text-red-400">{state.wrongCount}</div>
            <div className="text-xs text-white/60 mt-1">Wrong</div>
          </div>
        </div>

        <div className="mb-6 rounded-xl bg-indigo-500/20 border border-indigo-500/30 p-4">
          <div className="text-3xl font-black text-indigo-300">{accuracy.toFixed(0)}%</div>
          <div className="text-xs text-white/60 mt-1">Accuracy</div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onPlayAgain}
            className="btn btn-primary btn-lg w-full"
          >
            Play Again
          </button>
          <button
            onClick={() =>
              navigate(`/play/${lessonId}/result/${sessionId}`, {
                state: sessionPhotos.length > 0 ? { sessionPhotos } : undefined,
              })
            }
            className="btn btn-secondary btn-md w-full"
          >
            View Full Results
          </button>
          <button
            onClick={() => navigate('/play')}
            className="btn btn-secondary btn-md w-full"
          >
            Back to Play
          </button>
        </div>
      </div>
    </div>
  );
}
