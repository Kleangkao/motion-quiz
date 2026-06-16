import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  getLesson,
  createLesson,
  updateLesson,
} from '@/storage/lessonStorage';
import {
  addQuestion,
  updateQuestion,
  removeQuestion,
  reorderQuestions,
} from '@/storage/lessonStorage';
import type { LessonPack, QuizQuestion } from '@/storage/types';
import { PageLayout } from '@/components/layout/PageLayout';
import { LessonForm } from '@/components/teacher/LessonForm';
import { QuestionEditor } from '@/components/teacher/QuestionEditor';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { generateId } from '@/utils/ids';

type EditorView = 'lesson' | 'question-list' | 'question-edit';

import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function LessonEditorPage() {
  const { lessonId } = useParams<{ lessonId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isHostRoute = location.pathname.includes('/challenge/host');
  const editorBase = isHostRoute ? '/challenge/host/lesson' : '/teacher/lesson';
  const isNew = lessonId === 'new' || !lessonId;

  const [lesson, setLesson] = useState<LessonPack | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [view, setView] = useState<EditorView>(isNew ? 'lesson' : 'question-list');
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuizQuestion | null>(null);

  useEffect(() => {
    if (!isNew && lessonId) {
      getLesson(lessonId).then((l) => {
        if (l) setLesson(l);
        setLoading(false);
      });
    }
  }, [isNew, lessonId]);

  const handleSaveLessonMeta = async (
    data: Omit<LessonPack, 'id' | 'schemaVersion' | 'createdAt' | 'updatedAt' | 'questions'>,
  ) => {
    if (isNew) {
      const created = await createLesson({
        ...data,
        questions: [],
        ...(isHostRoute
          ? { packKind: 'challenge' as const, challengeId: generateId() }
          : {}),
      });
      setLesson(created);
      setView('question-list');
      navigate(`${editorBase}/${created.id}`, { replace: true });
    } else if (lesson) {
      await updateLesson(lesson.id, data);
      setLesson((prev) => prev ? { ...prev, ...data } : null);
      setView('question-list');
    }
  };

  const syncLesson = useCallback(async (updated: LessonPack) => {
    await updateLesson(updated.id, { questions: updated.questions });
    setLesson(updated);
  }, []);

  const handleSaveQuestion = async (q: QuizQuestion) => {
    if (!lesson) return;
    const editing = editingQuestion;
    const updated = editing
      ? updateQuestion(lesson, q)
      : addQuestion(lesson, q);
    await syncLesson(updated);
    setEditingQuestion(null);
    setView('question-list');
  };

  const handleDeleteQuestion = async () => {
    if (!lesson || !deleteTarget) return;
    const updated = removeQuestion(lesson, deleteTarget.id);
    await syncLesson(updated);
    setDeleteTarget(null);
  };

  const handleMoveUp = async (idx: number) => {
    if (!lesson || idx === 0) return;
    await syncLesson(reorderQuestions(lesson, idx, idx - 1));
  };

  const handleMoveDown = async (idx: number) => {
    if (!lesson || idx >= lesson.questions.length - 1) return;
    await syncLesson(reorderQuestions(lesson, idx, idx + 1));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;

  return (
    <PageLayout
      title={isNew ? 'New Lesson' : lesson?.title ?? 'Edit Lesson'}
      backTo="/teacher"
    >
      {/* Lesson metadata form */}
      {view === 'lesson' && (
        <div className="glass-card p-6">
          <h2 className="font-bold text-white mb-4">Lesson Settings</h2>
          <LessonForm
            initial={lesson ?? undefined}
            onSave={handleSaveLessonMeta}
            onCancel={!isNew ? () => setView('question-list') : undefined}
          />
        </div>
      )}

      {/* Question list */}
      {view === 'question-list' && lesson && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-white">{lesson.title}</h2>
              <p className="text-xs text-white/40">{lesson.questions.length} questions</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView('lesson')} className="btn btn-secondary btn-sm">
                ✏️ Settings
              </button>
              <button
                onClick={() => { setEditingQuestion(null); setView('question-edit'); }}
                className="btn btn-primary btn-sm"
              >
                + Question
              </button>
            </div>
          </div>

          {lesson.questions.length === 0 ? (
            <div className="text-center py-12 glass-card">
              <p className="text-white/50 mb-4">No questions yet.</p>
              <button
                onClick={() => setView('question-edit')}
                className="btn btn-primary btn-md"
              >
                Add First Question
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {lesson.questions.map((q, i) => (
                <div key={q.id} className="glass-card flex items-center gap-3 p-3">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => handleMoveUp(i)} className="text-white/30 hover:text-white text-xs leading-none" disabled={i === 0}>▲</button>
                    <button onClick={() => handleMoveDown(i)} className="text-white/30 hover:text-white text-xs leading-none" disabled={i === lesson.questions.length - 1}>▼</button>
                  </div>
                  <span className="text-white/30 text-sm w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{q.prompt}</p>
                    <p className="text-xs text-white/40">
                      Correct: {q.correctSide} — {q.correctSide === 'left' ? q.left.label : q.right.label}
                      {q.answerText && ` (${q.answerText})`}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditingQuestion(q); setView('question-edit'); }}
                    className="btn btn-secondary btn-sm text-xs"
                  >✏️</button>
                  <button
                    onClick={() => setDeleteTarget(q)}
                    className="btn btn-danger btn-sm text-xs"
                  >🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Question editor */}
      {view === 'question-edit' && (
        <div className="glass-card p-6">
          <h2 className="font-bold text-white mb-4">
            {editingQuestion ? 'Edit Question' : 'New Question'}
          </h2>
          <QuestionEditor
            question={editingQuestion ?? undefined}
            onSave={handleSaveQuestion}
            onCancel={() => setView('question-list')}
          />
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete Question"
          message={`Delete question "${deleteTarget.prompt}"?`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDeleteQuestion}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </PageLayout>
  );
}
