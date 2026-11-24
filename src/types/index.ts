// Entity types, aligned with docs/schema.sql (camelCase field names).

export type Uuid = string;
/** ISO date, `YYYY-MM-DD` (schema: date). */
export type IsoDate = string;
/** ISO timestamp (schema: timestamp, always UTC). */
export type IsoTimestamp = string;

/**
 * Rich text as the editor stores it (ProseMirror JSON). Never HTML: the UI renders it only
 * through the editor schema, so no markup from the backend reaches the page.
 */
export interface RichTextNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
}
export type RichTextDoc = RichTextNode & { type: 'doc' };

export type Priority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type RoleScope = 'WORKSPACE' | 'SECTION';
export type MemberStatus = 'ACTIVE' | 'DEACTIVATED';
/** A row of the members table: a member, or a person who was invited and has not joined yet. */
export type MemberRowStatus = MemberStatus | 'INVITED';
export type PresetViewType = 'BOARD' | 'TABLE';

export interface User {
  id: Uuid;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Workspace {
  id: Uuid;
  name: string;
  slug: string;
  ownerId: Uuid;
  /** Uploaded logo, or null (the UI then shows the first letter of the name). */
  logoUrl: string | null;
  /** WORKSPACE-scope role given to new members. */
  defaultRoleId: Uuid | null;
}

export interface Permission {
  id: Uuid;
  key: string;
  /** Label shown in the role editor, e.g. `Edit issues`. */
  name: string;
  scope: RoleScope;
  description: string | null;
}

export interface Role {
  id: Uuid;
  workspaceId: Uuid;
  scope: RoleScope;
  name: string;
  description: string | null;
  isSystem: boolean;
}

export interface Section {
  id: Uuid;
  workspaceId: Uuid;
  name: string;
  /** 2 to 5 capital letters, unique per workspace. */
  key: string;
  /** Material icon name from the fixed allowlist, e.g. `laptop`. */
  icon: string;
  description: string | null;
}

export interface Status {
  id: Uuid;
  workspaceId: Uuid;
  sectionId: Uuid;
  name: string;
  color: string | null;
  position: number;
  isDefault: boolean;
}

export interface Category {
  id: Uuid;
  workspaceId: Uuid;
  sectionId: Uuid;
  name: string;
  description: string | null;
  color: string | null;
  /** Show the category chip on board cards. */
  showOnCards: boolean;
  /** Hidden from new issues; existing issues keep it. */
  isArchived: boolean;
}

export interface Issue {
  id: Uuid;
  workspaceId: Uuid;
  sectionId: Uuid;
  /** Shown as `<section key>-<number>`. */
  number: number;
  title: string;
  /** Editor document (schema: jsonb). Images in it refer to attachments by id. */
  description: RichTextDoc | null;
  statusId: Uuid;
  priority: Priority;
  effortHours: number | null;
  dueDate: IsoDate | null;
  /** Order inside a status column. */
  boardPosition: number;
  createdBy: Uuid | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  /** Done flag: independent of status. */
  completedAt: IsoTimestamp | null;
  completedBy: Uuid | null;
}

/** Issue as the board and table need it: with its category and assignee ids joined in. */
export interface IssueListItem extends Issue {
  categoryIds: Uuid[];
  assigneeIds: Uuid[];
}

export interface IssueFilters {
  [key: string]: unknown;
}

export interface Preset {
  id: Uuid;
  workspaceId: Uuid;
  ownerId: Uuid;
  name: string;
  filters: IssueFilters;
  viewType: PresetViewType;
  groupBy: string | null;
  shareToken: Uuid;
}

// ---------------------------------------------------------------------
// View models returned by the API layer (not tables).
// ---------------------------------------------------------------------

export interface WorkspaceSummary extends Workspace {
  memberCount: number;
  /** Name of the current user's workspace role. */
  roleName: string;
  /** Workspace permission keys of the current user. The UI hides what is not allowed. */
  permissions: string[];
}

export interface SidebarSection extends Section {
  pinned: boolean;
  /** Name of the current user's role in this section. */
  roleName: string;
}

/** A role with what the role editor needs: its permissions and how many members have it
 * (in the section for section roles, in the workspace for workspace roles). */
export interface RoleDetail extends Role {
  memberCount: number;
  /** Keys of the permissions the role grants. */
  permissionKeys: string[];
}

/** A category with the number of issues of the section that use it. */
export interface CategoryDetail extends Category {
  issueCount: number;
}

/** Everything the section settings page shows, for all three tabs. */
export interface SectionSettingsData {
  section: Section;
  /** Permission keys the current user has in this section. */
  permissions: string[];
  roles: RoleDetail[];
  /** Section-scope permissions a role can grant. */
  permissionCatalog: Permission[];
  categories: CategoryDetail[];
}

export interface SectionBoardData {
  section: Section;
  /** Name of the current user's role in this section. */
  sectionRoleName: string;
  /** Permission keys the current user has in this section. The UI hides what is not allowed. */
  permissions: string[];
  statuses: Status[];
  categories: Category[];
  members: User[];
  issues: IssueListItem[];
}

/** A person in the list of a role ("View members"): since when they have the role in the section, or joined the workspace. */
export interface RoleMember {
  user: User;
  addedAt: IsoTimestamp;
}

// ---- Issue page and panel ----------------------------------------------

/** A file of an issue. `downloadUrl` is what the backend hands out (a short-lived signed URL). */
export interface Attachment {
  id: Uuid;
  workspaceId: Uuid;
  issueId: Uuid;
  uploadedBy: Uuid | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  /** Image placed in the description (shown in the text) instead of as a file card. */
  isInline: boolean;
  createdAt: IsoTimestamp;
  downloadUrl: string;
}

export interface IssueComment {
  id: Uuid;
  issueId: Uuid;
  author: User | null;
  /** The comment this one answers; replies are one level deep. */
  parentCommentId: Uuid | null;
  /** Plain text. */
  body: string;
  createdAt: IsoTimestamp;
  editedAt: IsoTimestamp | null;
}

/** One line of the Activity log: who was (un)assigned by whom. */
export interface ActivityEntry {
  id: string;
  event: 'ASSIGNED' | 'UNASSIGNED';
  user: User;
  actor: User | null;
  createdAt: IsoTimestamp;
}

/** Everything the issue page and the side panel show. */
export interface IssueDetailData {
  issue: Issue;
  /** Section the issue belongs to; its key builds the id (`IT-142`). */
  section: Section;
  /** Permission keys the current user has in the section. */
  permissions: string[];
  statuses: Status[];
  /** Categories of the section that can be picked (archived ones only if the issue has them). */
  categories: Category[];
  categoryIds: Uuid[];
  /** People who can be assigned: the members of the section. */
  assignableUsers: User[];
  assigneeIds: Uuid[];
  createdBy: User | null;
  attachments: Attachment[];
  comments: IssueComment[];
  activity: ActivityEntry[];
}

/** Fields of an issue that can be changed from the page. Only the given fields are written. */
export interface IssuePatch {
  title?: string;
  description?: RichTextDoc | null;
  statusId?: Uuid;
  priority?: Priority;
  categoryIds?: Uuid[];
  assigneeIds?: Uuid[];
  effortHours?: number | null;
  dueDate?: IsoDate | null;
}

// ---- Accounts and invitations -------------------------------------------

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

/** What the members table knows about a pending invitation. */
export interface InvitationInfo {
  id: Uuid;
  email: string;
  invitedByName: string | null;
  expiresAt: IsoTimestamp;
  /** True when the link ran out before it was used. */
  expired: boolean;
}

/**
 * What the invitation page may show to whoever holds the link: enough to decide, no more.
 * `accountExists` tells the page whether to ask for a new password or for a sign-in.
 */
export interface InvitationPreview {
  email: string;
  workspaceName: string;
  workspaceLogoUrl: string | null;
  invitedByName: string | null;
  roleName: string;
  accountExists: boolean;
}

/** An open invitation sent to the signed-in person's own email (shown when they have no workspace). */
export interface MyInvitation {
  id: Uuid;
  workspaceName: string;
  workspaceLogoUrl: string | null;
  invitedByName: string | null;
  roleName: string;
  expiresAt: IsoTimestamp;
}

/** Result of sending an invitation. `devLink` exists only in the mock: the real backend emails the link. */
export interface InvitationSent {
  invitation: InvitationInfo;
  devLink: string | null;
}

// ---- Workspace settings -------------------------------------------------

/** A section role a member has, shown as a chip: "<section name> <role name>". */
export interface MemberSectionRole {
  sectionId: Uuid;
  sectionName: string;
  roleName: string;
}

/** One row of the members table: the user, the workspace membership and the section roles. */
export interface WorkspaceMember {
  user: User;
  roleId: Uuid;
  roleName: string;
  status: MemberRowStatus;
  /** Set on rows with status `INVITED`; then `user` only carries the email. */
  invitation: InvitationInfo | null;
  joinedAt: IsoTimestamp;
  /** Last request in THIS workspace (workspace_members.last_active_at); null = never. */
  lastActiveAt: IsoTimestamp | null;
  sectionRoles: MemberSectionRole[];
}

export type MemberSort = 'name' | 'lastActive' | 'joined';
export type MemberStatusFilter = 'ALL' | MemberRowStatus;

/** Query of the members table. Filtering, sorting and paging happen on the server. */
export interface WorkspaceMemberQuery {
  search: string;
  /** Workspace role id, or null for every role. */
  roleId: Uuid | null;
  /** Section id, or null for every section. */
  sectionId: Uuid | null;
  status: MemberStatusFilter;
  sort: MemberSort;
  /** Starts at 0. */
  page: number;
  pageSize: number;
}

export interface WorkspaceMemberPage {
  items: WorkspaceMember[];
  /** Rows that match the query, over all pages. */
  total: number;
  /** Tab counters: not affected by the filters. */
  counts: { all: number; active: number; invited: number; deactivated: number };
}

/** Everything the General and Roles tabs of the workspace settings need. */
export interface WorkspaceSettingsData {
  workspace: Workspace;
  /** Workspace permission keys of the current user. */
  permissions: string[];
  roles: RoleDetail[];
  /** Workspace-scope permissions a role can grant. */
  permissionCatalog: Permission[];
  /** All sections of the workspace (for the section filter of the members table). */
  sections: Section[];
}
