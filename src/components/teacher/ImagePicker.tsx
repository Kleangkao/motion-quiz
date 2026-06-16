import { useRef, useState } from 'react';
import type { LessonImageRef } from '@/storage/types';
import { fileToDataUrl } from '@/storage/imageStorage';
import { getImageUrl } from '@/storage/imageStorage';
import { useEffect } from 'react';

interface Props {
  value?: LessonImageRef;
  onChange: (ref: LessonImageRef | undefined) => void;
  label?: string;
}

export function ImagePicker({ value, onChange, label = 'Image' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value) {
      getImageUrl(value).then(setPreview);
    } else {
      setPreview(null);
    }
  }, [value]);

  const handleFile = async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image too large (max 5 MB)');
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      onChange({ kind: 'dataUrl', value: dataUrl });
      setPreview(dataUrl);
    } catch {
      setError('Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-white/60">{label}</span>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-white/30 bg-white/5 transition hover:border-indigo-400 hover:bg-white/10"
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}
        {preview ? (
          <img src={preview} alt="Choice" className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl text-white/30">+</span>
        )}
      </div>
      {preview && (
        <button
          type="button"
          onClick={() => { onChange(undefined); setPreview(null); }}
          className="text-xs text-red-400 underline"
        >
          Remove
        </button>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
