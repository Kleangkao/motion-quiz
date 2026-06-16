export class AppError extends Error {
  code: string | undefined;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

export function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Unknown error';
}
