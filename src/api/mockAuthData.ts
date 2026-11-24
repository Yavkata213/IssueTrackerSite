// In-memory stand-ins for the account tables the sign-in and invitation flows need.
// The real backend keeps password hashes (bcrypt or argon2) and token hashes in the database.
// The mock only has SHA-256 to hand, which is fine for a stand-in and never meant for production.

import type { InvitationStatus } from '../types';

const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

/** Hash of the password every seed account has (see docs/demo-accounts.md). The password itself is not in the code. */
export const DEMO_PASSWORD_SALT = 'demo';
export const DEMO_PASSWORD_HASH = '131d9c36b065dd165e6fbffc7038378f1af47e6f52a7c37d3b09065f39b532b9';

export interface CredentialRecord {
  salt: string;
  hash: string;
  /** False until the link in the sign-up email was opened. Seed accounts are verified. */
  emailVerified: boolean;
}

/** Accounts created after the seed, and seed accounts whose password was changed. */
export const credentials = new Map<string, CredentialRecord>();

/** Failed sign-ins per email (also for emails without an account, so the answer never reveals which exist). */
export const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export interface InvitationRecord {
  id: string;
  workspaceId: string;
  email: string;
  roleId: string;
  invitedBy: string | null;
  /** Only the hash of the token is kept. */
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  acceptedBy: string | null;
}

export const invitationRecords: InvitationRecord[] = [
  {
    id: 'inv-daniel',
    workspaceId: 'ws-acme',
    email: 'daniel.hristov@acme.example',
    roleId: 'ws-acme-wrole-member',
    invitedBy: 'user-maria',
    tokenHash: '62384b11e729015b05826d77fe2b9348971d7bed830fb0d2844a22ec26ba377e',
    status: 'PENDING',
    expiresAt: new Date(NOW + 5 * DAY_MS).toISOString(),
    createdAt: new Date(NOW - 2 * DAY_MS).toISOString(),
    acceptedAt: null,
    acceptedBy: null,
  },
  {
    id: 'inv-ivan',
    workspaceId: 'ws-acme',
    email: 'ivan.stoyanov@acme.example',
    roleId: 'ws-acme-wrole-people-manager',
    invitedBy: 'user-maria',
    tokenHash: '303ccb51809aa702d7c056f767a459e52e0d4d633e1ecc191cc0643248b0b310',
    status: 'PENDING',
    expiresAt: new Date(NOW + 3 * DAY_MS).toISOString(),
    createdAt: new Date(NOW - 4 * DAY_MS).toISOString(),
    acceptedAt: null,
    acceptedBy: null,
  },
];

export interface PasswordResetRecord {
  userId: string;
  tokenHash: string;
  expiresAt: number;
  usedAt: number | null;
}

export const passwordResets: PasswordResetRecord[] = [];

/** Links in the "confirm your email" message (the backend keeps them in `account_tokens`, purpose VERIFY_EMAIL). */
export const emailVerifications: PasswordResetRecord[] = [];

/** Sign-ups per email in the last hour, so one address cannot be used to flood a mailbox. */
export const signUpAttempts = new Map<string, number[]>();
