/**
 * Where to go after signing in. Only a path inside this app is accepted (one that starts with a
 * single `/`), so a crafted value can never send the person to another site.
 */
export function safeInternalPath(value: unknown): string {
  if (typeof value !== 'string') return '/';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/';
  return value;
}
