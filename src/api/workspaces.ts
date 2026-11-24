// Creating a workspace. Anyone with an account can start one; they become its Owner. (Changing a
// workspace is in `workspace.ts`; this is the only call that is not scoped to an existing one.)

import type { Workspace } from '../types';
import { LIMITS } from '../utils/limits';
import { isValidWorkspaceSlug } from '../utils/workspaceSlug';
import { ApiError } from './errors';
import { cleanText, clone, recordAudit } from './internal';
import {
  createDefaultRoles,
  pinnedSectionIds,
  sectionMembers,
  sections,
  statuses,
  workspaceMembers,
  workspaceMeta,
  workspaces,
} from './mockData';
import { currentUserId } from './session';

/** Most workspaces one account can own. The backend applies the same limit. */
const MAX_OWNED_WORKSPACES = 5;

export interface CreateWorkspaceInput {
  name: string;
  /** Lowercase letters, digits and hyphens; unique across all workspaces. */
  slug: string;
}

/**
 * POST /workspaces   { name, slug }
 * The signed-in user becomes the Owner. The backend creates, in one transaction: the workspace,
 * the default roles and their permissions, the owner's membership, and a first section ("General",
 * key GEN) with the statuses To do, In progress and Done, so there is something to open at once.
 * Returns the new workspace.
 */
export async function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  const userId = currentUserId();
  const name = cleanText(input.name, 'Workspace name', LIMITS.workspaceName, true, 'name');
  const slug = input.slug.trim();
  if (!isValidWorkspaceSlug(slug)) {
    throw new ApiError(
      'VALIDATION',
      `Use ${LIMITS.workspaceSlugMin}–${LIMITS.workspaceSlugMax} lowercase letters, digits and hyphens.`,
      'slug',
    );
  }
  if (workspaces.some((w) => w.slug === slug)) {
    throw new ApiError('VALIDATION', 'This URL is already used by another workspace.', 'slug');
  }
  if (workspaces.filter((w) => w.ownerId === userId).length >= MAX_OWNED_WORKSPACES) {
    throw new ApiError('VALIDATION', `You can own at most ${MAX_OWNED_WORKSPACES} workspaces.`);
  }

  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name,
    slug,
    ownerId: userId,
    logoUrl: null,
    defaultRoleId: null,
  };
  workspaces.push(workspace);
  workspaceMeta[workspace.id] = { unread: 0 };
  const { ownerRoleId, defaultRoleId } = createDefaultRoles(workspace.id);
  workspace.defaultRoleId = defaultRoleId;
  const now = new Date().toISOString();
  workspaceMembers.push({
    workspaceId: workspace.id,
    userId,
    roleId: ownerRoleId,
    status: 'ACTIVE',
    joinedAt: now,
    lastActiveAt: now,
  });

  const section = {
    id: crypto.randomUUID(),
    workspaceId: workspace.id,
    name: 'General',
    key: 'GEN',
    icon: 'folder',
    description: 'A first section to start with. Rename it or add more in the settings.',
  };
  sections.push(section);
  [
    { name: 'To do', color: '#0288D1', isDefault: true },
    { name: 'In progress', color: '#ED6C02', isDefault: false },
    { name: 'Done', color: '#2E7D32', isDefault: false },
  ].forEach((status, position) =>
    statuses.push({ id: crypto.randomUUID(), workspaceId: workspace.id, sectionId: section.id, position, ...status }),
  );
  sectionMembers.push({
    workspaceId: workspace.id,
    sectionId: section.id,
    userId,
    roleId: `${workspace.id}-role-admin`,
    addedAt: now,
  });
  pinnedSectionIds[workspace.id] = [section.id];

  recordAudit({ log: 'WORKSPACE', workspaceId: workspace.id, sectionId: null, action: 'workspace.created', targetType: 'WORKSPACE', targetId: workspace.id });
  return clone(workspace);
}
