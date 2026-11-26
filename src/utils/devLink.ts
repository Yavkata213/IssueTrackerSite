/**
 * Turns a link from the mock backend into a path inside the app, or `null` for anything else.
 * Only the address of this very site is accepted.
 */
export function devLinkPath(link: string | null | undefined): string | null {
  if (!link) return null;
  try {
    const url = new URL(link, window.location.origin);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}
