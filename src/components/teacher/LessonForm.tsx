import { useState } from 'react';
import type { LessonPack } from '@/storage/types';

interface Props {
  initial?: Partial<LessonPack>;
  onSave: (data: Omit<LessonPack, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt' | 'questions'>) => void;
  onCancel?: () => void;
}

export function LessonForm({ initial, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [duration, setDuration] = useState(initial?.durationSeconds ?? 120);
  const [order, setOrder] = useState<'random' | 'sequential'>(initial?.questionOrder ?? 'random');
  const [showAnswer, setShowAnswer] = useState(initial?.showAnswerTextAfterResponse ?? true);
  const [touchFallback, setTouchFallback] = useState(initial?.allowTouchFallback ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      durationSeconds: duration,
      questionOrder: order,
      showAnswerTextAfterResponse: showAnswer,
      allowTouchFallback: touchFallback,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-white/80">Title *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Places at School"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-white/80">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          placeholder="Optional description"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-white/80">
          Duration: {duration} seconds ({Math.floor(duration / 60)}m {duration % 60}s)
        </label>
        <input
          type="range" min={30} max={600} step={30}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="mt-1 flex justify-between text-xs text-white/40">
          <span>30s</span><span>5m</span><span>10m</span>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-white/80">Question Order</label>
        <div className="flex gap-3">
          {(['random', 'sequential'] as const).map((o) => (
            <label key={o} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio" name="order" value={o}
                checked={order === o}
                onChange={() => setOrder(o)}
                className="accent-indigo-500"
              />
              <span className="text-sm text-white/80 capitalize">{o}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox" checked={showAnswer}
            onChange={(e) => setShowAnswer(e.target.checked)}
            className="accent-indigo-500 h-4 w-4"
          />
          <span className="text-sm text-white/80">Show Thai answer after response</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox" checked={touchFallback}
            onChange={(e) => setTouchFallback(e.target.checked)}
            className="accent-indigo-500 h-4 w-4"
          />
          <span className="text-sm text-white/80">Allow touch/click as fallback</span>
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-secondary btn-md flex-1">
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-md flex-1" disabled={!title.trim()}>
          Save Lesson
        </button>
      </div>
    </form>
  );
}
