import { useRef, useState } from 'react';
import { exportAllLessons, importAllLessons } from '@/storage/lessonStorage';
import { readJsonFile } from '@/utils/json';

interface Props {
  onImported: () => void;
}

export function ImportExportPanel({ onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleExport = async () => {
    try {
      await exportAllLessons();
      setIsError(false);
      setStatus('All lessons exported!');
    } catch (e) {
      setIsError(true);
      setStatus(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const handleImport = async (file: File) => {
    try {
      const json = await readJsonFile(file);
      const result = await importAllLessons(json);
      setIsError(result.errors.length > 0);
      setStatus(
        `Imported ${result.imported} lesson(s).` +
          (result.errors.length > 0 ? ` Errors: ${result.errors.join('; ')}` : ''),
      );
      if (result.imported > 0) onImported();
    } catch (e) {
      setIsError(true);
      setStatus(e instanceof Error ? e.message : 'Import failed');
    }
  };

  return (
    <div className="glass-card p-5 space-y-4">
      <h3 className="font-bold text-white">Import / Export</h3>

      <div className="flex flex-wrap gap-3">
        <button onClick={handleExport} className="btn btn-secondary btn-sm">
          ↓ Export All Lessons
        </button>
        <button onClick={() => fileRef.current?.click()} className="btn btn-secondary btn-sm">
          ↑ Import Lessons JSON
        </button>
      </div>

      {status && (
        <p className={`text-sm ${isError ? 'text-red-400' : 'text-green-400'}`}>{status}</p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
