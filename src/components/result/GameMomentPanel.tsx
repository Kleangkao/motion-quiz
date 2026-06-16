import { useCallback, useState } from 'react';
import type { ResultSession } from '@/storage/types';
import {
  composeResultMoment,
  gameMomentFilename,
  resultSessionToGameMomentInput,
} from '@/utils/composeResultMoment';
import { downloadOrShareImage } from '@/utils/downloadImage';

interface Props {
  session: ResultSession;
}

export function GameMomentPanel({ session }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewHadSignedProof, setPreviewHadSignedProof] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionHasSignedProof = Boolean(session.scoreProof);
  const previewIsStaleForProof = Boolean(
    previewUrl && sessionHasSignedProof && !previewHadSignedProof,
  );

  const createPreview = useCallback(() => {
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const input = resultSessionToGameMomentInput(session);
      const dataUrl = composeResultMoment(input);
      if (!dataUrl) {
        setError('Could not create image on this device.');
        return;
      }
      setPreviewUrl(dataUrl);
      setPreviewHadSignedProof(input.hasSignedProof);
      setMessage('Preview ready. Save when you are happy with it.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create Game Moment');
    } finally {
      setGenerating(false);
    }
  }, [session]);

  const handleSave = useCallback(async () => {
    if (!previewUrl) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const filename = gameMomentFilename(session.challengeName ?? session.lessonTitle);
      const result = await downloadOrShareImage(previewUrl, filename);
      if (result.error) {
        setMessage(result.error);
      } else if (result.method === 'share') {
        setMessage('Shared via your device share sheet.');
      } else if (result.method === 'download') {
        setMessage('Download started.');
      } else {
        setMessage('Image opened in a new tab — save from there if needed.');
      }
    } catch {
      setError('Could not save the image. Try again or tap Regenerate.');
    } finally {
      setSaving(false);
    }
  }, [previewUrl, session.challengeName, session.lessonTitle]);

  const handleRegenerate = useCallback(() => {
    setPreviewUrl(null);
    setPreviewHadSignedProof(false);
    setMessage(null);
    setError(null);
    createPreview();
  }, [createPreview]);

  return (
    <div className="glass-card p-5 space-y-4">
      <div>
        <h3 className="font-bold text-white">Game Moment</h3>
        <p className="text-xs text-white/50 mt-1">
          Optional local result card. Game Moments are generated locally on this device and are not uploaded.
        </p>
      </div>

      {!previewUrl ? (
        <button
          type="button"
          onClick={createPreview}
          disabled={generating}
          className="btn btn-primary btn-lg w-full"
        >
          {generating ? 'Creating…' : 'Create Game Moment'}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/30">
            <img
              src={previewUrl}
              alt="Game Moment preview"
              className="w-full h-auto block"
            />
          </div>
          {previewIsStaleForProof && (
            <p className="text-xs text-amber-300/90 text-center leading-relaxed">
              You signed a score proof after this preview was created. Tap Regenerate to include the Signed Score Proof badge.
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary btn-md flex-1"
            >
              {saving ? 'Saving…' : 'Save / Share Image'}
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={generating}
              className="btn btn-secondary btn-md flex-1"
            >
              Regenerate
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setPreviewUrl(null);
              setPreviewHadSignedProof(false);
              setMessage(null);
              setError(null);
            }}
            className="btn btn-secondary btn-sm w-full text-xs"
          >
            Skip for now
          </button>
        </div>
      )}

      {message && <p className="text-xs text-green-400 text-center">{message}</p>}
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}
