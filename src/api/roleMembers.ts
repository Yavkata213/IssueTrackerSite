// "View members" of a role: who has a section role (in one section) or a workspace role.
// Same rules as `settings.ts`: scoped by workspace, permission-checked, validated, audited.

import type { RoleMember, User } from '../types';
import { LIMITS } from '../utils/limits';
import { PERMISSION } from '../utils/permissions';
import { ApiError } from './errors';
import {
  clone,
  recordAudit,
  requirePermission,
  requireSection,
  requireWorkspace,
  requireWorkspacePermission,
} from './internal';
import {
  rolePermissionKeys,
  roles,
  sectionMembers,
  users,
  workspaceMembers,
  workspaces,
} from './mockData';
import type { SectionMemberRecord } from './mockData';

const MAX_CANDIDATES = 20;

function userOf(userId: string): User | undefined {
  return users.find((u) => u.id === userId);
}

function matchesSearch(user: User, search: string): boolean {
  const text = search.trim().toLowerCase();
  if (text.length > LIMITS.memberSearch) throw new ApiError('VALIDATION', 'The search text is too long.');
  return text === '' || `${user.displayName} ${user.email}`.toLowerCase().includes(text);
}

function activeWorkspaceMemberIds(workspaceId: string): Set<string> {
  return new Set(
    workspaceMembers.filter((m) => m.workspaceId === workspaceId && m.status === 'ACTIVE').map((m) => m.userId),
  );
}

function requireRole(workspaceId: string, roleId: string, scope: 'SECTION' | 'WORKSPACE') {
  const role = roles.find((r) => r.id === roleId && r.workspaceId === workspaceId && r.scope === scope);
  if (!role) throw new ApiError('NOT_FOUND', 'Role not found.');
  return role;
}

// ---- Section roles --------------------------------------------------

/**
 * GET /workspaces/{workspaceId}/sections/{sectionId}/roles/{roleId}/members
 * Needs `section.settings.edit` (the page it is shown on). Oldest first.
 */
export async function listSectionRoleMembers(
  workspaceId: string,
  sectionId: string,
  roleId: string,
): Promise<RoleMember[]> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.sectionSettingsEdit);
  requireRole(workspaceId, roleId, 'SECTION');

  const rows: RoleMember[] = [];
  for (const record of sectionMembers) {
    const user = userOf(record.userId);
    if (record.sectionId === sectionId && record.workspaceId === workspaceId && record.roleId === roleId && user) {
      rows.push({ user, addedAt: record.addedAt });
    }
  }
  return clone(rows.sort((a, b) => Date.parse(a.addedAt) - Date.parse(b.addedAt)));
}

/**
 * GET /workspaces/{workspaceId}/sections/{sectionId}/member-candidates?search=
 * Active workspace members who are not in the section yet (at most 20). Needs `section.members.manage`.
 */
export async function listSectionMemberCandidates(
  workspaceId: string,
  sectionId: string,
  search: string,
): Promise<User[]> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.membersManage);
  const active = activeWorkspaceMemberIds(workspaceId);
  const inSection = new Set(sectionMembers.filter((m) => m.sectionId === sectionId).map((m) => m.userId));
  return clone(
    users
      .filter((u) => active.has(u.id) && !inSection.has(u.id) && matchesSearch(u, search))
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .slice(0, MAX_CANDIDATES),
  );
}

/**
 * POST /workspaces/{workspaceId}/sections/{sectionId}/members   { userId, roleId }
 * Needs `section.members.manage`. The user must be an active member of the workspace.
 */
export async function addSectionMember(
  workspaceId: string,
  sectionId: string,
  roleId: string,
  userId: string,
): Promise<RoleMember> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.membersManage);
  requireRole(workspaceId, roleId, 'SECTION');
  const user = userOf(userId);
  if (!user || !activeWorkspaceMemberIds(workspaceId).has(userId)) throw new ApiError('NOT_FOUND', 'Member not found.');
  if (sectionMembers.some((m) => m.sectionId === sectionId && m.userId === userId)) {
    throw new ApiError('VALIDATION', 'This person is already in the section.');
  }

  const record: SectionMemberRecord = { workspaceId, sectionId, userId, roleId, addedAt: new Date().toISOString() };
  sectionMembers.push(record);
  recordAudit({ log: 'SECTION', workspaceId, sectionId, action: 'member.added', targetType: 'MEMBER', targetId: userId });
  return clone({ user, addedAt: record.addedAt });
}

/**
 * DELETE /workspaces/{workspaceId}/sections/{sectionId}/members/{userId}
 * Needs `section.members.manage`. Removes the person from the section. Refused when nobody
 * with the permission to manage roles would be left.
 */
export async function removeSectionMember(workspaceId: string, sectionId: string, userId: string): Promise<void> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.membersManage);
  const index = sectionMembers.findIndex((m) => m.sectionId === sectionId && m.userId === userId);
  if (index < 0) throw new ApiError('NOT_FOUND', 'Member not found.');

  const remainingManagers = sectionMembers.filter(
    (m, i) =>
      i !== index &&
      m.sectionId === sectionId &&
      (rolePermissionKeys[m.roleId] ?? []).includes(PERMISSION.membersManage),
  );
  if (remainingManagers.length === 0) {
    throw new ApiError('VALIDATION', 'A section needs at least one member who can manage roles.');
  }
  sectionMembers.splice(index, 1);
  recordAudit({ log: 'SECTION', workspaceId, sectionId, action: 'member.removed', targetType: 'MEMBER', targetId: userId });
}

// ---- Workspace roles ------------------------------------------------

/**
 * GET /workspaces/{workspaceId}/roles/{roleId}/members
 * Needs `workspace.settings.roles`. Ordered by the date they joined the workspace.
 */
export async function listWorkspaceRoleMembers(workspaceId: string, roleId: string): Promise<RoleMember[]> {
  requireWorkspace(workspaceId);
  requireWorkspacePermission(workspaceId, PERMISSION.workspaceRolesManage);
  requireRole(workspaceId, roleId, 'WORKSPACE');

  const rows: RoleMember[] = [];
  for (const record of workspaceMembers) {
    const user = userOf(record.userId);
    if (record.workspaceId === workspaceId && record.roleId === roleId && user) {
      rows.push({ user, addedAt: record.joinedAt });
    }
  }
  return clone(rows.sort((a, b) => Date.parse(a.addedAt) - Date.parse(b.addedAt)));
}

/**
 * GET /workspaces/{workspaceId}/roles/{roleId}/member-candidates?search=
 * Active members who have another role (at most 20; the owner is never offered).
 * Needs `workspace.members.roles.assign`.
 */
export async function listWorkspaceRoleCandidates(
  workspaceId: string,
  roleId: string,
  search: string,
): Promise<User[]> {
  const workspace = requireWorkspace(workspaceId);
  requireWorkspacePermission(workspaceId, PERMISSION.workspaceMembersAssignRoles);
  requireRole(workspaceId, roleId, 'WORKSPACE');
  const candidates: User[] = [];
  for (const record of workspaceMembers) {
    const user = userOf(record.userId);
    if (
      user &&
      record.workspaceId === workspaceId &&
      record.status === 'ACTIVE' &&
      record.roleId !== roleId &&
      record.userId !== workspace.ownerId &&
      matchesSearch(user, search)
    ) {
      candidates.push(user);
    }
  }
  return clone(candidates.sort((a, b) => a.displayName.localeCompare(b.displayName)).slice(0, MAX_CANDIDATES));
}

function requireAssignableMember(workspaceId: string, userId: string) {
  const workspace = workspaces.find((w) => w.id === workspaceId);
  const record = workspaceMembers.find((m) => m.workspaceId === workspaceId && m.userId === userId);
  if (!workspace || !record) throw new ApiError('NOT_FOUND', 'Member not found.');
  if (workspace.ownerId === userId) throw new ApiError('FORBIDDEN', 'The role of the workspace owner cannot be changed.');
  return { workspace, record };
}

/**
 * PUT /workspaces/{workspaceId}/members/{userId}/role   { roleId }
 * Needs `workspace.members.roles.assign`. A member has one workspace role, so this replaces
 * the previous one. The Owner role cannot be handed out here.
 */
export async function assignWorkspaceRole(workspaceId: string, roleId: string, userId: string): Promise<RoleMember> {
  requireWorkspace(workspaceId);
  requireWorkspacePermission(workspaceId, PERMISSION.workspaceMembersAssignRoles);
  const role = requireRole(workspaceId, roleId, 'WORKSPACE');
  if (role.isSystem) throw new ApiError('VALIDATION', 'The Owner role cannot be assigned here.');
  const { record } = requireAssignableMember(workspaceId, userId);
  const user = userOf(userId);
  if (!user) throw new ApiError('NOT_FOUND', 'Member not found.');

  record.roleId = roleId;
  recordAudit({ log: 'WORKSPACE', workspaceId, sectionId: null, action: 'member.role.changed', targetType: 'MEMBER', targetId: userId });
  return clone({ user, addedAt: record.joinedAt });
}

/**
 * DELETE /workspaces/{workspaceId}/roles/{roleId}/members/{userId}
 * Needs `workspace.members.roles.assign`. A member cannot be without a workspace role, so the
 * person gets the default role of the workspace.
 */
export async function resetWorkspaceMemberRole(workspaceId: string, roleId: string, userId: string): Promise<void> {
  const workspace = requireWorkspace(workspaceId);
  requireWorkspacePermission(workspaceId, PERMISSION.workspaceMembersAssignRoles);
  requireRole(workspaceId, roleId, 'WORKSPACE');
  const { record } = requireAssignableMember(workspaceId, userId);
  if (record.roleId !== roleId) throw new ApiError('NOT_FOUND', 'Member not found.');
  if (!workspace.defaultRoleId || workspace.defaultRoleId === roleId) {
    throw new ApiError('VALIDATION', 'This is the default role. Give the person another role instead.');
  }
  record.roleId = workspace.defaultRoleId;
  recordAudit({ log: 'WORKSPACE', workspaceId, sectionId: null, action: 'member.role.changed', targetType: 'MEMBER', targetId: userId });
}
