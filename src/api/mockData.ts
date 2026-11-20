import type {
  Category,
  Issue,
  MemberStatus,
  Permission,
  Priority,
  Role,
  Section,
  Status,
  User,
  Workspace,
} from '../types';
import { toIsoDate } from '../utils/dates';
import { PERMISSION } from '../utils/permissions';

// In-memory stand-in for the backend. Dates are relative to "now" so the
// relative labels (Today, Tomorrow, Overdue 2 d, ...) always look like the design.

const NOW = new Date();

function dateInDays(days: number): string {
  const date = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() + days);
  return toIsoDate(date);
}

function timestampDaysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

// ---- Users ----------------------------------------------------------

export const CURRENT_USER_ID = 'user-maria';

function user(id: string, displayName: string, email: string): User {
  return { id, email, displayName, avatarUrl: null };
}

export const users: User[] = [
  user('user-maria', 'Maria Koleva', 'maria.koleva@acme.example'),
  user('user-anton', 'Anton Nikolov', 'anton.nikolov@acme.example'),
  user('user-stefan', 'Stefan Borisov', 'stefan.borisov@acme.example'),
  user('user-daniela', 'Daniela Filipova', 'daniela.filipova@acme.example'),
  user('user-elena', 'Elena Petrova', 'elena.petrova@acme.example'),
  user('user-ivan', 'Ivan Georgiev', 'ivan.georgiev@acme.example'),
];

// ---- Workspaces -----------------------------------------------------

export const workspaces: Workspace[] = [
  {
    id: 'ws-acme',
    name: 'Acme Studio',
    slug: 'acme-studio',
    ownerId: CURRENT_USER_ID,
    logoUrl: null,
    defaultRoleId: 'ws-acme-wrole-member',
  },
  {
    id: 'ws-globex',
    name: 'Globex Labs',
    slug: 'globex-labs',
    ownerId: 'user-elena',
    logoUrl: null,
    defaultRoleId: 'ws-globex-wrole-member',
  },
];

/** Unread notifications per workspace (stand-in for a count over the notifications table). */
export const workspaceMeta: Record<string, { unread: number }> = {
  'ws-acme': { unread: 3 },
  'ws-globex': { unread: 0 },
};

// ---- Sections -------------------------------------------------------

function section(
  id: string,
  workspaceId: string,
  name: string,
  key: string,
  icon: string,
  description: string,
): Section {
  return { id, workspaceId, name, key, icon, description };
}

export const sections: Section[] = [
  section('sec-it', 'ws-acme', 'IT Support', 'IT', 'laptop', 'Planned work, projects and requests for the IT team.'),
  section('sec-hr', 'ws-acme', 'Human Resources', 'HR', 'groups', 'Hiring, onboarding and people operations.'),
  section('sec-fac', 'ws-acme', 'Facilities', 'FAC', 'apartment', 'Office space, equipment and building services.'),
  section('sec-mnt', 'ws-acme', 'Maintenance', 'MNT', 'build', 'Repairs and recurring maintenance work.'),
  section('sec-fin', 'ws-acme', 'Finance', 'FIN', 'account_balance', 'Budgets, invoices and purchasing.'),
  section('sec-ops', 'ws-globex', 'Operations', 'OPS', 'folder', 'Day-to-day operations.'),
];

/** Pinned sections of the current user, per workspace (section ids). */
export const pinnedSectionIds: Record<string, string[]> = {
  'ws-acme': ['sec-it', 'sec-hr'],
  'ws-globex': [],
};

/** Keys a section used to have. Opening an old key redirects to the section (section_key_history). */
export const sectionKeyHistory: { workspaceId: string; sectionId: string; oldKey: string }[] = [];

// ---- Permissions, roles and section members --------------------------

function permission(
  key: string,
  name: string,
  description: string,
  scope: Permission['scope'] = 'SECTION',
): Permission {
  return { id: `perm-${key}`, key, name, scope, description };
}

/** The permission catalog of section roles. */
export const permissionCatalog: Permission[] = [
  permission(PERMISSION.issueEdit, 'Edit issues', 'Edit issue title, description and priority.'),
  permission(PERMISSION.issueComment, 'Comment on issues', 'Add comments to issues.'),
  permission(PERMISSION.issueMove, 'Change issue status', 'Move issues between states: start, close, reopen.'),
  permission(PERMISSION.issueAssignSelf, 'Assign issues to self', 'Assign unassigned issues to yourself.'),
  permission(
    PERMISSION.issueAssignOthers,
    'Assign issues to others',
    'Assign issues to other members. Includes assigning to yourself.',
  ),
  permission(PERMISSION.issueDelete, 'Delete issues', 'Delete issues. Admins can restore them.'),
  permission(
    PERMISSION.sectionSettingsEdit,
    'Edit section settings',
    'Change the name, key, icon and description of the section.',
  ),
  permission(PERMISSION.categoriesManage, 'Manage categories', 'Create, edit, archive and delete categories.'),
  permission(
    PERMISSION.statusesManage,
    'Manage statuses',
    'Reorder, rename, recolour and remove the statuses of the board.',
  ),
  permission(PERMISSION.membersManage, 'Manage members and roles', 'Edit the roles of the section and who has them.'),
];

const ALL_PERMISSION_KEYS = permissionCatalog.map((p) => p.key);
const ISSUE_PERMISSION_KEYS = permissionCatalog.filter((p) => p.key.startsWith('issue.')).map((p) => p.key);

function role(workspaceId: string, name: string, description: string, isSystem: boolean): Role {
  return { id: `${workspaceId}-role-${name.toLowerCase()}`, workspaceId, scope: 'SECTION', name, description, isSystem };
}

export const roles: Role[] = ['ws-acme', 'ws-globex'].flatMap((workspaceId) => [
  role(workspaceId, 'Admin', 'Full control of the section: settings, categories, statuses and roles.', true),
  role(workspaceId, 'Agent', 'Works issues day to day: assigns, updates and closes them.', false),
  role(workspaceId, 'Member', 'Standard access: can move issues between statuses.', true),
  role(workspaceId, 'Viewer', 'Can view the section and its issues.', true),
]);

/** Permission keys per role id (stand-in for role_permissions). */
export const rolePermissionKeys: Record<string, string[]> = Object.fromEntries(
  ['ws-acme', 'ws-globex'].flatMap((workspaceId) => [
    [`${workspaceId}-role-admin`, [...ALL_PERMISSION_KEYS]],
    [`${workspaceId}-role-agent`, [...ISSUE_PERMISSION_KEYS, PERMISSION.categoriesManage]],
    [`${workspaceId}-role-member`, [PERMISSION.issueMove]],
    [`${workspaceId}-role-viewer`, []],
  ]),
);

export interface SectionMemberRecord {
  workspaceId: string;
  sectionId: string;
  userId: string;
  roleId: string;
  addedAt: string;
}

let memberCounter = 0;

function member(sectionId: string, userId: string, roleName: string): SectionMemberRecord {
  const workspaceId = sections.find((s) => s.id === sectionId)?.workspaceId ?? '';
  memberCounter += 1;
  return {
    workspaceId,
    sectionId,
    userId,
    roleId: `${workspaceId}-role-${roleName.toLowerCase()}`,
    addedAt: timestampDaysAgo(5 + ((memberCounter * 37) % 300)),
  };
}

/** Members of each section with their role (section_members). Maria is the current user. */
export const sectionMembers: SectionMemberRecord[] = [
  member('sec-it', 'user-maria', 'Admin'),
  member('sec-it', 'user-anton', 'Agent'),
  member('sec-it', 'user-stefan', 'Agent'),
  member('sec-it', 'user-daniela', 'Agent'),
  member('sec-it', 'user-elena', 'Viewer'),
  member('sec-it', 'user-ivan', 'Member'),
  member('sec-hr', 'user-maria', 'Member'),
  member('sec-fac', 'user-maria', 'Member'),
  member('sec-mnt', 'user-maria', 'Member'),
  member('sec-fin', 'user-maria', 'Viewer'),
  member('sec-ops', 'user-maria', 'Member'),
];

// ---- Workspace roles, members and permissions ---------------------------

/** The permission catalog of workspace roles (13 permissions in three groups). */
export const workspacePermissionCatalog: Permission[] = [
  permission(PERMISSION.workspaceSectionsCreate, 'Create sections', 'Create new sections, each with its own issues and roles.', 'WORKSPACE'),
  permission(PERMISSION.workspaceSectionsEdit, 'Edit any section', 'Rename any section and change its settings.', 'WORKSPACE'),
  permission(PERMISSION.workspaceSectionsDelete, 'Delete sections', 'Delete sections. Owners can restore them.', 'WORKSPACE'),
  permission(PERMISSION.workspaceSectionsAudit, 'View any section\u2019s audit log', 'Open the audit log of any section.', 'WORKSPACE'),
  permission(PERMISSION.workspaceMembersView, 'View members', 'See the member list with status and roles. Implied by every other user permission.', 'WORKSPACE'),
  permission(PERMISSION.workspaceMembersCreate, 'Create users', 'Create accounts and send invites or temporary passwords.', 'WORKSPACE'),
  permission(PERMISSION.workspaceMembersEdit, 'Edit users', 'Change another person\u2019s name and email.', 'WORKSPACE'),
  permission(PERMISSION.workspaceMembersDeactivate, 'Deactivate users', 'Deactivate and reactivate accounts. Their issues and comments stay.', 'WORKSPACE'),
  permission(PERMISSION.workspaceMembersAssignRoles, 'Assign roles', 'Change the workspace role and the section roles of a member.', 'WORKSPACE'),
  permission(PERMISSION.workspaceMembersInvite, 'Invite users', 'Invite people to the workspace by email.', 'WORKSPACE'),
  permission(PERMISSION.workspaceMembersRemove, 'Remove users', 'Remove a member from the workspace.', 'WORKSPACE'),
  permission(PERMISSION.workspaceSettingsEdit, 'Edit workspace settings', 'Change the name, logo, URL and default role of the workspace.', 'WORKSPACE'),
  permission(PERMISSION.workspaceRolesManage, 'Manage workspace roles', 'Create, edit and delete workspace roles.', 'WORKSPACE'),
];

const ALL_WORKSPACE_KEYS = workspacePermissionCatalog.map((p) => p.key);
const MEMBERS_KEYS = workspacePermissionCatalog.filter((p) => p.key.startsWith('workspace.members.')).map((p) => p.key);

function workspaceRoleId(workspaceId: string, name: string): string {
  return `${workspaceId}-wrole-${name.toLowerCase().replace(/\W+/g, '-')}`;
}

function workspaceRole(workspaceId: string, name: string, description: string, isSystem: boolean): Role {
  return { id: workspaceRoleId(workspaceId, name), workspaceId, scope: 'WORKSPACE', name, description, isSystem };
}

for (const workspaceId of ['ws-acme', 'ws-globex']) {
  roles.push(
    workspaceRole(workspaceId, 'Owner', 'Full control of the workspace. Cannot be changed or deleted.', true),
    workspaceRole(workspaceId, 'Co-admin', 'Runs the workspace together with the owner.', false),
    workspaceRole(workspaceId, 'People manager', 'Manages accounts and keeps an eye on workspace activity.', false),
    workspaceRole(workspaceId, 'Member', 'Standard access. Access to sections is set by section roles.', false),
  );
  rolePermissionKeys[workspaceRoleId(workspaceId, 'Owner')] = [...ALL_WORKSPACE_KEYS];
  rolePermissionKeys[workspaceRoleId(workspaceId, 'Co-admin')] = [...ALL_WORKSPACE_KEYS];
  rolePermissionKeys[workspaceRoleId(workspaceId, 'People manager')] = [PERMISSION.workspaceSectionsAudit, ...MEMBERS_KEYS];
  rolePermissionKeys[workspaceRoleId(workspaceId, 'Member')] = [];
}

export interface WorkspaceMemberRecord {
  workspaceId: string;
  userId: string;
  roleId: string;
  status: MemberStatus;
  joinedAt: string;
  lastActiveAt: string | null;
}

function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60 * 1000).toISOString();
}

/** Members of each workspace (workspace_members). Maria is the current user and owns Acme Studio. */
export const workspaceMembers: WorkspaceMemberRecord[] = [];

function addWorkspaceMember(
  workspaceId: string,
  userId: string,
  roleName: string,
  status: MemberStatus,
  lastActiveMinutesAgo: number | null,
  joinedDaysAgo: number,
): void {
  workspaceMembers.push({
    workspaceId,
    userId,
    roleId: workspaceRoleId(workspaceId, roleName),
    status,
    joinedAt: timestampDaysAgo(joinedDaysAgo),
    lastActiveAt: lastActiveMinutesAgo === null ? null : minutesAgo(lastActiveMinutesAgo),
  });
}

const FIRST_NAMES = ['Andrey', 'Peter', 'Nina', 'Sofia', 'Dimitar', 'Vasil', 'Georgi', 'Maya', 'Boris', 'Tsvetan', 'Iva', 'Kalina', 'Lyuben', 'Radost', 'Teodor', 'Yana', 'Zhivko', 'Albena', 'Bogdan', 'Desislava', 'Emil', 'Fani', 'Hristo', 'Ilina'];
const LAST_NAMES = ['Ivanov', 'Stoyanova', 'Boneva', 'Petkov', 'Vasilev', 'Georgieva', 'Hristov', 'Todorova', 'Dimitrov', 'Kostova', 'Marinov', 'Angelova', 'Popov', 'Yordanova'];

/** Deterministic filler people, so the members table has several pages. */
function addFillerMembers(workspaceId: string, domain: string, count: number): void {
  for (let i = 0; i < count; i += 1) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 5 + Math.floor(i / FIRST_NAMES.length)) % LAST_NAMES.length];
    const id = `user-${workspaceId}-${i}`;
    users.push(user(id, `${first} ${last}`, `${first}.${last}.${i}@${domain}`.toLowerCase()));
    const roleName = i === 0 ? 'Co-admin' : i === 1 || i === 2 ? 'People manager' : 'Member';
    const status: MemberStatus = i % 14 === 13 ? 'DEACTIVATED' : 'ACTIVE';
    addWorkspaceMember(workspaceId, id, roleName, status, status === 'ACTIVE' ? 12 + i * 97 : 60 * 24 * 14, 30 + i * 7);
  }
}

// Acme Studio: the people used by the issues, plus filler. 47 active and 3 deactivated.
addWorkspaceMember('ws-acme', 'user-maria', 'Owner', 'ACTIVE', 0, 400);
addWorkspaceMember('ws-acme', 'user-anton', 'Co-admin', 'ACTIVE', 12, 380);
addWorkspaceMember('ws-acme', 'user-stefan', 'People manager', 'ACTIVE', 60, 300);
addWorkspaceMember('ws-acme', 'user-daniela', 'Member', 'ACTIVE', 60 * 24, 250);
addWorkspaceMember('ws-acme', 'user-elena', 'Member', 'ACTIVE', 60 * 24 * 3, 200);
addWorkspaceMember('ws-acme', 'user-ivan', 'Member', 'ACTIVE', 60 * 24 * 4, 180);
addFillerMembers('ws-acme', 'acme.example', 44);

// Globex Labs: Elena owns it, Maria is a plain member (she cannot open its workspace settings).
addWorkspaceMember('ws-globex', 'user-elena', 'Owner', 'ACTIVE', 5, 500);
addWorkspaceMember('ws-globex', 'user-maria', 'Member', 'ACTIVE', 90, 120);
addFillerMembers('ws-globex', 'globex.example', 16);

// Section roles of the filler people in Acme Studio, so the "Section roles" column has content.
const SECTION_ROLE_CYCLE = ['Agent', 'Member', 'Viewer', 'Admin'];
const ACME_SECTION_IDS = ['sec-it', 'sec-hr', 'sec-fac', 'sec-mnt', 'sec-fin'];
workspaceMembers
  .filter((m) => m.workspaceId === 'ws-acme' && m.userId.startsWith('user-ws-acme-'))
  .forEach((m, i) => {
    const sectionCount = i % 5 === 4 ? 0 : 1 + (i % 3);
    for (let k = 0; k < sectionCount; k += 1) {
      const sectionId = ACME_SECTION_IDS[(i + k * 2) % ACME_SECTION_IDS.length];
      if (sectionMembers.some((x) => x.sectionId === sectionId && x.userId === m.userId)) continue;
      sectionMembers.push(member(sectionId, m.userId, SECTION_ROLE_CYCLE[(i + k) % SECTION_ROLE_CYCLE.length]));
    }
  });

// ---- Audit log --------------------------------------------------------

export interface AuditEntry {
  id: string;
  /** Which of the two logs the entry belongs to (workspace_audit_log or section_audit_log). */
  log: 'WORKSPACE' | 'SECTION';
  workspaceId: string;
  sectionId: string | null;
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

export const auditLog: AuditEntry[] = [];

// ---- Statuses -------------------------------------------------------

function status(
  id: string,
  sectionId: string,
  name: string,
  color: string,
  position: number,
  isDefault = false,
): Status {
  const workspaceId = sections.find((s) => s.id === sectionId)?.workspaceId ?? '';
  return { id, workspaceId, sectionId, name, color, position, isDefault };
}

const defaultStatuses = (sectionId: string): Status[] => [
  status(`${sectionId}-todo`, sectionId, 'To do', '#0288D1', 0, true),
  status(`${sectionId}-progress`, sectionId, 'In progress', '#ED6C02', 1),
  status(`${sectionId}-done`, sectionId, 'Done', '#2E7D32', 2),
];

export const statuses: Status[] = [
  status('st-it-todo', 'sec-it', 'To do', '#0288D1', 0, true),
  status('st-it-progress', 'sec-it', 'In progress', '#ED6C02', 1),
  status('st-it-review', 'sec-it', 'In review', '#9C27B0', 2),
  status('st-it-done', 'sec-it', 'Done', '#2E7D32', 3),
  ...['sec-hr', 'sec-fac', 'sec-mnt', 'sec-fin', 'sec-ops'].flatMap(defaultStatuses),
];

// ---- Categories -----------------------------------------------------

function category(
  id: string,
  sectionId: string,
  name: string,
  color: string,
  description: string | null = null,
): Category {
  const workspaceId = sections.find((s) => s.id === sectionId)?.workspaceId ?? '';
  return { id, workspaceId, sectionId, name, description, color, showOnCards: true, isArchived: false };
}

export const categories: Category[] = [
  category('cat-it-infra', 'sec-it', 'Infrastructure', '#0277BD', 'Servers, network, cloud and storage work'),
  category('cat-it-onboarding', 'sec-it', 'Onboarding', '#2E7D32', 'Setting up new hires and their equipment'),
  category('cat-it-security', 'sec-it', 'Security', '#9C27B0', 'Access, certificates and security reviews'),
  category('cat-it-planning', 'sec-it', 'Planning', '#EF6C00', 'Budgets, roadmaps and refresh plans'),
  category('cat-it-hardware', 'sec-it', 'Hardware', '#00796B'),
  category('cat-it-maintenance', 'sec-it', 'Maintenance', '#455A64'),
];

// ---- Issues (IT Support) --------------------------------------------

interface IssueSeed {
  number: number;
  title: string;
  statusId: string;
  priority: Priority;
  categoryIds: string[];
  effortHours: number | null;
  dueInDays: number | null;
  doneDaysAgo?: number;
  assigneeIds: string[];
}

const INFRA = 'cat-it-infra';
const ONBOARDING = 'cat-it-onboarding';
const SECURITY = 'cat-it-security';
const PLANNING = 'cat-it-planning';

const issueSeeds: IssueSeed[] = [
  // To do
  { number: 148, title: 'Plan the laptop refresh for the Design team', statusId: 'st-it-todo', priority: 'HIGH', categoryIds: [INFRA], effortHours: 8, dueInDays: null, assigneeIds: ['user-anton', 'user-maria'] },
  { number: 147, title: 'Prepare onboarding kits for three new hires', statusId: 'st-it-todo', priority: 'NONE', categoryIds: [ONBOARDING], effortHours: 4, dueInDays: 0, assigneeIds: [] },
  { number: 144, title: 'Renew SSL certificates for internal tools', statusId: 'st-it-todo', priority: 'MEDIUM', categoryIds: [SECURITY], effortHours: 2, dueInDays: -1, assigneeIds: [] },
  { number: 135, title: 'Audit unused software licences', statusId: 'st-it-todo', priority: 'NONE', categoryIds: [PLANNING], effortHours: 6, dueInDays: null, assigneeIds: [] },
  // In progress
  { number: 146, title: 'Migrate the Marketing shared drive to new storage', statusId: 'st-it-progress', priority: 'NONE', categoryIds: [INFRA], effortHours: 6, dueInDays: 1, assigneeIds: ['user-anton', 'user-maria'] },
  { number: 145, title: 'Set up single sign-on for the HR portal', statusId: 'st-it-progress', priority: 'HIGH', categoryIds: [SECURITY], effortHours: 8, dueInDays: null, assigneeIds: ['user-anton', 'user-maria', 'user-daniela', 'user-elena', 'user-ivan'] },
  { number: 143, title: 'Review access rights for external contractors', statusId: 'st-it-progress', priority: 'URGENT', categoryIds: [SECURITY], effortHours: 3, dueInDays: -2, assigneeIds: ['user-anton'] },
  { number: 140, title: 'Update the backup and restore runbook', statusId: 'st-it-progress', priority: 'NONE', categoryIds: [INFRA], effortHours: 5, dueInDays: null, assigneeIds: ['user-anton'] },
  // In review
  { number: 139, title: 'Draft the Q4 IT budget proposal', statusId: 'st-it-review', priority: 'NONE', categoryIds: [PLANNING, INFRA], effortHours: 4, dueInDays: null, assigneeIds: ['user-maria'] },
  { number: 138, title: 'Write the office network upgrade plan', statusId: 'st-it-review', priority: 'LOW', categoryIds: [PLANNING], effortHours: 3, dueInDays: 6, assigneeIds: ['user-maria', 'user-stefan'] },
  { number: 137, title: 'Review the new-hire IT checklist', statusId: 'st-it-review', priority: 'NONE', categoryIds: [ONBOARDING], effortHours: 1, dueInDays: null, assigneeIds: ['user-anton'] },
  // Done
  { number: 142, title: 'Order monitors for the design studio', statusId: 'st-it-done', priority: 'NONE', categoryIds: [INFRA], effortHours: 1, dueInDays: null, doneDaysAgo: 2, assigneeIds: ['user-anton', 'user-maria'] },
  { number: 141, title: 'Roll out two-factor authentication to all staff', statusId: 'st-it-done', priority: 'MEDIUM', categoryIds: [SECURITY], effortHours: 10, dueInDays: null, doneDaysAgo: 3, assigneeIds: ['user-anton', 'user-maria'] },
  { number: 136, title: 'Document the new-hire IT checklist', statusId: 'st-it-done', priority: 'NONE', categoryIds: [ONBOARDING], effortHours: 2, dueInDays: null, doneDaysAgo: 4, assigneeIds: ['user-maria'] },
];

/** Issue rows plus the join data (categories, assignees) the schema keeps in separate tables. */
export interface IssueRecord {
  issue: Issue;
  categoryIds: string[];
  assigneeIds: string[];
}

const positionCounters: Record<string, number> = {};

export const issueRecords: IssueRecord[] = issueSeeds.map((seed) => {
  positionCounters[seed.statusId] = (positionCounters[seed.statusId] ?? 0) + 1000;
  const completedAt = seed.doneDaysAgo !== undefined ? timestampDaysAgo(seed.doneDaysAgo) : null;
  const issue: Issue = {
    id: `issue-it-${seed.number}`,
    workspaceId: 'ws-acme',
    sectionId: 'sec-it',
    number: seed.number,
    title: seed.title,
    description: null,
    statusId: seed.statusId,
    priority: seed.priority,
    effortHours: seed.effortHours,
    dueDate: seed.dueInDays === null ? null : dateInDays(seed.dueInDays),
    boardPosition: positionCounters[seed.statusId],
    createdBy: 'user-maria',
    createdAt: timestampDaysAgo(14),
    updatedAt: timestampDaysAgo(1),
    completedAt,
    completedBy: completedAt ? 'user-maria' : null,
  };
  return { issue, categoryIds: seed.categoryIds, assigneeIds: seed.assigneeIds };
});
