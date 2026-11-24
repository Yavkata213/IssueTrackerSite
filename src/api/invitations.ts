// Invitations: how people get into a workspace. An admin invites an email address; the person opens
// the emailed link, either signs in (the email already has an account) or chooses a password (a new
// account is created then). Same rules as the other API files.

import type { InvitationInfo, InvitationPreview, InvitationSent, MyInvitation, User, WorkspaceMember } from '../types';
import { checkPassword, isValidEmail, normalizeEmail } from '../utils/accounts';
import { LIMITS } from '../utils/limits';
import { PERMISSION } from '../utils/permissions';
import { isEmailVerified, storePassword } from './auth';
import { ApiError } from './errors';
import { cleanText, clone, recordAudit, requireWorkspace, requireWorkspacePermission } from './internal';
import { invitationRecords } from './mockAuthData';
import type { InvitationRecord } from './mockAuthData';
import { roles, users, workspaceMembers, workspaces } from './mockData';
import { currentUserId, setSessionUser } from './session';
import { randomToken, sha256Hex } from './tokens';

const INVITATION_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const NO_LONGER_VALID = 'This invitation is no longer valid.';

function isExpired(record: InvitationRecord): boolean {
  return record.status === 'PENDING' && Date.parse(record.expiresAt) < Date.now();
}

function toInfo(record: InvitationRecord): InvitationInfo {
  const inviter = users.find((u) => u.id === record.invitedBy);
  return {
    id: record.id,
    email: record.email,
    invitedByName: inviter?.displayName ?? null,
    expiresAt: record.expiresAt,
    expired: isExpired(record),
  };
}

/** Pending (and run-out) invitations of a workspace as rows of the members table. */
export function invitationRows(workspaceId: string): WorkspaceMember[] {
  return invitationRecords
    .filter((r) => r.workspaceId === workspaceId && r.status === 'PENDING')
    .map((r) => ({
      user: { id: r.id, email: r.email, displayName: r.email, avatarUrl: null },
      roleId: r.roleId,
      roleName: roles.find((role) => role.id === r.roleId)?.name ?? '',
      status: 'INVITED' as const,
      invitation: toInfo(r),
      joinedAt: r.createdAt,
      lastActiveAt: null,
      sectionRoles: [],
    }));
}

function newLink(token: string): string {
  return `${window.location.origin}/invitations/${token}`;
}

// ---- Admin side ---------------------------------------------------------

export interface InvitationInput {
  email: string;
  /** A WORKSPACE-scope role of the workspace; not the Owner role. */
  roleId: string;
}

/**
 * POST /workspaces/{workspaceId}/invitations   { email, roleId }
 * Needs `workspace.members.invite`. The link is emailed; the response never contains it. The mock
 * has no mailbox, so it returns `devLink` for the developer.
 */
export async function createInvitation(workspaceId: string, input: InvitationInput): Promise<InvitationSent> {
  requireWorkspace(workspaceId);
  requireWorkspacePermission(workspaceId, PERMISSION.workspaceMembersInvite);

  const email = normalizeEmail(cleanText(input.email, 'Email', LIMITS.email, true, 'email'));
  if (!isValidEmail(email)) throw new ApiError('VALIDATION', 'Enter a valid email address.', 'email');
  const role = roles.find((r) => r.id === input.roleId && r.workspaceId === workspaceId && r.scope === 'WORKSPACE');
  if (!role || role.isSystem) throw new ApiError('VALIDATION', 'Choose one of the workspace roles.', 'roleId');

  const account = users.find((u) => normalizeEmail(u.email) === email);
  if (account && workspaceMembers.some((m) => m.workspaceId === workspaceId && m.userId === account.id)) {
    throw new ApiError('VALIDATION', 'This person is already a member of the workspace.', 'email');
  }
  const open = invitationRecords.find((r) => r.workspaceId === workspaceId && r.email === email && r.status === 'PENDING');
  if (open) {
    // One open invitation per email: a run-out one is replaced, a live one is refused.
    if (!isExpired(open)) throw new ApiError('VALIDATION', 'This email already has an open invitation.', 'email');
    open.status = 'REVOKED';
  }

  const token = randomToken();
  const record: InvitationRecord = {
    id: crypto.randomUUID(),
    workspaceId,
    email,
    roleId: role.id,
    invitedBy: currentUserId(),
    tokenHash: await sha256Hex(token),
    status: 'PENDING',
    expiresAt: new Date(Date.now() + INVITATION_DAYS * DAY_MS).toISOString(),
    createdAt: new Date().toISOString(),
    acceptedAt: null,
    acceptedBy: null,
  };
  invitationRecords.push(record);
  recordAudit({ log: 'WORKSPACE', workspaceId, sectionId: null, action: 'invitation.created', targetType: 'INVITATION', targetId: record.id });
  return clone({ invitation: toInfo(record), devLink: newLink(token) });
}

function requireOwnInvitation(workspaceId: string, invitationId: string): InvitationRecord {
  const record = invitationRecords.find((r) => r.id === invitationId && r.workspaceId === workspaceId && r.status === 'PENDING');
  if (!record) throw new ApiError('NOT_FOUND', 'Invitation not found.');
  return record;
}

/**
 * POST /workspaces/{workspaceId}/invitations/{invitationId}/resend
 * Needs `workspace.members.invite`. A new link replaces the old one, and the week starts again.
 */
export async function resendInvitation(workspaceId: string, invitationId: string): Promise<InvitationSent> {
  requireWorkspace(workspaceId);
  requireWorkspacePermission(workspaceId, PERMISSION.workspaceMembersInvite);
  const record = requireOwnInvitation(workspaceId, invitationId);

  const token = randomToken();
  record.tokenHash = await sha256Hex(token);
  record.expiresAt = new Date(Date.now() + INVITATION_DAYS * DAY_MS).toISOString();
  return clone({ invitation: toInfo(record), devLink: newLink(token) });
}

/** DELETE /workspaces/{workspaceId}/invitations/{invitationId}. Needs `workspace.members.invite`. */
export async function revokeInvitation(workspaceId: string, invitationId: string): Promise<void> {
  requireWorkspace(workspaceId);
  requireWorkspacePermission(workspaceId, PERMISSION.workspaceMembersInvite);
  const record = requireOwnInvitation(workspaceId, invitationId);
  record.status = 'REVOKED';
  recordAudit({ log: 'WORKSPACE', workspaceId, sectionId: null, action: 'invitation.revoked', targetType: 'INVITATION', targetId: record.id });
}

// ---- The invited person ------------------------------------------------

async function findUsableInvitation(token: string): Promise<InvitationRecord | undefined> {
  const hash = await sha256Hex(token);
  const record = invitationRecords.find((r) => r.tokenHash === hash && r.status === 'PENDING');
  return record && !isExpired(record) ? record : undefined;
}

/**
 * GET /invitations/{token}   (public)
 * What the invitation page shows. `null` for any link that does not work (wrong, used, revoked or
 * expired), so nothing is revealed about why.
 */
export async function getInvitationPreview(token: string): Promise<InvitationPreview | null> {
  const record = await findUsableInvitation(token);
  if (!record) return null;
  const workspace = workspaces.find((w) => w.id === record.workspaceId);
  if (!workspace) return null;
  return clone({
    email: record.email,
    workspaceName: workspace.name,
    workspaceLogoUrl: workspace.logoUrl,
    invitedByName: users.find((u) => u.id === record.invitedBy)?.displayName ?? null,
    roleName: roles.find((r) => r.id === record.roleId)?.name ?? '',
    // An account whose email was never confirmed does not count: the link itself proves the email.
    accountExists: users.some((u) => normalizeEmail(u.email) === record.email && isEmailVerified(u.id)),
  });
}

function join(record: InvitationRecord, userId: string): void {
  if (!workspaceMembers.some((m) => m.workspaceId === record.workspaceId && m.userId === userId)) {
    workspaceMembers.push({
      workspaceId: record.workspaceId,
      userId,
      roleId: record.roleId,
      status: 'ACTIVE',
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    });
  }
  record.status = 'ACCEPTED';
  record.acceptedAt = new Date().toISOString();
  record.acceptedBy = userId;
  recordAudit({ log: 'WORKSPACE', workspaceId: record.workspaceId, sectionId: null, action: 'invitation.accepted', targetType: 'INVITATION', targetId: record.id });
}

export interface AcceptInvitationInput {
  displayName: string;
  password: string;
}

/**
 * POST /invitations/{token}/accept   { displayName, password }   (public)
 * For an email that has no account yet: creates the account (the link proves the email), joins
 * the workspace and signs the person in. Returns the new user.
 */
export async function acceptInvitation(token: string, input: AcceptInvitationInput): Promise<User> {
  const record = await findUsableInvitation(token);
  if (!record) throw new ApiError('NOT_FOUND', NO_LONGER_VALID);
  const existing = users.find((u) => normalizeEmail(u.email) === record.email);
  if (existing && isEmailVerified(existing.id)) {
    throw new ApiError('VALIDATION', 'This email already has an account. Sign in to accept the invitation.');
  }
  const displayName = cleanText(input.displayName, 'Name', LIMITS.userName, true, 'displayName');
  const problem = checkPassword(input.password, { email: record.email, name: displayName });
  if (problem) throw new ApiError('VALIDATION', problem, 'password');

  // An unconfirmed account for this address (someone signed up with it) is taken over: the owner of
  // the mailbox is the one who opened this link.
  const user: User = existing ?? { id: crypto.randomUUID(), email: record.email, displayName, avatarUrl: null };
  if (existing) existing.displayName = displayName;
  else users.push(user);
  await storePassword(user.id, input.password, true);
  // The new account is the actor of what follows (the audit entry), so it is signed in first.
  setSessionUser(user.id);
  join(record, user.id);
  return clone(user);
}

/**
 * POST /invitations/{token}/accept   (signed in)
 * For someone who already has an account: it must be the account of the invited email. Returns
 * the id of the workspace they joined.
 */
export async function acceptInvitationAsCurrentUser(token: string): Promise<{ workspaceId: string }> {
  const userId = currentUserId();
  const record = await findUsableInvitation(token);
  if (!record) throw new ApiError('NOT_FOUND', NO_LONGER_VALID);
  const user = users.find((u) => u.id === userId);
  if (!user || normalizeEmail(user.email) !== record.email) {
    throw new ApiError('FORBIDDEN', 'This invitation was sent to another email address. Sign in with that account.');
  }
  join(record, user.id);
  return { workspaceId: record.workspaceId };
}

// ---- Invitations of the signed-in person --------------------------------

/**
 * GET /me/invitations
 * Open invitations sent to the email of the signed-in account, so a person who has no workspace
 * yet can join without the emailed link. Safe because signing in proved the email.
 */
export async function listMyInvitations(): Promise<MyInvitation[]> {
  const me = users.find((u) => u.id === currentUserId());
  if (!me) return [];
  return clone(
    invitationRecords
      .filter((r) => r.status === 'PENDING' && !isExpired(r) && r.email === normalizeEmail(me.email))
      .map((r) => ({
        id: r.id,
        workspaceName: workspaces.find((w) => w.id === r.workspaceId)?.name ?? '',
        workspaceLogoUrl: workspaces.find((w) => w.id === r.workspaceId)?.logoUrl ?? null,
        invitedByName: users.find((u) => u.id === r.invitedBy)?.displayName ?? null,
        roleName: roles.find((role) => role.id === r.roleId)?.name ?? '',
        expiresAt: r.expiresAt,
      })),
  );
}

/** POST /me/invitations/{invitationId}/accept. Only an invitation sent to the signed-in account's email. */
export async function acceptMyInvitation(invitationId: string): Promise<{ workspaceId: string }> {
  const me = users.find((u) => u.id === currentUserId());
  const record = invitationRecords.find((r) => r.id === invitationId && r.status === 'PENDING' && !isExpired(r));
  if (!me || !record || record.email !== normalizeEmail(me.email)) throw new ApiError('NOT_FOUND', NO_LONGER_VALID);
  join(record, me.id);
  return { workspaceId: record.workspaceId };
}
