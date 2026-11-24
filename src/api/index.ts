// Thin API layer. Pages only talk to these functions; today they read and write
// the in-memory mock store, later each one becomes a REST call (axios + JWT).
//
// Rules every function follows, so the swap needs no page changes:
// - async, typed, returns clones (never references into the store);
// - every workspace-owned read or write takes `workspaceId` (and the parent id), the
//   way the real URL will be `/workspaces/{id}/sections/{id}/...`;
// - the mock checks scope, permission and input like the server will, and throws ApiError;
// - the current user is implicit (the JWT), it is never passed in.

import type { SectionBoardData, SidebarSection, Status, User, WorkspaceSummary } from '../types';
import { PERMISSION } from '../utils/permissions';
import { ApiError } from './errors';
import { currentUserId } from './session';
import {
  clone,
  findSectionByKey,
  permissionsOf,
  requirePermission,
  requireSection,
  roleNameOf,
  workspacePermissionsOf,
  workspaceRoleNameOf,
} from './internal';
import {
  categories,
  issueRecords,
  pinnedSectionIds,
  sections,
  statuses,
  users,
  workspaceMembers,
  workspaceMeta,
  workspaces,
} from './mockData';

export { ApiError, getErrorMessage } from './errors';
export * from './settings';
export * from './workspace';

/** GET /me */
export async function getCurrentUser(): Promise<User> {
  const current = users.find((u) => u.id === currentUserId());
  if (!current) throw new ApiError('NOT_FOUND', 'Current user not found.');
  return clone(current);
}

/** GET /workspaces: workspaces of the current user, with member count, the user's role and permissions. */
export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  return clone(
    workspaces
      .filter((workspace) => workspaceMembers.some((m) => m.workspaceId === workspace.id && m.userId === currentUserId()))
      .map((workspace) => ({
        ...workspace,
        memberCount: workspaceMembers.filter((m) => m.workspaceId === workspace.id).length,
        roleName: workspaceRoleNameOf(workspace.id),
        permissions: workspacePermissionsOf(workspace.id),
      })),
  );
}

/** GET /workspaces/{workspaceId}/sections: sections the user belongs to, with pin state and role. */
export async function listSidebarSections(workspaceId: string): Promise<SidebarSection[]> {
  const pinned = pinnedSectionIds[workspaceId] ?? [];
  return clone(
    sections
      .filter((s) => s.workspaceId === workspaceId)
      .map((s) => ({
        ...s,
        pinned: pinned.includes(s.id),
        roleName: roleNameOf(s.id),
      })),
  );
}

/** PUT or DELETE /workspaces/{workspaceId}/sections/{sectionId}/pin */
export async function setSectionPinned(
  workspaceId: string,
  sectionId: string,
  pinned: boolean,
): Promise<void> {
  requireSection(workspaceId, sectionId);
  const current = pinnedSectionIds[workspaceId] ?? [];
  const without = current.filter((id) => id !== sectionId);
  pinnedSectionIds[workspaceId] = pinned ? [...without, sectionId] : without;
}

/** GET /workspaces/{workspaceId}/notifications/unread-count */
export async function getUnreadNotificationCount(workspaceId: string): Promise<number> {
  return workspaceMeta[workspaceId]?.unread ?? 0;
}

/**
 * GET /workspaces/{workspaceId}/sections/by-key/{sectionKey}/board
 * Returns `null` when the workspace has no section with this key.
 */
export async function getSectionBoard(
  workspaceId: string,
  sectionKey: string,
): Promise<SectionBoardData | null> {
  const section = findSectionByKey(workspaceId, sectionKey);
  if (!section) return null;

  const sectionStatuses = statuses
    .filter((s) => s.sectionId === section.id)
    .sort((a, b) => a.position - b.position);
  const records = issueRecords.filter((r) => r.issue.sectionId === section.id);
  const assigneeIds = new Set(records.flatMap((r) => r.assigneeIds));

  return clone({
    section,
    sectionRoleName: roleNameOf(section.id),
    permissions: permissionsOf(section.id),
    statuses: sectionStatuses,
    categories: categories.filter((c) => c.sectionId === section.id),
    members: users.filter((u) => assigneeIds.has(u.id) || u.id === currentUserId()),
    issues: records.map((r) => ({
      ...r.issue,
      categoryIds: r.categoryIds,
      assigneeIds: r.assigneeIds,
    })),
  });
}

export interface MoveIssueInput {
  statusId: string;
  boardPosition: number;
}

/**
 * PATCH /workspaces/{workspaceId}/sections/{sectionId}/issues/{issueId}/board-position
 * Needs `issue.move`. The status must belong to the same section.
 */
export async function moveIssue(
  workspaceId: string,
  sectionId: string,
  issueId: string,
  input: MoveIssueInput,
): Promise<void> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.issueMove);

  const record = issueRecords.find(
    (r) =>
      r.issue.id === issueId && r.issue.sectionId === sectionId && r.issue.workspaceId === workspaceId,
  );
  if (!record) throw new ApiError('NOT_FOUND', 'Issue not found.');

  const status = statuses.find(
    (s) => s.id === input.statusId && s.sectionId === sectionId && s.workspaceId === workspaceId,
  );
  if (!status) throw new ApiError('VALIDATION', 'Unknown status.');
  if (!Number.isFinite(input.boardPosition)) throw new ApiError('VALIDATION', 'Invalid position.');

  record.issue.statusId = input.statusId;
  record.issue.boardPosition = input.boardPosition;
  record.issue.updatedAt = new Date().toISOString();
}

/**
 * PUT /workspaces/{workspaceId}/sections/{sectionId}/statuses/order
 * Needs `status.reorder`. `orderedStatusIds` must list every status of the section once;
 * `orderedStatusIds[i]` gets position `i`.
 */
export async function reorderStatuses(
  workspaceId: string,
  sectionId: string,
  orderedStatusIds: string[],
): Promise<Status[]> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.statusesManage);

  const current = statuses.filter((s) => s.sectionId === sectionId && s.workspaceId === workspaceId);
  const isCompleteList =
    orderedStatusIds.length === current.length &&
    new Set(orderedStatusIds).size === current.length &&
    current.every((s) => orderedStatusIds.includes(s.id));
  if (!isCompleteList) throw new ApiError('VALIDATION', 'The status order is not valid.');

  orderedStatusIds.forEach((statusId, index) => {
    const status = current.find((s) => s.id === statusId);
    if (status) status.position = index;
  });
  return clone([...current].sort((a, b) => a.position - b.position));
}
export * from './roleMembers';
export * from './issues';
export * from './auth';
export * from './invitations';
export { hasSession } from './session';
export * from './workspaces';
