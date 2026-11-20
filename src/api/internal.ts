// Helpers shared by the mock API functions. Not exported from `src/api`: pages never use them.
// Each one stands in for something the real backend does on every request.

import type { Permission, RoleScope, Section, Workspace } from '../types';
import { LIMITS } from '../utils/limits';
import type { PermissionKey } from '../utils/permissions';
import { ApiError } from './errors';
import {
  auditLog,
  CURRENT_USER_ID,
  rolePermissionKeys,
  roles,
  sectionKeyHistory,
  sectionMembers,
  sections,
  workspaceMembers,
  workspaces,
} from './mockData';
import type { AuditEntry } from './mockData';

export const DEFAULT_ROLE = 'Member';

export function clone<T>(value: T): T {
  return structuredClone(value);
}

/** The section, only if it belongs to the workspace. Never returns another workspace's data. */
export function requireSection(workspaceId: string, sectionId: string): Section {
  const section = sections.find((s) => s.id === sectionId && s.workspaceId === workspaceId);
  if (!section) throw new ApiError('NOT_FOUND', 'Section not found.');
  return section;
}

/** Finds a section by its current key, or by an old key (section_key_history). */
export function findSectionByKey(workspaceId: string, key: string): Section | undefined {
  const wanted = key.toUpperCase();
  const current = sections.find((s) => s.workspaceId === workspaceId && s.key === wanted);
  if (current) return current;
  const old = sectionKeyHistory.find((h) => h.workspaceId === workspaceId && h.oldKey === wanted);
  return old ? sections.find((s) => s.id === old.sectionId && s.workspaceId === workspaceId) : undefined;
}

/** The workspace, only if the current user is an active member of it. */
export function requireWorkspace(workspaceId: string): Workspace {
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace || !currentWorkspaceMembership(workspaceId)) throw new ApiError('NOT_FOUND', 'Workspace not found.');
  return workspace;
}

function currentWorkspaceMembership(workspaceId: string) {
  return workspaceMembers.find(
    (m) => m.workspaceId === workspaceId && m.userId === CURRENT_USER_ID && m.status === 'ACTIVE',
  );
}

/** Name of the current user's workspace role. */
export function workspaceRoleNameOf(workspaceId: string): string {
  const membership = currentWorkspaceMembership(workspaceId);
  return roles.find((r) => r.id === membership?.roleId)?.name ?? DEFAULT_ROLE;
}

/** Workspace permission keys the current user has. */
export function workspacePermissionsOf(workspaceId: string): string[] {
  const membership = currentWorkspaceMembership(workspaceId);
  return membership ? [...(rolePermissionKeys[membership.roleId] ?? [])] : [];
}

export function requireWorkspacePermission(workspaceId: string, key: PermissionKey): void {
  if (!workspacePermissionsOf(workspaceId).includes(key)) {
    throw new ApiError('FORBIDDEN', 'You do not have permission to do this.');
  }
}

function currentMembership(sectionId: string) {
  return sectionMembers.find((m) => m.sectionId === sectionId && m.userId === CURRENT_USER_ID);
}

/** Name of the current user's role in the section. */
export function roleNameOf(sectionId: string): string {
  const membership = currentMembership(sectionId);
  return roles.find((r) => r.id === membership?.roleId)?.name ?? DEFAULT_ROLE;
}

/** Permission keys the current user has in the section. */
export function permissionsOf(sectionId: string): string[] {
  const membership = currentMembership(sectionId);
  return membership ? [...(rolePermissionKeys[membership.roleId] ?? [])] : [];
}

export function requirePermission(sectionId: string, key: PermissionKey): void {
  if (!permissionsOf(sectionId).includes(key)) {
    throw new ApiError('FORBIDDEN', 'You do not have permission to do this.');
  }
}

/** Trims a text input and checks its length. Throws VALIDATION with a message the form can show. */
export function cleanText(value: string, label: string, max: number, required: boolean, field?: string): string {
  const text = value.trim();
  if (required && text.length === 0) throw new ApiError('VALIDATION', `${label} is required.`, field);
  if (text.length > max) throw new ApiError('VALIDATION', `${label} must be at most ${max} characters.`, field);
  return text;
}

export function recordAudit(entry: Omit<AuditEntry, 'id' | 'actorId' | 'createdAt'>): void {
  auditLog.push({
    ...entry,
    id: crypto.randomUUID(),
    actorId: CURRENT_USER_ID,
    createdAt: new Date().toISOString(),
  });
}

export interface RoleInput {
  name: string;
  description: string;
  /** Keys from the permission catalog of the role's scope. */
  permissionKeys: string[];
}

/** Validates the input of a role (section or workspace scope). `roleId` is null for a new role. */
export function readRoleInput(
  workspaceId: string,
  scope: RoleScope,
  catalog: Permission[],
  roleId: string | null,
  input: RoleInput,
): { name: string; description: string | null; permissionKeys: string[] } {
  const name = cleanText(input.name, 'Role name', LIMITS.roleName, true, 'name');
  const description = cleanText(input.description, 'Description', LIMITS.roleDescription, false);
  const taken = roles.some(
    (r) => r.workspaceId === workspaceId && r.scope === scope && r.id !== roleId && r.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) throw new ApiError('VALIDATION', 'A role with this name already exists.', 'name');

  const known = new Set(catalog.map((p) => p.key));
  const permissionKeys = [...new Set(input.permissionKeys)];
  if (permissionKeys.some((k) => !known.has(k))) throw new ApiError('VALIDATION', 'Unknown permission.');
  return { name, description: description === '' ? null : description, permissionKeys };
}
