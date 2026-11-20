// Section settings API: General, Members and roles, Category. Same rules as `index.ts`:
// scoped by workspace and section, validated and permission-checked like the server will,
// every write is recorded in the audit log, and `ApiError` is thrown for refusals.

import type {
  Category,
  CategoryDetail,
  Role,
  Section,
  RoleDetail,
  SectionSettingsData,
} from '../types';
import { isHexColor } from '../utils/colors';
import { LIMITS } from '../utils/limits';
import { PERMISSION } from '../utils/permissions';
import { isSectionIconName } from '../utils/sectionIcons';
import { ApiError } from './errors';
import {
  categories,
  issueRecords,
  permissionCatalog,
  rolePermissionKeys,
  roles,
  sectionKeyHistory,
  sectionMembers,
  sections,
} from './mockData';
import type { RoleInput } from './internal';
import {
  cleanText,
  clone,
  findSectionByKey,
  permissionsOf,
  readRoleInput,
  recordAudit,
  requirePermission,
  requireSection,
} from './internal';

const SECTION_KEY = /^[A-Z]{2,5}$/;

function toRoleDetail(role: Role, sectionId: string): RoleDetail {
  return {
    ...role,
    memberCount: sectionMembers.filter((m) => m.sectionId === sectionId && m.roleId === role.id).length,
    permissionKeys: [...(rolePermissionKeys[role.id] ?? [])],
  };
}

function toCategoryDetail(category: Category): CategoryDetail {
  const issueCount = issueRecords.filter(
    (r) => r.issue.sectionId === category.sectionId && r.categoryIds.includes(category.id),
  ).length;
  return { ...category, issueCount };
}

function sectionRolesOf(workspaceId: string): Role[] {
  return roles.filter((r) => r.workspaceId === workspaceId && r.scope === 'SECTION');
}

/**
 * GET /workspaces/{workspaceId}/sections/by-key/{sectionKey}/settings
 * Returns `null` when the section does not exist (an old key still finds the section).
 * Throws FORBIDDEN without `section.settings.edit`.
 */
export async function getSectionSettings(
  workspaceId: string,
  sectionKey: string,
): Promise<SectionSettingsData | null> {
  const section = findSectionByKey(workspaceId, sectionKey);
  if (!section) return null;
  requirePermission(section.id, PERMISSION.sectionSettingsEdit);

  return clone({
    section,
    permissions: permissionsOf(section.id),
    roles: sectionRolesOf(workspaceId).map((r) => toRoleDetail(r, section.id)),
    permissionCatalog,
    categories: categories.filter((c) => c.sectionId === section.id).map(toCategoryDetail),
  });
}

// ---- General --------------------------------------------------------

export interface SectionGeneralInput {
  name: string;
  /** 2 to 5 capital letters, unique in the workspace. */
  key: string;
  /** Name from the fixed icon set. */
  icon: string;
  description: string;
}

/**
 * PATCH /workspaces/{workspaceId}/sections/{sectionId}
 * Needs `section.settings.edit`. Changing the key renames the issue ids; the old key is kept
 * so old links redirect.
 */
export async function updateSectionGeneral(
  workspaceId: string,
  sectionId: string,
  input: SectionGeneralInput,
): Promise<Section> {
  const section = requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.sectionSettingsEdit);

  const name = cleanText(input.name, 'Section name', LIMITS.sectionName, true, 'name');
  const description = cleanText(input.description, 'Description', LIMITS.sectionDescription, false);
  const key = input.key.trim().toUpperCase();
  if (!SECTION_KEY.test(key)) throw new ApiError('VALIDATION', 'The key must be 2 to 5 capital letters.', 'key');
  if (!isSectionIconName(input.icon)) throw new ApiError('VALIDATION', 'Unknown icon.');

  const keyTaken =
    sections.some((s) => s.workspaceId === workspaceId && s.id !== sectionId && s.key === key) ||
    sectionKeyHistory.some((h) => h.workspaceId === workspaceId && h.sectionId !== sectionId && h.oldKey === key);
  if (keyTaken) throw new ApiError('VALIDATION', 'This key is already used in the workspace.', 'key');

  if (key !== section.key) {
    sectionKeyHistory.push({ workspaceId, sectionId, oldKey: section.key });
    const own = sectionKeyHistory.findIndex((h) => h.sectionId === sectionId && h.oldKey === key);
    if (own >= 0) sectionKeyHistory.splice(own, 1);
  }
  section.name = name;
  section.key = key;
  section.icon = input.icon;
  section.description = description === '' ? null : description;

  recordAudit({
    log: 'SECTION',
    workspaceId,
    sectionId,
    action: 'section.updated',
    targetType: 'SECTION',
    targetId: sectionId,
  });
  return clone(section);
}

// ---- Roles ----------------------------------------------------------

export type SectionRoleInput = RoleInput;

/**
 * POST /workspaces/{workspaceId}/sections/{sectionId}/roles
 * Needs `section.members.manage`. Returns the new role.
 */
export async function createRole(
  workspaceId: string,
  sectionId: string,
  input: SectionRoleInput,
): Promise<RoleDetail> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.membersManage);
  const values = readRoleInput(workspaceId, 'SECTION', permissionCatalog, null, input);

  const role: Role = {
    id: crypto.randomUUID(),
    workspaceId,
    scope: 'SECTION',
    name: values.name,
    description: values.description,
    isSystem: false,
  };
  roles.push(role);
  rolePermissionKeys[role.id] = values.permissionKeys;
  recordAudit({ log: 'WORKSPACE', workspaceId, sectionId, action: 'role.created', targetType: 'ROLE', targetId: role.id });
  return clone(toRoleDetail(role, sectionId));
}

/**
 * PUT /workspaces/{workspaceId}/sections/{sectionId}/roles/{roleId}
 * Needs `section.members.manage`. Replaces name, description and permissions; members of the
 * role get the new permissions at once.
 */
export async function updateRole(
  workspaceId: string,
  sectionId: string,
  roleId: string,
  input: SectionRoleInput,
): Promise<RoleDetail> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.membersManage);
  const role = sectionRolesOf(workspaceId).find((r) => r.id === roleId);
  if (!role) throw new ApiError('NOT_FOUND', 'Role not found.');
  const values = readRoleInput(workspaceId, 'SECTION', permissionCatalog, roleId, input);

  role.name = values.name;
  role.description = values.description;
  rolePermissionKeys[role.id] = values.permissionKeys;
  recordAudit({ log: 'WORKSPACE', workspaceId, sectionId, action: 'role.updated', targetType: 'ROLE', targetId: role.id });
  return clone(toRoleDetail(role, sectionId));
}

/**
 * DELETE /workspaces/{workspaceId}/sections/{sectionId}/roles/{roleId}
 * Needs `section.members.manage`. Built-in roles and roles that still have members are refused.
 */
export async function deleteRole(workspaceId: string, sectionId: string, roleId: string): Promise<void> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.membersManage);
  const index = roles.findIndex((r) => r.id === roleId && r.workspaceId === workspaceId && r.scope === 'SECTION');
  const role = roles[index];
  if (!role) throw new ApiError('NOT_FOUND', 'Role not found.');
  if (role.isSystem) throw new ApiError('VALIDATION', 'Built-in roles cannot be deleted.');
  if (sectionMembers.some((m) => m.roleId === roleId)) {
    throw new ApiError('VALIDATION', 'This role still has members. Move them to another role first.');
  }

  roles.splice(index, 1);
  delete rolePermissionKeys[roleId];
  recordAudit({ log: 'WORKSPACE', workspaceId, sectionId, action: 'role.deleted', targetType: 'ROLE', targetId: roleId });
}

// ---- Categories -----------------------------------------------------

export interface CategoryInput {
  name: string;
  description: string;
  /** `#RRGGBB`. */
  color: string;
  showOnCards: boolean;
  isArchived: boolean;
}

function readCategoryInput(sectionId: string, categoryId: string | null, input: CategoryInput) {
  const name = cleanText(input.name, 'Name', LIMITS.categoryName, true, 'name');
  const description = cleanText(input.description, 'Description', LIMITS.categoryDescription, false);
  if (!isHexColor(input.color)) throw new ApiError('VALIDATION', 'The colour must look like #RRGGBB.', 'color');
  const taken = categories.some(
    (c) => c.sectionId === sectionId && c.id !== categoryId && c.name.toLowerCase() === name.toLowerCase(),
  );
  if (taken) throw new ApiError('VALIDATION', 'A category with this name already exists in this section.', 'name');
  return {
    name,
    description: description === '' ? null : description,
    color: input.color.toUpperCase(),
    showOnCards: input.showOnCards,
    isArchived: input.isArchived,
  };
}

/**
 * POST /workspaces/{workspaceId}/sections/{sectionId}/categories
 * Needs `section.categories.manage`. Returns the new category.
 */
export async function createCategory(
  workspaceId: string,
  sectionId: string,
  input: CategoryInput,
): Promise<CategoryDetail> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.categoriesManage);
  const values = readCategoryInput(sectionId, null, input);

  const category: Category = { id: crypto.randomUUID(), workspaceId, sectionId, ...values };
  categories.push(category);
  recordAudit({ log: 'SECTION', workspaceId, sectionId, action: 'category.created', targetType: 'CATEGORY', targetId: category.id });
  return clone(toCategoryDetail(category));
}

/**
 * PUT /workspaces/{workspaceId}/sections/{sectionId}/categories/{categoryId}
 * Needs `section.categories.manage`. Returns the updated category.
 */
export async function updateCategory(
  workspaceId: string,
  sectionId: string,
  categoryId: string,
  input: CategoryInput,
): Promise<CategoryDetail> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.categoriesManage);
  const category = categories.find((c) => c.id === categoryId && c.sectionId === sectionId && c.workspaceId === workspaceId);
  if (!category) throw new ApiError('NOT_FOUND', 'Category not found.');

  Object.assign(category, readCategoryInput(sectionId, categoryId, input));
  recordAudit({ log: 'SECTION', workspaceId, sectionId, action: 'category.updated', targetType: 'CATEGORY', targetId: category.id });
  return clone(toCategoryDetail(category));
}

/**
 * DELETE /workspaces/{workspaceId}/sections/{sectionId}/categories/{categoryId}
 * Needs `section.categories.manage`. Removes the category from the issues that use it.
 */
export async function deleteCategory(workspaceId: string, sectionId: string, categoryId: string): Promise<void> {
  requireSection(workspaceId, sectionId);
  requirePermission(sectionId, PERMISSION.categoriesManage);
  const index = categories.findIndex((c) => c.id === categoryId && c.sectionId === sectionId && c.workspaceId === workspaceId);
  if (index < 0) throw new ApiError('NOT_FOUND', 'Category not found.');

  categories.splice(index, 1);
  for (const record of issueRecords) {
    if (record.issue.sectionId === sectionId) record.categoryIds = record.categoryIds.filter((id) => id !== categoryId);
  }
  recordAudit({ log: 'SECTION', workspaceId, sectionId, action: 'category.deleted', targetType: 'CATEGORY', targetId: categoryId });
}
