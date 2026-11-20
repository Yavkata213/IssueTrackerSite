// Input limits. The forms use them for `maxLength` and the API validates them again.
export const LIMITS = {
  sectionName: 60,
  sectionDescription: 280,
  roleName: 40,
  roleDescription: 200,
  categoryName: 40,
  categoryDescription: 200,
  workspaceName: 60,
  workspaceSlugMin: 3,
  workspaceSlugMax: 40,
  /** Workspace logo upload: PNG or JPG, up to 2 MB. */
  logoBytes: 2 * 1024 * 1024,
  logoMinPixels: 128,
  memberSearch: 100,
  issueTitle: 200,
  commentBody: 5000,
  effortHoursMax: 999,
} as const;
