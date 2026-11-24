-- =====================================================================
-- Workspace Task & Issue Tracker - database schema
-- PostgreSQL 13+ (one shared schema, multi-tenant by workspace_id)
--
-- Source of truth for entities and field names; the frontend types in
-- src/types/index.ts follow it (camelCase). Permission keys in the `permissions`
-- seed data must match the keys in src/utils/permissions.ts.
--
-- Time: every timestamp is a plain `timestamp` holding UTC. Java writes with
-- ZoneOffset.UTC (hibernate.jdbc.time_zone=UTC), the defaults use
-- now() AT TIME ZONE 'utc', and the API sends ISO strings with a trailing "Z".
-- Dates without a time of day (issues.due_date) are plain `date`.
--
-- Accounts are GLOBAL: one account per email, usable in every workspace the
-- person belongs to. An account is created by signing up (it works only after the
-- emailed link confirmed the address) or by accepting an invitation (the link
-- itself confirms the address). A person without a workspace can create one or
-- join one they were invited to. A workspace never owns or manages credentials.
--
-- Tenant isolation, in three layers:
--   1. every workspace-owned table carries workspace_id and every query filters
--      by it (Hibernate 6 @TenantId, or findByIdAndWorkspaceId in the repositories)
--   2. the Java services validate links between rows (list below)
--   3. optional row-level security at the bottom, as a safety net
--
-- Kept in the database (cheap, and the last line of defence for any writer):
--   primary keys, plain foreign keys, NOT NULL, enums, business unique
--   constraints (races cannot be prevented in Java alone), simple CHECKs.
--
-- Validated in the Java application, NOT in the database:
--   * a referenced row belongs to the same workspace (and the same section where
--     it says so): issues.status_id, issue_categories.category_id, section_members,
--     issue_assignees, comment replies, notifications, invitations, roles
--   * role scope: workspace_members and invitations use WORKSPACE roles,
--     section_members use SECTION roles, role_permissions pairs a role and a
--     permission of the same scope
--   * a section member is a member of the workspace; an issue assignee is a
--     member of the issue's section; a reply belongs to the same issue
--   * a section's new key is not an old_key of another section (section_key_history)
--   * the workspace owner has a workspace_members row with the Owner role; the Owner
--     role cannot be edited, deleted or handed out; workspaces.default_role_id points
--     to a WORKSPACE-scope role of the same workspace and that role cannot be deleted
--   * a section always keeps at least one member who can manage roles
--   * removing a workspace member also removes their section memberships and issue
--     assignments (no database cascade ties these together)
--   * invitations: the accepting account's email equals invitations.email; a PENDING
--     invitation with expires_at in the past counts as expired (see the table)
--   * sign-up: an unconfirmed account cannot sign in; every answer is the same whether the
--     email is new or taken (no probing); limits per email and per IP; at most 5 owned
--     workspaces per account
--   * attachments: allow-listed content types (no SVG, no HTML), the real content of the
--     file (not only the reported type), size limit per file
--   * permissions, section admin rules, workflow rules
-- Map unique-violation errors to HTTP 409, so a lost race looks like a normal conflict.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------
CREATE TYPE role_scope          AS ENUM ('WORKSPACE', 'SECTION');
-- DEACTIVATED: cannot use this workspace; their issues, comments and history stay.
CREATE TYPE member_status       AS ENUM ('ACTIVE', 'DEACTIVATED');
CREATE TYPE issue_priority      AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE assignment_event    AS ENUM ('ASSIGNED', 'UNASSIGNED');
CREATE TYPE preset_view_type    AS ENUM ('BOARD', 'TABLE');
CREATE TYPE invitation_status   AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
CREATE TYPE token_purpose       AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- =====================================================================
-- MAIN (global) TABLES
-- Ids are UUIDs. The application should generate them time-ordered (UUIDv7);
-- the default is only a fallback.
-- =====================================================================

CREATE TABLE users (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email               citext      NOT NULL UNIQUE,   -- case-insensitive; also the sign-in name
    password_hash       text        NOT NULL,          -- bcrypt or argon2, never the password
    display_name        text        NOT NULL,
    avatar_url          text,
    is_active           boolean     NOT NULL DEFAULT true,   -- false = account closed everywhere; per-workspace access is workspace_members.status
    created_at          timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    last_login_at       timestamp,                     -- global; per-workspace activity is workspace_members.last_active_at
    -- NULL until the owner of the address opened the emailed link (sign-up), or set at creation
    -- when the account came from an invitation link. Sign-in is refused while it is NULL.
    email_verified_at   timestamp,
    -- Sign-in throttling: 5 wrong passwords lock the email for 15 minutes (also counted per IP,
    -- and for emails without an account, so the answer never reveals which emails exist).
    failed_login_count  integer     NOT NULL DEFAULT 0,
    locked_until        timestamp
);

-- Links in emails: confirm the address after sign-up (valid 24 hours) and choose a new password
-- (valid 1 hour). Only the hash of the token is stored; a token works once. The page behind a
-- confirmation link asks for a click before it uses the token, because mail scanners open links.
-- Delete expired and used rows with a scheduled job (the table stays tiny, so there is no index
-- on user_id).
CREATE TABLE account_tokens (
    id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid           NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose     token_purpose  NOT NULL,
    token_hash  text           NOT NULL UNIQUE,   -- SHA-256 of the token; the UNIQUE index is the lookup
    expires_at  timestamp      NOT NULL,
    used_at     timestamp,
    created_at  timestamp      NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

-- Created by the signed-in person (POST /workspaces), who becomes the owner. In ONE transaction the
-- backend also creates: the default roles and their permissions (Owner, Co-admin, People manager,
-- Member; section roles Admin, Agent, Member, Viewer), the owner's membership with the Owner role, and
-- a first section "General" (key GEN) with the statuses To do (default), In progress and Done.
CREATE TABLE workspaces (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name             text        NOT NULL,
    -- Part of the workspace URL (<slug>.<domain>); changing it breaks old links. Reserved
    -- words (www, api, admin, ...) are refused by Java.
    slug             text        NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 40),
    owner_id         uuid        NOT NULL REFERENCES users (id),
    logo_url         text,                             -- uploaded logo (PNG/JPG, square, >= 128 px, <= 2 MB); the UI shows the first letter when empty
    default_role_id  uuid,                             -- WORKSPACE-scope role of new members; the foreign key is added after `roles`
    created_at       timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

-- Permission catalog: seed data, one list for both scopes. The keys are part of the contract
-- with the frontend (src/utils/permissions.ts).
CREATE TABLE permissions (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    key          text        NOT NULL UNIQUE,   -- e.g. 'issue.edit', 'section.settings.edit', 'workspace.members.view'
    name         text        NOT NULL,          -- label in the role editor, e.g. 'Edit issues'
    scope        role_scope  NOT NULL,
    description  text
);

-- =====================================================================
-- WORKSPACE-SPECIFIC TABLES
-- =====================================================================

-- One table for workspace roles and section roles (scope column). Roles belong to the
-- workspace, not to a section: a section role like "Agent" is the same role in every section.
CREATE TABLE roles (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    scope         role_scope  NOT NULL,
    name          text        NOT NULL,
    description   text,
    is_system     boolean     NOT NULL DEFAULT false,   -- built-in (the Owner role, Admin/Member/Viewer section roles): cannot be deleted
    created_at    timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
-- name is unique per workspace and scope, ignoring case
CREATE UNIQUE INDEX uq_roles_name ON roles (workspace_id, scope, lower(name));

ALTER TABLE workspaces ADD FOREIGN KEY (default_role_id) REFERENCES roles (id);

-- Which permissions a role grants. Java checks that role and permission have the same scope,
-- and adds "workspace.members.view" whenever another workspace.members.* permission is granted.
CREATE TABLE role_permissions (
    role_id        uuid NOT NULL REFERENCES roles (id)       ON DELETE CASCADE,
    permission_id  uuid NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- User <-> workspace link, carrying the workspace role (a WORKSPACE-scope role).
CREATE TABLE workspace_members (
    workspace_id    uuid          NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    user_id         uuid          NOT NULL REFERENCES users (id)      ON DELETE CASCADE,
    role_id         uuid          NOT NULL REFERENCES roles (id),     -- a role that still has members cannot be deleted
    status          member_status NOT NULL DEFAULT 'ACTIVE',
    joined_at       timestamp     NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    -- Last request in THIS workspace, updated by the backend (throttled, e.g. once a minute).
    -- Per workspace on purpose: users.last_login_at is global and would show an admin when
    -- the person was active elsewhere.
    last_active_at  timestamp,
    PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX idx_workspace_members_user ON workspace_members (user_id);   -- "my workspaces" after sign-in
CREATE INDEX idx_workspace_members_role ON workspace_members (role_id);   -- members per role; the check before a role is deleted

-- Sections. Settings (name, key, icon, description) are 1:1, so they live here.
-- UNIQUE (workspace_id, key) is also the lookup index for /sections/:key.
CREATE TABLE sections (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id   uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    name           text        NOT NULL,
    key            text        NOT NULL CHECK (key ~ '^[A-Z]{2,5}$'),   -- unique per workspace; changing it renames issue ids
    icon           text        NOT NULL DEFAULT 'folder',   -- one of 24 Material icon names; validated against an allow-list in the app
    description    text,
    issue_counter  integer     NOT NULL DEFAULT 0,          -- last issue number handed out; take the next with UPDATE ... RETURNING
    created_by     uuid        REFERENCES users (id) ON DELETE SET NULL,
    created_at     timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at     timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    UNIQUE (workspace_id, key)
);

-- Old keys keep working: IT-152 -> new key resolves through this table. A row is added when a
-- key changes and removed when a section takes its old key back. Small table, so there is no
-- index on section_id (sections are deleted rarely).
CREATE TABLE section_key_history (
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    old_key       text        NOT NULL,
    section_id    uuid        NOT NULL REFERENCES sections (id)   ON DELETE CASCADE,
    changed_at    timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    PRIMARY KEY (workspace_id, old_key)
);

-- Section membership with a per-section role (a SECTION-scope role). People who hold a workspace
-- permission to see all sections need no row here.
CREATE TABLE section_members (
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    section_id    uuid        NOT NULL REFERENCES sections (id)   ON DELETE CASCADE,
    user_id       uuid        NOT NULL REFERENCES users (id)      ON DELETE CASCADE,
    role_id       uuid        NOT NULL REFERENCES roles (id),     -- a role that still has members cannot be deleted
    added_at      timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    PRIMARY KEY (section_id, user_id)
);
CREATE INDEX idx_section_members_user ON section_members (workspace_id, user_id);   -- sidebar: the sections of a user
CREATE INDEX idx_section_members_role ON section_members (role_id);                 -- "View members" of a role; the check before a role is deleted

-- Configurable statuses per section. No transition table: issues move freely.
CREATE TABLE statuses (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    section_id    uuid        NOT NULL REFERENCES sections (id)   ON DELETE CASCADE,
    name          text        NOT NULL,
    color         text,                                -- #RRGGBB; the UI falls back to grey for anything else
    position      integer     NOT NULL,                -- column order on the board
    is_default    boolean     NOT NULL DEFAULT false,  -- status given to newly created issues
    created_at    timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
-- name is unique per section, ignoring case ("Done" and "done" are the same status);
-- this index also serves every lookup of the statuses of a section
CREATE UNIQUE INDEX uq_statuses_name        ON statuses (section_id, lower(name));
-- at most one default status per section
CREATE UNIQUE INDEX uq_statuses_one_default ON statuses (section_id) WHERE is_default;

CREATE TABLE categories (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    section_id    uuid        NOT NULL REFERENCES sections (id)   ON DELETE CASCADE,
    name          text        NOT NULL,
    description   text,
    color         text,                                -- #RRGGBB, as for statuses
    show_on_cards boolean     NOT NULL DEFAULT true,   -- show the category chip on board cards
    is_archived   boolean     NOT NULL DEFAULT false,  -- hidden from new issues; existing issues keep it
    created_at    timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
-- name is unique per section, ignoring case; also serves every lookup of the categories of a section
CREATE UNIQUE INDEX uq_categories_name ON categories (section_id, lower(name));

CREATE TABLE issues (
    id                 uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       uuid           NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    section_id         uuid           NOT NULL REFERENCES sections (id)   ON DELETE CASCADE,
    number             integer        NOT NULL,        -- shown as <section key>-<number>; moving an issue to another section gives it a new number
    title              text           NOT NULL,        -- at most 200 characters (checked in Java)
    description        jsonb,                          -- editor document (ProseMirror JSON, never HTML); images refer to attachments by id. Java validates node types and links
    status_id          uuid           NOT NULL REFERENCES statuses (id),   -- Java: must belong to the same section; a status that still has issues cannot be deleted
    priority           issue_priority NOT NULL DEFAULT 'NONE',
    effort_hours       numeric(6,2)   CHECK (effort_hours >= 0),
    due_date           date,
    -- Order inside a status column. A moved card gets the midpoint between its new neighbours
    -- (or last + 1000 at the end); renumber the column when the gap gets too small.
    board_position     numeric        NOT NULL DEFAULT 0,
    created_by         uuid           REFERENCES users (id) ON DELETE SET NULL,
    created_at         timestamp      NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at         timestamp      NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    -- "Done" flag: independent of status and never moves the issue ("Mark as complete" / "Reopen")
    completed_at       timestamp,
    completed_by       uuid           REFERENCES users (id) ON DELETE SET NULL,
    UNIQUE (section_id, number),                       -- also the lookup for /issues/IT-142
    CHECK (completed_at IS NOT NULL OR completed_by IS NULL)
);
-- the board and the table view: all issues of a section, by column and order
CREATE INDEX idx_issues_board ON issues (section_id, status_id, board_position);

CREATE TABLE issue_categories (
    workspace_id  uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    issue_id      uuid NOT NULL REFERENCES issues (id)     ON DELETE CASCADE,
    category_id   uuid NOT NULL REFERENCES categories (id) ON DELETE CASCADE,   -- Java: same section as the issue
    PRIMARY KEY (issue_id, category_id)
);
CREATE INDEX idx_issue_categories_category ON issue_categories (category_id);   -- issues per category; deleting a category

-- Current assignees (many per issue). Java: the user is a member of the issue's section.
CREATE TABLE issue_assignees (
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    issue_id      uuid        NOT NULL REFERENCES issues (id)     ON DELETE CASCADE,
    user_id       uuid        NOT NULL REFERENCES users (id)      ON DELETE CASCADE,
    assigned_by   uuid        REFERENCES users (id) ON DELETE SET NULL,
    assigned_at   timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    PRIMARY KEY (issue_id, user_id)
);
CREATE INDEX idx_issue_assignees_user ON issue_assignees (workspace_id, user_id);   -- "Assigned to me"

-- Append-only history behind the Activity log ("Maria K. was assigned by Andrey N."). Written in
-- the same transaction as the change to issue_assignees. user_id has no ON DELETE rule on
-- purpose: accounts are deactivated, not deleted, so the history stays complete.
CREATE TABLE assignment_events (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workspace_id  uuid             NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    issue_id      uuid             NOT NULL REFERENCES issues (id)     ON DELETE CASCADE,
    user_id       uuid             NOT NULL REFERENCES users (id),            -- who was (un)assigned
    actor_id      uuid             REFERENCES users (id) ON DELETE SET NULL,  -- who did it
    event         assignment_event NOT NULL,
    created_at    timestamp        NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX idx_assignment_events_issue ON assignment_events (issue_id, created_at DESC);

-- Comments are plain text (the UI shows them as text, never as markup). Replies are one level
-- deep: a reply to a reply is stored under the top-level comment. Comments are not edited or
-- deleted from the UI yet (edited_at is for later).
CREATE TABLE issue_comments (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    issue_id           uuid        NOT NULL REFERENCES issues (id)     ON DELETE CASCADE,
    author_id          uuid        REFERENCES users (id) ON DELETE SET NULL,
    parent_comment_id  uuid        REFERENCES issue_comments (id) ON DELETE CASCADE,   -- Java: same issue, and itself a top-level comment
    body               text        NOT NULL,       -- at most 5000 characters (checked in Java)
    created_at         timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    edited_at          timestamp
);
CREATE INDEX idx_issue_comments_issue  ON issue_comments (issue_id, created_at);   -- the comment list of an issue
-- Needed by the ON DELETE CASCADE above: without it, deleting an issue with many comments
-- scans the table once per deleted comment.
CREATE INDEX idx_issue_comments_parent ON issue_comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- Files of an issue. The bytes live in object storage; deleting a row must also delete the
-- object (a cleanup job covers failures). Downloads go through the API (permission check, then a
-- short-lived signed URL), with Content-Disposition: attachment and X-Content-Type-Options: nosniff.
CREATE TABLE attachments (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id   uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    issue_id       uuid        NOT NULL REFERENCES issues (id)     ON DELETE CASCADE,
    uploaded_by    uuid        REFERENCES users (id) ON DELETE SET NULL,
    file_name      text        NOT NULL,
    content_type   text        NOT NULL,           -- from the allow-list, checked against the real content
    size_bytes     bigint      NOT NULL CHECK (size_bytes >= 0),
    storage_key    text        NOT NULL,           -- location in object storage
    -- true: an image shown inside the description (the document refers to it by id);
    -- false: a file card above the text. Unreferenced inline images are deleted when the
    -- description is saved.
    is_inline      boolean     NOT NULL DEFAULT false,
    created_at     timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX idx_attachments_issue ON attachments (issue_id);

-- Saved filters. Permissions are checked when a preset is opened, not stored here.
-- Preset names do not have to be unique.
CREATE TABLE presets (
    id            uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid             NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    owner_id      uuid             NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name          text             NOT NULL,
    filters       jsonb            NOT NULL DEFAULT '{}'::jsonb,   -- the filter state of the board; unknown keys are ignored
    view_type     preset_view_type NOT NULL DEFAULT 'BOARD',
    group_by      text,                                           -- e.g. 'status'; validated against an allow-list in Java
    share_token   uuid             NOT NULL DEFAULT gen_random_uuid() UNIQUE,   -- the share link; the UNIQUE index is its lookup
    created_at    timestamp        NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at    timestamp        NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX idx_presets_owner ON presets (workspace_id, owner_id);   -- the preset list of a user

-- Inbox. NOTE: planned redesign, not built yet: an immutable `events` table (who did what to which
-- issue) plus `event_recipients` (event_id, user_id, read_at), so one event reaches many people and
-- the Activity log can reuse the events. Until then each notification is one row per recipient.
CREATE TABLE notifications (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    user_id       uuid        NOT NULL REFERENCES users (id)      ON DELETE CASCADE,  -- recipient
    actor_id      uuid        REFERENCES users (id) ON DELETE SET NULL,
    type          text        NOT NULL,            -- 'ASSIGNED', 'COMMENTED', 'MENTIONED', ...
    issue_id      uuid        REFERENCES issues (id) ON DELETE CASCADE,   -- Java: same workspace
    payload       jsonb,
    read_at       timestamp,
    created_at    timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX idx_notifications_inbox  ON notifications (user_id, workspace_id, created_at DESC);          -- the Inbox list
CREATE INDEX idx_notifications_unread ON notifications (user_id, workspace_id) WHERE read_at IS NULL;      -- the unread badge in the sidebar

-- Invitations: how people get into a workspace. The link in the email carries a random token;
-- only its hash is stored. The people who may invite (workspace.members.invite) never see the link.
-- Opening a link needs no sign-in and happens before a workspace is chosen, so this table is NOT
-- covered by row-level security below (look the token up with a privileged path).
CREATE TABLE invitations (
    id            uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid              NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    email         citext            NOT NULL,
    -- Java: a WORKSPACE-scope role of this workspace, never the Owner role. Deleting a role
    -- clears it on old (accepted or revoked) invitations; a PENDING one blocks the deletion.
    role_id       uuid              REFERENCES roles (id) ON DELETE SET NULL,
    invited_by    uuid              REFERENCES users (id) ON DELETE SET NULL,
    token_hash    text              NOT NULL UNIQUE,   -- SHA-256 of the token; the UNIQUE index is the lookup
    -- A link works for 7 days (expires_at). EXPIRED can be set by a cleanup job; until then treat
    -- PENDING with expires_at in the past as expired. "Send again" makes a new token and a new
    -- expires_at on the same row; inviting an address whose old invitation expired revokes it first.
    status        invitation_status NOT NULL DEFAULT 'PENDING',
    expires_at    timestamp         NOT NULL,
    created_at    timestamp         NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    accepted_at   timestamp,
    accepted_by   uuid              REFERENCES users (id) ON DELETE SET NULL,   -- Java: the account's email equals invitations.email
    CHECK (status <> 'PENDING' OR role_id IS NOT NULL)
);
-- one open invitation per email and workspace
CREATE UNIQUE INDEX uq_invitations_pending ON invitations (workspace_id, email) WHERE status = 'PENDING';

-- ---------------------------------------------------------------------
-- Audit logs (kept separate: each has its own shape). Append-only: the application role gets
-- INSERT and SELECT only. Every state-changing request writes one entry in the same transaction.
-- ---------------------------------------------------------------------

-- Workspace-level events: members, roles, permissions, invitations, section create/delete, settings.
CREATE TABLE workspace_audit_log (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    actor_id      uuid        REFERENCES users (id) ON DELETE SET NULL,
    action        text        NOT NULL,            -- 'workspace.updated', 'role.created', 'role.updated', 'role.deleted', 'member.role.changed', 'invitation.created', 'invitation.accepted', 'invitation.revoked'
    target_type   text        NOT NULL,            -- 'MEMBER', 'ROLE', 'SECTION', 'WORKSPACE', 'INVITATION'
    target_id     uuid,
    details       jsonb,
    ip_address    inet,
    created_at    timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX idx_workspace_audit_log ON workspace_audit_log (workspace_id, created_at DESC);   -- the Audit log page

-- Section-level events: issue changes, status/category config, section settings and members.
CREATE TABLE section_audit_log (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    section_id    uuid        NOT NULL REFERENCES sections (id)   ON DELETE CASCADE,
    actor_id      uuid        REFERENCES users (id) ON DELETE SET NULL,
    action        text        NOT NULL,            -- 'section.updated', 'category.created', 'member.added', 'member.removed', 'issue.completed', 'status.renamed', ...
    entity_type   text        NOT NULL,            -- 'ISSUE', 'STATUS', 'CATEGORY', 'SECTION', 'MEMBER'
    entity_id     uuid,
    issue_id      uuid,                            -- a plain value, not a foreign key, so the log survives issue deletion
    field         text,
    old_value     jsonb,
    new_value     jsonb,
    created_at    timestamp   NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX idx_section_audit_log ON section_audit_log (section_id, created_at DESC);   -- the section Audit log
-- (Add an index on issue_id when a page needs the history of one issue from this table.)

-- ---------------------------------------------------------------------
-- Optional second safety layer: row-level security.
-- Enable it once the Java app runs this at the start of every request transaction:
--     SELECT set_config('app.workspace_id', '<uuid>', true);
-- Requirements:
--   * the app connects with a normal login role (not the table owner, no BYPASSRLS)
--   * if the setting is missing the policy matches no rows (fails closed)
--   * NOT covered, on purpose: users, account_tokens, permissions, role_permissions
--     (no workspace_id), workspaces and workspace_members (read before a workspace is
--     chosen), invitations (opened by token without a workspace, see the table)
--   * RLS filters rows only; it does not check links between rows (see the Java list on top)
-- ---------------------------------------------------------------------
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOREACH t IN ARRAY ARRAY[
--     'roles', 'sections', 'section_key_history', 'section_members', 'statuses', 'categories',
--     'issues', 'issue_categories', 'issue_assignees', 'assignment_events', 'issue_comments',
--     'attachments', 'presets', 'notifications',
--     'workspace_audit_log', 'section_audit_log'
--   ] LOOP
--     EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
--     EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
--     EXECUTE format(
--       'CREATE POLICY tenant_isolation ON %I
--          USING      (workspace_id = current_setting(''app.workspace_id'', true)::uuid)
--          WITH CHECK (workspace_id = current_setting(''app.workspace_id'', true)::uuid)', t);
--   END LOOP;
-- END $$;
