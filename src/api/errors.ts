export type ApiErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'VALIDATION';

/**
 * Error the API layer throws. The real backend maps to it: 404 -> NOT_FOUND,
 * 403 -> FORBIDDEN, 400/422 -> VALIDATION. The message is safe to show to the user.
 * A VALIDATION error can name the form `field` it belongs to, so the form shows it there.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly field: string | undefined;

  constructor(code: ApiErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.field = field;
  }
}

/** Text for a toast or error state. Unknown errors never leak details to the user. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
}
