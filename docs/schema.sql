-- =====================================================================
-- Workspace Task & Issue Tracker - SIMPLIFIED database skeleton
-- PostgreSQL 13+ (shared schema, multi-tenant by workspace_id)
-- Time: all timestamps are plain `timestamp` holding UTC. Java writes with ZoneOffset.UTC
-- (hibernate.jdbc.time_zone=UTC) and the defaults use now() AT TIME ZONE 'utc'.
--
-- Proposal next to docs/schema.sql (which stays untouched). Differences:
--   * all foreign keys are plain single-column keys to the parent's id
--   * no composite "helper" unique constraints, no duplicated scope columns
--   * only business-critical unique constraints remain
--
-- Tenant isolation, in three layers:
--   1. every workspace-owned table carries workspace_id and every query filters
--      by it (Hibernate 6 @TenantId or findByIdAndWorkspaceId in the repositories)
--   2. the Java services validate links between rows (list below)
--   3. optional row-level security at the bottom, as a safety net
--
-- Kept in the database (cheap, and the last line of defence for any writer):
--   primary keys, plain foreign keys, NOT NULL, enums, business unique
--   constraints (races cannot be prevented in Java alone), simple CHECKs.
--
-- Validated in the Java application, NOT in the database:
--   * a referenced row belongs to the same workspace (and section where it says so):
--     issues.status_id, issue_categories.category_id, section_members,
--     issue_assignees, comment replies, notifications, invitations, roles
--   * role scope: workspace_members/invitations use WORKSPACE roles,
--     section_members use SECTION roles, role_permissions pairs a role and a
--     permission of the same scope
--   * a section member is a member of the workspace; an issue assignee is a
--     member of the issue's section; a reply belongs to the same issue
--   * a section's new key is not an old_key in section_key_history of another section
--   * removing a workspace member also removes their section memberships and
--     issue assignments (no database cascade ties these together)
--   * permissions, section admin rules, workflow rules
--   Map unique-violation errors to HTTP 409, so a lost race looks like a normal conflict.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------
CREATE TYPE role_scope          AS ENUM ('WORKSPACE', 'SECTION');
CREATE TYPE member_status       AS ENUM ('ACTIVE', 'DEACTIVATED');
CREATE TYPE issue_priority      AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE assignment_event    AS ENUM ('ASSIGNED', 'UNASSIGNED');
CREATE TYPE preset_view_type    AS ENUM ('BOARD', 'TABLE');
CREATE TYPE invitation_status   AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- =====================================================================
-- MAIN (global) TABLES
-- Ids are UUIDs. The application should generate them time-ordered (UUIDv7);
-- the default is only a fallback.
-- =====================================================================

CREATE TABLE users (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email          citext      NOT NULL UNIQUE,
    password_hash  text        NOT NULL,
    display_name   text        NOT NULL,
    avatar_url     text,
    is_active      boolean     NOT NULL DEFAULT true,
    created_at     timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    last_login_at  timestamp
);

CREATE TABLE workspaces (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL,
    slug        text        NOT NULL UNIQUE,
    owner_id    uuid        NOT NULL REFERENCES users (id),
    logo_url    text,                           -- uploaded logo; the UI shows the first letter when empty
    default_role_id uuid,                       -- WORKSPACE-scope role given to new members (FK added below, roles come later)
    created_at  timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

-- Permission catalog (seed data, one list for both scopes).
CREATE TABLE permissions (
    id           uuid       PRIMARY KEY DEFAULT gen_random_uuid(),
    key          text       NOT NULL UNIQUE,      -- e.g. 'issue.create', 'section.settings.edit'
    name         text       NOT NULL,             -- label shown in the role editor, e.g. 'Edit issues'
    scope        role_scope NOT NULL,
    description  text
);

-- =====================================================================
-- WORKSPACE-SPECIFIC TABLES
-- =====================================================================

-- One table for workspace roles and section roles (scope column).
CREATE TABLE roles (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    scope         role_scope  NOT NULL,
    name          text        NOT NULL,
    description   text,
    is_system     boolean     NOT NULL DEFAULT false,   -- built-in roles cannot be deleted
    created_at    timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    UNIQUE (workspace_id, scope, name)
);

-- Which permissions a role grants. Java checks that role and permission have the same scope.
CREATE TABLE role_permissions (
    role_id        uuid NOT NULL REFERENCES roles (id)       ON DELETE CASCADE,
    permission_id  uuid NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- User <-> workspace link, carrying the workspace role (a WORKSPACE-scope role).
CREATE TABLE workspace_members (
    workspace_id  uuid          NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    user_id       uuid          NOT NULL REFERENCES users (id)      ON DELETE CASCADE,
    role_id       uuid          NOT NULL REFERENCES roles (id),
    status        member_status NOT NULL DEFAULT 'ACTIVE',
    joined_at     timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    last_active_at timestamp,                   -- per workspace (users.last_login_at is global and would leak activity in other workspaces)
    PRIMARY KEY (workspace_id, user_id)
);
ALTER TABLE workspaces ADD FOREIGN KEY (default_role_id) REFERENCES roles (id);
CREATE INDEX idx_workspace_members_user ON workspace_members (user_id);
CREATE INDEX idx_workspace_members_role ON workspace_members (role_id);

-- Sections. Settings (name, key, icon, description) are 1:1, so they live here.
-- (workspace_id, key) is also the lookup index for /sections/:key.
CREATE TABLE sections (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id   uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    name           text        NOT NULL,
    key            text        NOT NULL CHECK (key ~ '^[A-Z]{2,5}$'),
    icon           text        NOT NULL DEFAULT 'folder',   -- validated against a fixed allowlist in the app
    description    text,
    issue_counter  integer     NOT NULL DEFAULT 0,          -- last issue number handed out; increment with UPDATE ... RETURNING
    created_by     uuid        REFERENCES users (id) ON DELETE SET NULL,
    created_at     timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at     timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    UNIQUE (workspace_id, key)
);

-- Old keys keep working: IT-152 -> new key resolves through this table.
CREATE TABLE section_key_history (
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    old_key       text        NOT NULL,
    section_id    uuid        NOT NULL REFERENCES sections (id) ON DELETE CASCADE,
    changed_at    timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    PRIMARY KEY (workspace_id, old_key)
);
CREATE INDEX idx_section_key_history_section ON section_key_history (section_id);

-- Section membership with a per-section role (a SECTION-scope role).
CREATE TABLE section_members (
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    section_id    uuid        NOT NULL REFERENCES sections (id)   ON DELETE CASCADE,
    user_id       uuid        NOT NULL REFERENCES users (id)      ON DELETE CASCADE,
    role_id       uuid        NOT NULL REFERENCES roles (id),
    added_at      timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    PRIMARY KEY (section_id, user_id)
);
CREATE INDEX idx_section_members_user ON section_members (workspace_id, user_id);
CREATE INDEX idx_section_members_role ON section_members (role_id);

-- Configurable statuses per section. No transition table: issues move freely.
CREATE TABLE statuses (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    section_id    uuid        NOT NULL REFERENCES sections (id)   ON DELETE CASCADE,
    name          text        NOT NULL,
    color         text,
    position      integer     NOT NULL,            -- column order on the board
    is_default    boolean     NOT NULL DEFAULT false,  -- status given to newly created issues
    created_at    timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
-- name is unique per section, ignoring case ("Done" and "done" are the same status)
CREATE UNIQUE INDEX uq_statuses_name        ON statuses (section_id, lower(name));
-- at most one default status per section
CREATE UNIQUE INDEX uq_statuses_one_default ON statuses (section_id) WHERE is_default;

CREATE TABLE categories (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    section_id    uuid        NOT NULL REFERENCES sections (id)   ON DELETE CASCADE,
    name          text        NOT NULL,
    description   text,
    color         text,
    show_on_cards boolean     NOT NULL DEFAULT true,    -- show the category chip on board cards
    is_archived   boolean     NOT NULL DEFAULT false,   -- hidden from new issues; existing issues keep it
    created_at    timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE UNIQUE INDEX uq_categories_name ON categories (section_id, lower(name));

CREATE TABLE issues (
    id                 uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       uuid           NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    section_id         uuid           NOT NULL REFERENCES sections (id)   ON DELETE CASCADE,
    number             integer        NOT NULL,        -- shown as <section key>-<number>
    title              text           NOT NULL,
    description        jsonb,                          -- editor document (ProseMirror JSON, never HTML); images refer to attachments by id
    status_id          uuid           NOT NULL REFERENCES statuses (id),   -- Java: must belong to the same section
    priority           issue_priority NOT NULL DEFAULT 'NONE',
    effort_hours       numeric(6,2),
    due_date           date,
    board_position     numeric        NOT NULL DEFAULT 0,  -- order inside a status column
    created_by         uuid           REFERENCES users (id) ON DELETE SET NULL,
    created_at         timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at         timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    -- done flag: independent of status, never moves the issue
    completed_at       timestamp,
    completed_by       uuid           REFERENCES users (id) ON DELETE SET NULL,
    UNIQUE (section_id, number),
    CHECK (completed_at IS NOT NULL OR completed_by IS NULL)
);
CREATE INDEX idx_issues_board     ON issues (section_id, status_id, board_position);
CREATE INDEX idx_issues_status    ON issues (status_id);   -- the check when a status is deleted
CREATE INDEX idx_issues_due       ON issues (workspace_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_issues_completed ON issues (workspace_id, section_id) WHERE completed_at IS NOT NULL;

CREATE TABLE issue_categories (
    workspace_id  uuid NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    issue_id      uuid NOT NULL REFERENCES issues (id)     ON DELETE CASCADE,
    category_id   uuid NOT NULL REFERENCES categories (id) ON DELETE CASCADE,   -- Java: same section as the issue
    PRIMARY KEY (issue_id, category_id)
);
CREATE INDEX idx_issue_categories_category ON issue_categories (category_id);

-- Current assignees (many per issue). Java: the user is a member of the issue's section.
CREATE TABLE issue_assignees (
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    issue_id      uuid        NOT NULL REFERENCES issues (id)     ON DELETE CASCADE,
    user_id       uuid        NOT NULL REFERENCES users (id)      ON DELETE CASCADE,
    assigned_by   uuid        REFERENCES users (id) ON DELETE SET NULL,
    assigned_at   timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    PRIMARY KEY (issue_id, user_id)
);
CREATE INDEX idx_issue_assignees_user ON issue_assignees (workspace_id, user_id);  -- "Assigned to me"

-- Append-only history behind the Activity log.
CREATE TABLE assignment_events (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workspace_id  uuid             NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    issue_id      uuid             NOT NULL REFERENCES issues (id)     ON DELETE CASCADE,
    user_id       uuid             NOT NULL REFERENCES users (id),   -- who was (un)assigned
    actor_id      uuid             REFERENCES users (id) ON DELETE SET NULL,  -- who did it
    event         assignment_event NOT NULL,
    created_at    timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX idx_assignment_events_issue ON assignment_events (issue_id, created_at DESC);

CREATE TABLE issue_comments (
    id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id       uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    issue_id           uuid        NOT NULL REFERENCES issues (id)     ON DELETE CASCADE,
    author_id          uuid        REFERENCES users (id) ON DELETE SET NULL,
    parent_comment_id  uuid        REFERENCES issue_comments (id) ON DELETE CASCADE,  -- "Reply"; Java: same issue
    body               text        NOT NULL,
    created_at         timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    edited_at          timestamp
);
CREATE INDEX idx_issue_comments_issue  ON issue_comments (issue_id, created_at);
CREATE INDEX idx_issue_comments_parent ON issue_comments (parent_comment_id) WHERE parent_comment_id IS NOT NULL;

CREATE TABLE attachments (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id   uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    issue_id       uuid        NOT NULL REFERENCES issues (id)     ON DELETE CASCADE,
    uploaded_by    uuid        REFERENCES users (id) ON DELETE SET NULL,
    file_name      text        NOT NULL,
    content_type   text        NOT NULL,
    size_bytes     bigint      NOT NULL CHECK (size_bytes >= 0),
    storage_key    text        NOT NULL,           -- location in object storage, files are not kept in the DB
    is_inline      boolean     NOT NULL DEFAULT false,  -- image shown inside the description; false = file card above it. Unreferenced inline images are deleted when the description is saved
    created_at     timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX idx_attachments_issue ON attachments (issue_id);

-- Saved filters. Permissions are checked when a preset is opened, not stored here.
-- Preset names do not have to be unique.
CREATE TABLE presets (
    id            uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid             NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    owner_id      uuid             NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name          text             NOT NULL,
    filters       jsonb            NOT NULL DEFAULT '{}'::jsonb,
    view_type     preset_view_type NOT NULL DEFAULT 'BOARD',
    group_by      text,
    sort          jsonb,
    share_token   uuid             NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    created_at    timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at    timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX idx_presets_owner ON presets (workspace_id, owner_id);

-- Inbox.
CREATE TABLE notifications (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    user_id       uuid        NOT NULL REFERENCES users (id)      ON DELETE CASCADE,  -- recipient
    actor_id      uuid        REFERENCES users (id) ON DELETE SET NULL,
    type          text        NOT NULL,            -- e.g. 'ASSIGNED', 'COMMENTED', 'MENTIONED'
    issue_id      uuid        REFERENCES issues (id) ON DELETE CASCADE,   -- Java: same workspace
    payload       jsonb,
    read_at       timestamp,
    created_at    timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX idx_notifications_inbox  ON notifications (user_id, workspace_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id, workspace_id) WHERE read_at IS NULL;

CREATE TABLE invitations (
    id            uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  uuid              NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    email         citext            NOT NULL,
    role_id       uuid              NOT NULL REFERENCES roles (id),   -- Java: a WORKSPACE-scope role of this workspace
    invited_by    uuid              REFERENCES users (id) ON DELETE SET NULL,
    token_hash    text              NOT NULL UNIQUE,   -- only the hash is stored
    status        invitation_status NOT NULL DEFAULT 'PENDING',
    expires_at    timestamp NOT NULL,
    created_at    timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    accepted_at   timestamp
);
-- one open invitation per email and workspace
CREATE UNIQUE INDEX uq_invitations_pending ON invitations (workspace_id, email) WHERE status = 'PENDING';

-- ---------------------------------------------------------------------
-- Audit logs (kept separate: each has its own shape)
-- ---------------------------------------------------------------------

-- Workspace-level events: members, roles, permissions, section create/delete, settings.
CREATE TABLE workspace_audit_log (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    actor_id      uuid        REFERENCES users (id) ON DELETE SET NULL,
    action        text        NOT NULL,            -- e.g. 'member.invited', 'role.updated'
    target_type   text        NOT NULL,            -- 'MEMBER', 'ROLE', 'SECTION', 'WORKSPACE'
    target_id     uuid,
    details       jsonb,
    ip_address    inet,
    created_at    timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX idx_workspace_audit_log ON workspace_audit_log (workspace_id, created_at DESC);

-- Section-level events: issue changes, status/category config, section settings and members.
CREATE TABLE section_audit_log (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    workspace_id  uuid        NOT NULL REFERENCES workspaces (id) ON DELETE CASCADE,
    section_id    uuid        NOT NULL REFERENCES sections (id)   ON DELETE CASCADE,
    actor_id      uuid        REFERENCES users (id) ON DELETE SET NULL,
    action        text        NOT NULL,            -- e.g. 'issue.completed', 'status.renamed'
    entity_type   text        NOT NULL,            -- 'ISSUE', 'STATUS', 'CATEGORY', 'SECTION', 'MEMBER'
    entity_id     uuid,
    issue_id      uuid,                            -- kept as plain value so the log survives issue deletion
    field         text,
    old_value     jsonb,
    new_value     jsonb,
    created_at    timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
CREATE INDEX idx_section_audit_log       ON section_audit_log (section_id, created_at DESC);
CREATE INDEX idx_section_audit_log_issue ON section_audit_log (issue_id, created_at DESC) WHERE issue_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- Optional second safety layer: row-level security.
-- Enable it once the Java app runs this at the start of every request transaction:
--     SELECT set_config('app.workspace_id', '<uuid>', true);
-- Requirements:
--   * the app connects with a normal login role (not the table owner, no BYPASSRLS)
--   * if the setting is missing the policy matches no rows (fails closed)
--   * NOT covered, on purpose: users, permissions, role_permissions (no workspace_id),
--     and workspaces / workspace_members (read before a workspace is chosen)
--   * RLS filters rows only; it does not check links between rows (see the Java list on top)
-- ---------------------------------------------------------------------
-- DO $$
-- DECLARE t text;
-- BEGIN
--   FOREACH t IN ARRAY ARRAY[
--     'roles', 'sections', 'section_key_history', 'section_members', 'statuses', 'categories',
--     'issues', 'issue_categories', 'issue_assignees', 'assignment_events', 'issue_comments',
--     'attachments', 'presets', 'notifications', 'invitations',
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
