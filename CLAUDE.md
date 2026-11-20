# Workspace Task & Issue Tracker - Frontend

React + TypeScript single-page app for a multi-tenant task and issue tracker.
This repo is the frontend only. The backend (Java / Spring Boot, PostgreSQL, JWT) is a separate project that is not built yet.

## Working rules

- When something is unclear, ask questions and wait for the answers before implementing, so everything is clarified up front. Do not guess.
- Only implement what is described in the request. Do not add features, pages or options on your own.
- New pages follow the `create-page` skill (`.claude/skills/create-page/SKILL.md`): questions first, data only through `src/api`, security and routing checks, design verification.
- Keep manual corrections I make to files. Never overwrite or "tidy" them.
- Before a larger change, give feedback or a short plan first and wait for my answer. Mention backend implications when a change affects data or endpoints.
- After implementing a page, check alignment and spacing against the design.
- Build shared pieces (theme, layout, reusable components) once and reuse them. Do not copy styles between pages.

## Stack

- React + TypeScript
- Material UI (MUI) for components. The design mirrors MUI styling, so use MUI components and theme tokens instead of custom CSS wherever possible.
- Roboto font (Regular and Medium)

## Design source

- Figma file "SAP Project", file key `IRl225tzKZM9pwhFuXY28k`, page "Web design".
- Frames are 1920x1080. Sidebar is 280 px wide, content area is 1640 px wide.
- Exported frame images are in `docs/design/`. Pages are built from them with the `create-page` skill (`.claude/skills/create-page/SKILL.md`).
- The database design is in `docs/schema.sql`. Use it as the source of truth for entities and field names.

### Style tokens

| Token | Value |
|---|---|
| Primary | `#1976D2` |
| Text | black at 87% (primary), 60% (secondary) |
| Outlines | black at 23% (fields), 12% (cards, dividers) |
| Radius | 4 px fields and buttons, 8 px cards |
| Cards | white, 1 px border at 12% black |
| Info alert | background `#E5F6FD`, text `#014361` |
| Success button | outlined, green `#2E7D32` with 50% border |
| Sidebar active row | 264x40, primary tinted background, primary text and icon |

Put these in one MUI theme. Do not hard-code colours in components.

## Pages (built with the `create-page` skill)

- Issues board, in two views: Board and Table (grouped by status, scrollable)
- Issue full page and issue side panel
- Inbox
- Assigned to you
- Presets: list page and preset view
- Section settings: Members and roles, Category, General
- Roles & permissions (workspace roles)
- Workspace settings
- Members page

## Product rules and decisions

**Structure**
- A workspace contains sections. A user belongs to workspaces and, inside them, to sections with per-section roles.
- The sidebar has: Inbox, Assigned to me, Presets, pinned sections, a section list with filter, and Admin links (Audit log, Workspace settings).
- Presets sit in the sidebar under "Assigned to me".

**Sections**
- A section has a name, a key, an icon and a description (General settings page).
- Section key: 2 to 5 capital letters, unique across the workspace, suggested from the name and editable. It is not locked once issues exist. Changing it renames issue ids and old links redirect.
- Icon: chosen from a fixed set of Material icons (24 in the design). No colour option. The icon is neutral and turns blue when selected or active in the sidebar.
- Only section admins can change section settings. Saving writes an audit log entry.
- Example keys: IT Support = IT, Finance = FIN, Facilities = FAC, Human Resources = HR, Maintenance = MNT.

**Issues**
- Ids look like `IT-152` (section key + per-section number). Moving an issue to another section gives it a new number.
- Statuses are configured per section. There is no state machine: issues can be moved freely between any statuses.
- Priorities are a fixed list: Low, Medium, High, Urgent.
- An issue can have several assignees, several categories, an effort estimate (hours), a due date, comments (with replies) and attachments.
- "Done" is a flag, separate from status. "Mark as complete" / "Reopen" only toggles that flag (`completed_at`, `completed_by`) and never changes the status. The button is outlined green with a check-circle icon. On the full page it sits at the top right of the issue container on the title row. In the side panel it sits left of "Open full page".
- The activity log lists assignment events (who was assigned, by whom, when). It shows as grey text below the details, beside the comments.

**Table view**
- Same information as the board cards, grouped by status with group headers on top, sticky header, scrollable.

**Presets**
- A preset saves filters, view type (Board or Table) and group by. It has a name and a share link.
- The list page has a search field, a "New preset" button and a list of presets. Clicking one opens the preset view: a board or table with the saved filters applied, a back arrow at the top left, an editable name, and a Share button at the top right.
- Permissions are checked when a preset is opened, not stored in the preset.

**Access control**
- Roles: workspace roles and section roles, each granting permissions from a fixed permission catalog. Hide or disable UI the user's permissions do not allow, but treat the backend as the real enforcement.

## Backend assumptions (not built yet)

- REST API, JWT authentication.
- Shared database schema, every workspace-owned row has a workspace id. The frontend always works inside one selected workspace.
- Until the backend exists, use typed mock data and a thin API layer (for example `src/api/`) so pages can switch to real endpoints without changes.

## Conventions

- Strict TypeScript. No `any`.
- Keep types for entities (User, Workspace, Section, Issue, Status, Category, Preset, Role, Permission) in one place, aligned with `docs/schema.sql`.
- One folder per page or feature. Shared components in a common folder.
- Match the Figma design closely: spacing, sizes and alignment matter. When the design and MUI defaults disagree, follow the design through the theme.
