export function computeAccuracy(correct: number, total: number): number {
  if (total === 0) return 0;
  return (correct / total) * 100;
}

export function scoreForAnswer(isCorrect: boolean): number {
  return isCorrect ? 1 : 0;
}
