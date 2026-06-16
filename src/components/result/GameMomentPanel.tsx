import { useCallback, useEffect, useState } from 'react';
import type { ResultSession } from '@/storage/types';
import {
  composeResultMoment,
  defaultPhotoIndex,
  gameMomentFilename,
  resultSessionToGameMomentInput,
} from '@/utils/composeResultMoment';
import { canShareImageFiles, downloadImage, shareImage } from '@/utils/downloadImage';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface Props {
  session: ResultSession;
  sessionPhotos?: string[];
}

export function GameMomentPanel({ session, sessionPhotos = [] }: Props) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(() =>
    defaultPhotoIndex(sessionPhotos.length),
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareAvailable, setShareAvailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShareAvailable(canShareImageFiles());
  }, []);

  useEffect(() => {
    setSelectedPhotoIndex(defaultPhotoIndex(sessionPhotos.length));
  }, [session.id, sessionPhotos.length]);

  const createPreview = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const input = resultSessionToGameMomentInput(session);
      const photoDataUrl = sessionPhotos[selectedPhotoIndex];
      if (photoDataUrl) {
        input.photoDataUrl = photoDataUrl;
      }
      const dataUrl = await composeResultMoment(input);
      if (!dataUrl) {
        setError('Could not create image on this device.');
        return;
      }
      setPreviewUrl(dataUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create result card');
    } finally {
      setGenerating(false);
    }
  }, [session, sessionPhotos, selectedPhotoIndex]);

  useEffect(() => {
    createPreview();
  }, [createPreview]);

  const filename = gameMomentFilename(session.challengeName ?? session.lessonTitle);

  const handleDownload = useCallback(async () => {
    if (!previewUrl) return;
    setDownloading(true);
    setError(null);
    setMessage(null);
    try {
      const result = await downloadImage(previewUrl, filename);
      if (result.error) {
        setMessage(result.error);
      } else if (result.method === 'download') {
        setMessage('Saved to your Downloads folder.');
      } else {
        setMessage('Image opened in a new tab. Save from there if needed.');
      }
    } catch {
      setError('Could not save the image. Try again.');
    } finally {
      setDownloading(false);
    }
  }, [previewUrl, filename]);

  const handleShare = useCallback(async () => {
    if (!previewUrl) return;
    setSharing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await shareImage(previewUrl, filename);
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage('Shared via your device share sheet.');
      }
    } catch {
      setError('Could not share the image. Try Download instead.');
    } finally {
      setSharing(false);
    }
  }, [previewUrl, filename]);

  return (
    <div className="glass-card p-5 space-y-5">
      <div>
        <h3 className="font-bold text-white">Share Result Card</h3>
        <p className="text-xs text-white/50 mt-1 leading-relaxed">
          Pick a photo, then download or share. The card updates when you change the photo.
        </p>
      </div>

      {sessionPhotos.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Pick a photo
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {sessionPhotos.map((url, index) => (
              <button
                key={`card-photo-${index}`}
                type="button"
                onClick={() => setSelectedPhotoIndex(index)}
                className={`relative shrink-0 h-20 w-20 rounded-2xl overflow-hidden border-2 transition-all ${
                  selectedPhotoIndex === index
                    ? 'border-indigo-400 ring-2 ring-indigo-400/50 scale-105'
                    : 'border-white/15 opacity-80 hover:opacity-100 hover:border-white/35'
                }`}
                aria-label={`Use photo ${index + 1} on result card`}
                aria-pressed={selectedPhotoIndex === index}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
                {selectedPhotoIndex === index && (
                  <span className="absolute inset-x-0 bottom-0 bg-indigo-600/90 py-0.5 text-[10px] font-bold text-white">
                    On card
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        {generating && !previewUrl && (
          <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-white/10 bg-black/25">
            <LoadingSpinner label="Building card…" />
          </div>
        )}

        {previewUrl && (
          <div className="space-y-4">
            <div className="mx-auto max-w-sm rounded-2xl overflow-hidden border border-white/15 bg-black/40 shadow-2xl shadow-indigo-950/40">
              <img
                src={previewUrl}
                alt="Result card preview"
                className={`w-full h-auto block transition-opacity ${generating ? 'opacity-60' : ''}`}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || generating}
                className="btn btn-primary btn-md flex-1"
              >
                {downloading ? 'Saving…' : 'Download'}
              </button>
              {shareAvailable && (
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={sharing || generating}
                  className="btn btn-secondary btn-md flex-1"
                >
                  {sharing ? 'Opening…' : 'Share'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {message && <p className="text-xs text-green-400 text-center">{message}</p>}
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  );
}
