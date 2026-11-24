import { LIMITS } from './limits';

/** Lowercase letters, digits and single hyphens inside; 3 to 40 characters. It is part of the workspace URL. */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidWorkspaceSlug(value: string): boolean {
  return value.length >= LIMITS.workspaceSlugMin && value.length <= LIMITS.workspaceSlugMax && SLUG.test(value);
}

/** Turns what the user types into the allowed alphabet. Trailing hyphens stay while typing. */
export function normalizeWorkspaceSlugInput(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-/, '')
    .slice(0, LIMITS.workspaceSlugMax);
}

/** The part of the workspace URL after the slug. Shown as fixed text next to the field. */
export const WORKSPACE_URL_SUFFIX = '.tracker.example.com';

/** Suggests a URL from a workspace name: "Acme Design Studio" -> "acme-design-studio". */
export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LIMITS.workspaceSlugMax)
    .replace(/-+$/g, '');
}
