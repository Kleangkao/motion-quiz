import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createLesson, getLesson, updateLesson } from '@/storage/lessonStorage';
import type { LessonImageRef, QuizQuestion } from '@/storage/types';
import { buildQuestionsFromTopicRows, type TopicQuestionRow } from '@/data/createTopicFromRows';
import { PageLayout } from '@/components/layout/PageLayout';
import { ImagePicker } from '@/components/teacher/ImagePicker';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { generateId } from '@/utils/ids';

interface QuestionDraft {
  id: string;
  prompt: string;
  correctAnswer: string;
  wrongAnswer: string;
  correctImage?: LessonImageRef;
  wrongImage?: LessonImageRef;
}

function emptyQuestion(): QuestionDraft {
  return {
    id: generateId(),
    prompt: '',
    correctAnswer: '',
    wrongAnswer: '',
  };
}

function questionDraftFromQuiz(q: QuizQuestion): QuestionDraft {
  const correct = q.correctSide === 'left' ? q.left : q.right;
  const wrong = q.correctSide === 'left' ? q.right : q.left;
  return {
    id: q.id,
    prompt: q.prompt,
    correctAnswer: correct.label ?? correct.altText ?? '',
    wrongAnswer: wrong.label ?? wrong.altText ?? '',
    correctImage: correct.image,
    wrongImage: wrong.image,
  };
}

const MIN_QUESTIONS = 2;

export function CreateTopicPage() {
  const navigate = useNavigate();
  const { lessonId } = useParams<{ lessonId?: string }>();
  const isEditing = Boolean(lessonId);

  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion(), emptyQuestion()]);
  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const lesson = await getLesson(lessonId);
        if (cancelled) return;
        if (!lesson) {
          setLoadError('Topic not found.');
          return;
        }
        setTitle(lesson.title);
        setQuestions(
          lesson.questions.length >= MIN_QUESTIONS
            ? lesson.questions.map(questionDraftFromQuiz)
            : [...lesson.questions.map(questionDraftFromQuiz), emptyQuestion()],
        );
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  const updateQuestion = (id: string, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => (prev.length <= MIN_QUESTIONS ? prev : prev.filter((q) => q.id !== id)));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Topic title is required.');
      return;
    }

    const rows: TopicQuestionRow[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const prompt = q.prompt.trim();
      const correctAnswer = q.correctAnswer.trim();
      const wrongAnswer = q.wrongAnswer.trim();
      if (!prompt || !correctAnswer || !wrongAnswer) {
        setError(`Question ${i + 1} needs a prompt, correct answer, and wrong answer.`);
        return;
      }
      if (correctAnswer === wrongAnswer) {
        setError(`Question ${i + 1}: correct and wrong answers must differ.`);
        return;
      }
      rows.push({
        prompt,
        correctAnswer,
        wrongAnswer,
        correctImage: q.correctImage,
        wrongImage: q.wrongImage,
      });
    }

    setSaving(true);
    try {
      const builtQuestions = buildQuestionsFromTopicRows(rows);
      const durationSeconds = Math.max(120, builtQuestions.length * 15);

      if (isEditing && lessonId) {
        await updateLesson(lessonId, {
          title: trimmedTitle,
          durationSeconds,
          questions: builtQuestions,
        });
      } else {
        await createLesson({
          title: trimmedTitle,
          durationSeconds,
          questionOrder: 'random',
          showAnswerTextAfterResponse: true,
          allowTouchFallback: true,
          packKind: 'solo',
          questions: builtQuestions,
        });
      }
      navigate('/play');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner label="Loading topic…" size="lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <PageLayout title="Edit Topic" backTo="/play">
        <p className="text-sm text-red-400">{loadError}</p>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={isEditing ? 'Edit Topic' : 'Create Topic'} backTo="/play">
      <p className="text-sm text-white/50 mb-4">
        {isEditing
          ? 'Update your topic title and questions. Changes apply the next time you play.'
          : 'Add a topic title and at least two questions. Each question becomes a left/right gesture round.'}
      </p>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-semibold text-white/80">Topic title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full rounded-xl bg-white/10 px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Solana Workshop Warm-up"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">Questions</h3>
            <button type="button" onClick={addQuestion} className="btn btn-secondary btn-sm">
              + Add question
            </button>
          </div>

          {questions.map((q, index) => (
            <div key={q.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-white/80">Question {index + 1}</span>
                {questions.length > MIN_QUESTIONS && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs text-white/50">Question *</label>
                <input
                  value={q.prompt}
                  onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                  required
                  className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="What is the native token of Solana?"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-white/50">Correct answer *</label>
                  <input
                    value={q.correctAnswer}
                    onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                    required
                    className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="SOL"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-white/50">Wrong answer *</label>
                  <input
                    value={q.wrongAnswer}
                    onChange={(e) => updateQuestion(q.id, { wrongAnswer: e.target.value })}
                    required
                    className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ETH"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ImagePicker
                  label="Correct answer image (optional)"
                  value={q.correctImage}
                  onChange={(correctImage) => updateQuestion(q.id, { correctImage })}
                />
                <ImagePicker
                  label="Wrong answer image (optional)"
                  value={q.wrongImage}
                  onChange={(wrongImage) => updateQuestion(q.id, { wrongImage })}
                />
              </div>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={saving} className="btn btn-primary btn-lg w-full">
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save topic'}
        </button>
      </form>
    </PageLayout>
  );
}
