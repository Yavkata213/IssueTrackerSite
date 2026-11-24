import { LIMITS } from './limits';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Emails are compared in lower case without surrounding spaces. */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  const email = normalizeEmail(value);
  return email.length <= LIMITS.email && EMAIL.test(email);
}

/** Why a password is refused, or `null` when it is fine. The backend applies the same rules. */
export function checkPassword(password: string, own: { email?: string; name?: string } = {}): string | null {
  if (password.length < LIMITS.passwordMin) return `Use at least ${LIMITS.passwordMin} characters.`;
  if (password.length > LIMITS.passwordMax) return `Use at most ${LIMITS.passwordMax} characters.`;
  const lower = password.toLowerCase();
  if (own.email && lower === normalizeEmail(own.email)) return 'The password must not be your email address.';
  if (own.name && own.name.trim().length > 3 && lower.includes(own.name.trim().toLowerCase())) {
    return 'The password must not contain your name.';
  }
  if (/^(.)\1+$/.test(password)) return 'Choose a password that is harder to guess.';
  return null;
}
