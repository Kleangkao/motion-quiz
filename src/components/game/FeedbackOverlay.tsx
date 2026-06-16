import type { FeedbackState } from '@/game/types';

interface Props {
  feedback: FeedbackState;
  answerText?: string;
  showAnswerText: boolean;
}

export function FeedbackOverlay({ feedback, answerText, showAnswerText }: Props) {
  const { isCorrect } = feedback;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className={`flex flex-col items-center gap-4 rounded-3xl px-10 py-8 shadow-2xl backdrop-blur-sm animate-bounce-in ${
          isCorrect
            ? 'bg-green-500/80 border-2 border-green-300'
            : 'bg-red-500/80 border-2 border-red-300'
        }`}
      >
        <span className="text-6xl">{isCorrect ? '🎉' : '❌'}</span>
        <span className="text-2xl font-black text-white">
          {isCorrect ? 'Correct!' : 'Wrong!'}
        </span>
        {showAnswerText && answerText && (
          <span className="text-xl font-bold text-white/90">{answerText}</span>
        )}
      </div>
    </div>
  );
}
