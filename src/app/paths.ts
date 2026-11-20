// The one place that knows the URLs of the app. Links and redirects use these builders;
// route patterns are used only by the router in App.tsx.

export type SettingsTab = 'general' | 'members' | 'category';
export type WorkspaceSettingsTab = 'general' | 'roles' | 'members';

export const paths = {
  home: '/',
  inbox: '/inbox',
  assigned: '/assigned',
  presets: '/presets',
  auditLog: '/audit-log',
  workspaceSettings: '/workspace-settings',
  workspaceSettingsTab: (tab?: WorkspaceSettingsTab) =>
    `/workspace-settings${tab && tab !== 'general' ? `?tab=${tab}` : ''}`,
  /** Path segments built from data are always encoded. */
  section: (key: string) => `/sections/${encodeURIComponent(key)}`,
  /** Full page of an issue; `issueKey` looks like `IT-142`. */
  issue: (issueKey: string) => `/issues/${encodeURIComponent(issueKey)}`,
  /** The board or table of a section with the issue panel open. */
  sectionIssue: (key: string, issueKey: string, view?: string) =>
    `/sections/${encodeURIComponent(key)}?${view ? `view=${encodeURIComponent(view)}&` : ''}issue=${encodeURIComponent(issueKey)}`,
  sectionSettings: (key: string, tab?: SettingsTab) =>
    `/sections/${encodeURIComponent(key)}/settings${tab && tab !== 'general' ? `?tab=${tab}` : ''}`,
} as const;

export const routePatterns = {
  section: '/sections/:key',
  sectionSettings: '/sections/:key/settings',
  issue: '/issues/:issueKey',
} as const;
