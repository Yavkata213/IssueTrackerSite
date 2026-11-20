/**
 * Image URLs come from the backend, so they are untrusted. Only `https:`, `http:` and `blob:`
 * (a logo the user just picked) are used; anything else, `javascript:` and `data:` included,
 * is dropped and the UI shows its fallback.
 */
export function safeImageUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:' || protocol === 'blob:' ? value : undefined;
  } catch {
    return undefined;
  }
}
