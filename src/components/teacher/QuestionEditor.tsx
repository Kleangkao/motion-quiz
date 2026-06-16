import { useState } from 'react';
import type { QuizQuestion, LessonImageRef } from '@/storage/types';
import { generateId } from '@/utils/ids';
import { ImagePicker } from './ImagePicker';

interface Props {
  question?: QuizQuestion;
  onSave: (q: QuizQuestion) => void;
  onCancel?: () => void;
}

export function QuestionEditor({ question, onSave, onCancel }: Props) {
  const [prompt, setPrompt] = useState(question?.prompt ?? '');
  const [answerText, setAnswerText] = useState(question?.answerText ?? '');
  const [leftLabel, setLeftLabel] = useState(question?.left.label ?? '');
  const [rightLabel, setRightLabel] = useState(question?.right.label ?? '');
  const [leftImage, setLeftImage] = useState<LessonImageRef | undefined>(question?.left.image);
  const [rightImage, setRightImage] = useState<LessonImageRef | undefined>(question?.right.image);
  const [correctSide, setCorrectSide] = useState<'left' | 'right'>(question?.correctSide ?? 'left');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q: QuizQuestion = {
      id: question?.id ?? generateId(),
      prompt: prompt.trim(),
      answerText: answerText.trim() || undefined,
      left: {
        id: question?.left.id ?? generateId(),
        label: leftLabel.trim() || undefined,
        image: leftImage,
        altText: leftLabel.trim() || prompt.trim(),
      },
      right: {
        id: question?.right.id ?? generateId(),
        label: rightLabel.trim() || undefined,
        image: rightImage,
        altText: rightLabel.trim() || prompt.trim(),
      },
      correctSide,
    };
    onSave(q);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-white/80">Prompt / Question *</label>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Gym"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-white/80">Answer Text (Thai/Translation)</label>
        <input
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. โรงยิม"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Left choice */}
        <div className="rounded-2xl border border-white/20 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white/80 text-sm">👈 Left Choice</span>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/60">
              <input
                type="radio" name="correct" value="left"
                checked={correctSide === 'left'}
                onChange={() => setCorrectSide('left')}
                className="accent-green-500"
              />
              Correct
            </label>
          </div>
          <input
            value={leftLabel}
            onChange={(e) => setLeftLabel(e.target.value)}
            className="w-full rounded-xl bg-white/10 px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Label"
          />
          <ImagePicker value={leftImage} onChange={setLeftImage} label="Left image" />
        </div>

        {/* Right choice */}
        <div className="rounded-2xl border border-white/20 bg-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white/80 text-sm">👉 Right Choice</span>
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/60">
              <input
                type="radio" name="correct" value="right"
                checked={correctSide === 'right'}
                onChange={() => setCorrectSide('right')}
                className="accent-green-500"
              />
              Correct
            </label>
          </div>
          <input
            value={rightLabel}
            onChange={(e) => setRightLabel(e.target.value)}
            className="w-full rounded-xl bg-white/10 px-3 py-1.5 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Label"
          />
          <ImagePicker value={rightImage} onChange={setRightImage} label="Right image" />
        </div>
      </div>

      {/* Validation hint */}
      {correctSide && (
        <p className="text-xs text-green-400">
          ✓ Correct side: {correctSide}
          {(correctSide === 'left' ? leftLabel : rightLabel) && ` (${correctSide === 'left' ? leftLabel : rightLabel})`}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-secondary btn-md flex-1">
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-md flex-1" disabled={!prompt.trim()}>
          Save Question
        </button>
      </div>
    </form>
  );
}
