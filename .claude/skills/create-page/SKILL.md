---
name: create-page
description: Build a new page or feature in the Issue Tracker frontend from a Figma frame image. Use when asked to implement, add or rebuild a page (board, issue page, inbox, presets, settings, members, ...). Covers questions first, API layer, security checks, routing and design verification.
---

# Create a page

Follow these steps in order. Do not skip the questions or the checks at the end.

## 1. Clarify first (mandatory)

Before writing code, read `CLAUDE.md`, `docs/schema.sql` and the frame image(s) in `docs/design/`. Then **ask the user about everything that is unclear** and wait for the answers. Typical gaps:

- Controls with no described behaviour (buttons, menus, icons): wire up, render only, or leave out?
- Data in the design that has no column in `docs/schema.sql`.
- Design vs. MUI default conflicts, states the frame does not show (empty, loading, error, no permission).
- Which permission or role allows each action on the page.
- Backend implications: new endpoints, new fields, new enum values.

Never guess and never add features that were not requested. If everything is clear, say so in one line and continue.

For a larger page, give a short plan (files, routes, API functions, shared components) and wait for approval.

## 2. Reuse before building

- Look in `src/components/common/` and `src/theme/` first. Use existing components (`UserAvatar`, `AssigneeGroup`, `PriorityChip`, `CategoryChips`, `CountBadge`, `DueDateLabel`, `SectionIcon`, `SelectButton`, `StatusDot`, `LoadError`, `ErrorToast`, `SaveBar`, `ConfirmDialog`, `WorkspaceLogo`, `SidePanel`) and the layout (`PageLayout`, `AppShell`). Settings-style pages (list + editor, floating save bar) use the shared pieces in `src/components/settings/` (`SettingsTabSelect`, `ListPanel`, `EditorParts`, `RoleEditor`, `PermissionList`, `useEditorDraft`) and follow `src/features/section-settings/` and `src/features/workspace-settings/`. A table that must not grow the page (members) scrolls inside its card with a sticky header and a pinned footer: see `workspace-settings/members/`. Anything that slides in from the right uses `SidePanel` (+ `SidePanelHeader`, `SidePanelBody`): see `RoleMembersPanel` and `features/issue/IssuePanel.tsx`. Rich text goes through `components/editor/RichTextEditor` (stored as JSON, never HTML); an issue-style page with two layouts (full page and panel) shares its parts like `features/issue/`.
- Shared helpers: `src/utils/colors.ts` (`safeColor`), `src/utils/permissions.ts` (`PERMISSION`, `hasPermission`), `src/utils/sectionKey.ts` (`isValidSectionKey`), `src/app/paths.ts` (`paths`, `routePatterns`).
- A piece used by more than one page goes to `src/components/common/` and is exported from its `index.ts`. Never copy styles between pages.
- Use MUI components and theme tokens (`palette`, `spacing`, `shape`). No hard-coded colours in components. A new token goes into the theme (with module augmentation if it is a custom key).
- Page code goes to `src/features/<page-name>/`, one folder per page, sub-folders for large parts (like `board/`, `table/`).

## 3. Data: only through `src/api`

Pages and components never import mock data and never fetch directly. The mock layer must be swappable for REST calls without touching pages.

- Types live in `src/types/index.ts`, aligned with `docs/schema.sql`. No `any`. Add view models there too.
- Every function in `src/api/index.ts` is `async`, returns typed data, and has the signature a REST call would have:
  - Takes `workspaceId` (and the parent id, e.g. `sectionId`) as arguments for every workspace-owned entity, so the real call becomes `/workspaces/{id}/...`. A mutation takes the same scope as a read. Never operate on a bare entity id.
  - Takes plain input objects (`MoveIssueInput`), not UI state.
  - Returns clones (`structuredClone`), never references into the store.
  - Returns `null` for "not found" on reads by key, and throws `ApiError` (`NOT_FOUND`, `FORBIDDEN`, `VALIDATION` from `src/api/errors.ts`) for failed writes; it never returns data from another workspace.
- Mock functions validate like a server would: the entity belongs to the given workspace and section, referenced ids (status, category, assignee) belong to the same section, enum values are valid, strings are trimmed and length-limited, numbers are finite.
- Reads that depend on permissions return the current user's permission keys with the data (a `permissions` field in the view model). The UI checks them with `hasPermission(permissions, PERMISSION.x)` to hide or disable what is not allowed. Add new keys to `PERMISSION` and to the mock role table. The backend is the real enforcement; the mock refuses a forbidden write with `FORBIDDEN`.
- Document each new function in one line above it: the expected endpoint and what it returns.
- Do not build anything into the page that only works because the data is in memory (shared object mutation, synchronous reads, array index assumptions).
- Document each new function in one line: what the real endpoint is expected to be and what it returns.

### Loading, errors and writes

- Every fetch has three states: loading, error (`LoadError` with retry), and result (including empty). A rejected promise must never leave the page blank: always `.catch` and use `getErrorMessage`.
- Ignore stale responses (`cancelled` flag in the effect cleanup), and remount page content on workspace or route-parameter change (`key=`). Data held outside a page (providers) is tagged with its workspace id and dropped on a workspace switch.
- Optimistic updates keep a snapshot, and on failure restore it, show `ErrorToast` and refetch (see `SectionIssuesPage`). Never fire `void apiCall()` without handling failure.
- Do not call `setState` synchronously inside an effect body, and do not write refs during render (the lint rules forbid both).

## 4. Security checklist (run on every page)

Treat all data from the API as untrusted, even from our own backend.

- [ ] No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function`, or HTML built from strings. Render user text only as React children.
- [ ] No URL from data is used as `href`, `src`, `window.open` or `navigate` target unless it is checked: relative app paths only, or `http(s):` after parsing with `new URL`. Block `javascript:` and `data:`. Attachment links open with `rel="noopener noreferrer"`.
- [ ] Path segments built from data are passed through `encodeURIComponent`.
- [ ] Colours, icon names and other "style" values from data are validated against a pattern or allow-list with a safe fallback: colours through `safeColor` (theme colour as fallback), icons through the `SectionIcon` map. An invalid value must not crash `alpha()` or reach CSS unchecked.
- [ ] No tokens, passwords, keys or personal data in `localStorage`, `sessionStorage`, URLs, query strings, logs or error messages. JWT handling lives only in `src/api` (later: an axios instance with an interceptor; prefer in-memory storage or an httpOnly cookie, decided with the backend).
- [ ] URL parameters (`:key`, `?view=`, `?q=`) are parsed against an allow-list or pattern before use; unknown values fall back to a default or "not found". Never trust them as ids.
- [ ] Every action is gated by a permission from the data. Hidden or disabled UI is a convenience only; the mock API also refuses forbidden writes.
- [ ] Data of another workspace is never shown: no caching across a workspace switch, every request carries the workspace id, and state is reset on switch.
- [ ] Inputs: length limits, trimmed values, validation messages. Free-text search is matched as a plain string, never built into a `RegExp` unescaped.
- [ ] No secrets or real personal data in mock data, comments or docs.
- [ ] No `console.log` of API data. No new dependency without asking.

## 5. Routing checklist

- [ ] The route is added in `src/App.tsx` inside the `AppShell` route, before the `*` not-found route. The page is a named export in its own file.
- [ ] The path is added to `src/app/paths.ts` (a builder for paths with parameters, a pattern in `routePatterns`) and follows the existing scheme (`/sections/:key`, `/inbox`, `/presets/:id`, ...).
- [ ] Every link, redirect and `navigate` call uses `paths.*` (no hand-written URLs); the builder encodes parameters.
- [ ] The sidebar entry highlights correctly when the page is open, including nested paths and different letter case of a key in the URL.
- [ ] Opening the URL directly, reloading, and browser back/forward all work.
- [ ] Unknown parameter values (missing section, id of another workspace) show a proper "not found" state, not a blank page or a crash.
- [ ] Switching the workspace while on the page ends in a valid state.
- [ ] View/filter state that should be shareable is in the URL (`?view=`), the rest stays in component state.
- [ ] Breadcrumbs match the design and the page title/heading is correct.
- [ ] Routes that need a login or permission are guarded in one place (route wrapper), not per page. Until auth exists, mark the spot with a short comment.

## 6. Build and verify

1. `npx tsc -b`, `npm run lint`, `npm run build` must pass without warnings that you introduced.
2. Start the dev server (reuse a running one), open the page at 1920x1080 and compare with the frame image in `docs/design/`: positions, sizes, spacing, font sizes, colours. Measure with the browser (bounding boxes) instead of judging by eye. Resolve differences through the theme, not page-local overrides.
3. Exercise every control that is wired up: filters, menus, drag and drop, dialogs, keyboard (Tab, Enter, Escape), narrow viewport for overflow.
4. Test the states: loading, empty, error, not found, no permission.
5. Check the browser console for errors and warnings.
6. Reset the browser viewport when done.

## 7. Finish

- Report: what was built, which controls are only rendered, which placeholders exist, backend implications (endpoints, fields, permissions), and anything in the design that conflicts with the schema or the rules.
- Name any shared component, helper, permission key or path that was added.
- Do not commit unless asked. Commit messages and PR descriptions follow the attribution rules of the session.
