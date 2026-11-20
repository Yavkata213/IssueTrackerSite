/** "Andrey Nikolov" -> "Andrey N.", the short form used in the assignee field and the activity log. */
export function shortName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length < 2) return displayName.trim();
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}
