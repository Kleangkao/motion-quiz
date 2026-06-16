import type { ResultSession } from '@/storage/types';

function escapeCsv(value: string | number | boolean | undefined | null): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function resultsToCsv(sessions: ResultSession[]): string {
  const headers = [
    'id', 'lessonTitle', 'startedAt', 'endedAt', 'durationSeconds',
    'score', 'correctCount', 'wrongCount', 'skippedCount', 'totalAnswered', 'accuracy',
  ];
  const rows = sessions.map((s) =>
    [
      s.id, s.lessonTitle, s.startedAt, s.endedAt, s.durationSeconds,
      s.score, s.correctCount, s.wrongCount, s.skippedCount, s.totalAnswered,
      s.accuracy.toFixed(1),
    ].map(escapeCsv).join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
