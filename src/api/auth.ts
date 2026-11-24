// Sign-in, sign-out and password reset. Accounts are global: one account per email, usable in
// every workspace the person was invited to. There is no open registration; an account is created
// when an invitation is accepted (see `invitations.ts`).
//
// The real backend: POST /auth/sign-in answers with a short-lived JWT (kept in memory by the
// frontend) and sets the refresh token as an httpOnly cookie. The mock keeps the session in memory.

import type { User } from '../types';
import { checkPassword, isValidEmail, normalizeEmail } from '../utils/accounts';
import { LIMITS } from '../utils/limits';
import { cleanText, clone } from './internal';
import { ApiError } from './errors';
import {
  credentials,
  DEMO_PASSWORD_HASH,
  DEMO_PASSWORD_SALT,
  emailVerifications,
  loginAttempts,
  passwordResets,
  signUpAttempts,
} from './mockAuthData';
import type { CredentialRecord } from './mockAuthData';
import { users } from './mockData';
import { setSessionUser } from './session';
import { hashPassword, randomToken, sha256Hex } from './tokens';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const RESET_LINK_MS = 60 * 60 * 1000;
const VERIFY_LINK_MS = 24 * 60 * 60 * 1000;
const SIGN_UPS_PER_HOUR = 5;

const WRONG_CREDENTIALS = 'Email or password is wrong.';

function credentialOf(userId: string): CredentialRecord {
  return credentials.get(userId) ?? { salt: DEMO_PASSWORD_SALT, hash: DEMO_PASSWORD_HASH, emailVerified: true };
}

/** Has the owner of the address proven it (by opening the emailed link)? */
export function isEmailVerified(userId: string): boolean {
  return credentialOf(userId).emailVerified;
}

/**
 * Stores a new password for an account. The mock keeps the salt next to the hash. The verified
 * flag stays as it was unless `emailVerified` says otherwise.
 */
export async function storePassword(userId: string, password: string, emailVerified?: boolean): Promise<void> {
  const salt = randomToken();
  credentials.set(userId, {
    salt,
    hash: await hashPassword(salt, password),
    emailVerified: emailVerified ?? credentialOf(userId).emailVerified,
  });
}

function minutesLeft(until: number): number {
  return Math.max(1, Math.ceil((until - Date.now()) / 60000));
}

/**
 * POST /auth/sign-in   { email, password }
 * Returns the signed-in user. A wrong email and a wrong password give the same answer. After five
 * wrong passwords the email is locked for 15 minutes (the same for emails that have no account).
 */
export async function signIn(email: string, password: string): Promise<User> {
  const key = normalizeEmail(email);
  if (!isValidEmail(key) || password === '') throw new ApiError('VALIDATION', WRONG_CREDENTIALS);

  const attempts = loginAttempts.get(key) ?? { count: 0, lockedUntil: 0 };
  if (attempts.lockedUntil > Date.now()) {
    throw new ApiError('VALIDATION', `Too many attempts. Try again in ${minutesLeft(attempts.lockedUntil)} minutes.`);
  }

  const user = users.find((u) => normalizeEmail(u.email) === key);
  const credential = user ? credentialOf(user.id) : null;
  const matches = credential !== null && (await hashPassword(credential.salt, password)) === credential.hash;
  if (!user || !matches) {
    const count = attempts.count + 1;
    loginAttempts.set(key, count >= MAX_FAILED_ATTEMPTS ? { count: 0, lockedUntil: Date.now() + LOCK_MS } : { count, lockedUntil: 0 });
    throw new ApiError('VALIDATION', WRONG_CREDENTIALS);
  }

  loginAttempts.delete(key);
  // The right password for an account whose email was never confirmed: no session yet. The field
  // name lets the page offer to send the email again.
  if (!credential?.emailVerified) {
    throw new ApiError('VALIDATION', 'Confirm your email address first. The link is in the message we sent you.', 'emailNotVerified');
  }
  setSessionUser(user.id);
  return clone(user);
}

/** POST /auth/sign-out: the backend forgets the refresh token. */
export async function signOut(): Promise<void> {
  setSessionUser(null);
}

// ---- Password reset ---------------------------------------------------

/**
 * POST /auth/password-reset   { email }
 * Always answers the same way, so nobody can find out which emails have an account. The real
 * backend emails the link; `devLink` is only for the mock, which has no mailbox.
 */
export async function requestPasswordReset(email: string): Promise<{ devLink: string | null }> {
  const key = normalizeEmail(email);
  if (!isValidEmail(key)) throw new ApiError('VALIDATION', 'Enter a valid email address.', 'email');
  const user = users.find((u) => normalizeEmail(u.email) === key);
  if (!user) return { devLink: null };

  const token = randomToken();
  passwordResets.push({
    userId: user.id,
    tokenHash: await sha256Hex(token),
    expiresAt: Date.now() + RESET_LINK_MS,
    usedAt: null,
  });
  return { devLink: `${window.location.origin}/reset-password/${token}` };
}

async function findOpenReset(token: string) {
  const hash = await sha256Hex(token);
  return passwordResets.find((r) => r.tokenHash === hash && r.usedAt === null && r.expiresAt > Date.now());
}

/** GET /auth/password-reset/{token}: is the link still usable? */
export async function checkPasswordResetLink(token: string): Promise<boolean> {
  return (await findOpenReset(token)) !== undefined;
}

/**
 * POST /auth/password-reset/{token}   { password }
 * Sets the new password and uses up the link. It also clears the sign-in lock.
 */
export async function resetPassword(token: string, password: string): Promise<void> {
  const reset = await findOpenReset(token);
  if (!reset) throw new ApiError('NOT_FOUND', 'This link has expired or was already used.');
  const user = users.find((u) => u.id === reset.userId);
  if (!user) throw new ApiError('NOT_FOUND', 'This link has expired or was already used.');
  const problem = checkPassword(password, { email: user.email, name: user.displayName });
  if (problem) throw new ApiError('VALIDATION', problem, 'password');

  // The reset link went to the mailbox, so a reset also proves the address.
  await storePassword(user.id, password, true);
  reset.usedAt = Date.now();
  loginAttempts.delete(normalizeEmail(user.email));
}

// ---- Sign-up and email verification -------------------------------------

export interface SignUpInput {
  displayName: string;
  email: string;
  password: string;
}

async function startEmailVerification(userId: string): Promise<string> {
  const token = randomToken();
  emailVerifications.push({ userId, tokenHash: await sha256Hex(token), expiresAt: Date.now() + VERIFY_LINK_MS, usedAt: null });
  return `${window.location.origin}/verify-email/${token}`;
}

/**
 * POST /auth/sign-up   { displayName, email, password }
 * Creates an account that cannot sign in until its email is confirmed. The answer is the same
 * whether the address is new or already has an account (then nothing is created and the backend
 * emails the owner that an account exists), so nobody can probe which emails are registered. The
 * real backend emails the link; `devLink` is only for the mock. Limited per address and per IP.
 */
export async function signUp(input: SignUpInput): Promise<{ devLink: string | null }> {
  const displayName = cleanText(input.displayName, 'Name', LIMITS.userName, true, 'displayName');
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) throw new ApiError('VALIDATION', 'Enter a valid email address.', 'email');
  const problem = checkPassword(input.password, { email, name: displayName });
  if (problem) throw new ApiError('VALIDATION', problem, 'password');

  const recent = (signUpAttempts.get(email) ?? []).filter((at) => Date.now() - at < 60 * 60 * 1000);
  if (recent.length >= SIGN_UPS_PER_HOUR) throw new ApiError('VALIDATION', 'Too many attempts. Try again later.');
  signUpAttempts.set(email, [...recent, Date.now()]);

  if (users.some((u) => normalizeEmail(u.email) === email)) return { devLink: null };

  const user = { id: crypto.randomUUID(), email, displayName, avatarUrl: null };
  users.push(user);
  await storePassword(user.id, input.password, false);
  return { devLink: await startEmailVerification(user.id) };
}

async function findOpenVerification(token: string) {
  const hash = await sha256Hex(token);
  return emailVerifications.find((r) => r.tokenHash === hash && r.usedAt === null && r.expiresAt > Date.now());
}

/** GET /auth/verify-email/{token}: is the link still usable? Does not use it up (mail scanners open links). */
export async function checkEmailVerificationLink(token: string): Promise<boolean> {
  return (await findOpenVerification(token)) !== undefined;
}

/** POST /auth/verify-email/{token}: confirms the address. The person then signs in as usual. */
export async function verifyEmail(token: string): Promise<void> {
  const verification = await findOpenVerification(token);
  if (!verification) throw new ApiError('NOT_FOUND', 'This link has expired or was already used.');
  const record = credentials.get(verification.userId);
  if (record) credentials.set(verification.userId, { ...record, emailVerified: true });
  verification.usedAt = Date.now();
}

/**
 * POST /auth/verify-email/resend   { email }
 * Always answers the same way. Only an account that is not confirmed yet gets a new link.
 */
export async function resendVerificationEmail(email: string): Promise<{ devLink: string | null }> {
  const key = normalizeEmail(email);
  if (!isValidEmail(key)) throw new ApiError('VALIDATION', 'Enter a valid email address.', 'email');
  const user = users.find((u) => normalizeEmail(u.email) === key);
  if (!user || isEmailVerified(user.id)) return { devLink: null };
  return { devLink: await startEmailVerification(user.id) };
}
