import { useCallback, useState } from 'react';
import { downloadImage } from '@/utils/downloadImage';

interface Props {
  photos: string[];
  sessionId: string;
}

export function SessionPhotoGallery({ photos, sessionId }: Props) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadOne = useCallback(async (dataUrl: string, index: number) => {
    setError(null);
    setMessage(null);
    const result = await downloadImage(
      dataUrl,
      `motion-quiz-photo-${sessionId.slice(0, 8)}-${index + 1}.jpg`,
    );
    if (result.error) setError(result.error);
    else setMessage(result.method === 'share' ? 'Shared photo.' : 'Download started.');
  }, [sessionId]);

  const downloadAll = useCallback(async () => {
    setDownloadingAll(true);
    setError(null);
    setMessage(null);
    try {
      for (let i = 0; i < photos.length; i++) {
        const result = await downloadImage(
          photos[i],
          `motion-quiz-photo-${sessionId.slice(0, 8)}-${i + 1}.jpg`,
        );
        if (result.error) {
          setError(result.error);
          return;
        }
        if (i < photos.length - 1) {
          await new Promise((r) => setTimeout(r, 350));
        }
      }
      setMessage(`Saved ${photos.length} photo${photos.length === 1 ? '' : 's'}.`);
    } finally {
      setDownloadingAll(false);
    }
  }, [photos, sessionId]);

  if (photos.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4">
      <div>
        <h3 className="font-bold text-white">Photo Moments</h3>
        <p className="text-xs text-white/50 mt-1 leading-relaxed">
          Photos from this round stay on your device. They are not uploaded or auto-saved.
        </p>
        <p className="text-xs text-white/40 mt-1">
          Choose which shot appears on the result card below.
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((url, index) => (
          <button
            key={`${sessionId}-${index}`}
            type="button"
            onClick={() => setPreviewIndex(index)}
            className="aspect-square rounded-xl overflow-hidden border-2 border-white/20 hover:border-indigo-400/60 focus:border-indigo-400 transition-colors"
          >
            <img src={url} alt={`Photo moment ${index + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {photos.length > 1 && (
          <button
            type="button"
            onClick={downloadAll}
            disabled={downloadingAll}
            className="btn btn-secondary btn-sm"
          >
            {downloadingAll ? 'Saving…' : 'Download all'}
          </button>
        )}
      </div>

      {message && <p className="text-xs text-green-400">{message}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {previewIndex != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setPreviewIndex(null)}
        >
          <div
            className="glass-card max-w-lg w-full p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[previewIndex]}
              alt={`Photo moment ${previewIndex + 1}`}
              className="w-full max-h-[60vh] object-contain rounded-xl"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => downloadOne(photos[previewIndex], previewIndex)}
                className="btn btn-primary btn-md flex-1"
              >
                Download
              </button>
              <button
                type="button"
                onClick={() => setPreviewIndex(null)}
                className="btn btn-secondary btn-md flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
