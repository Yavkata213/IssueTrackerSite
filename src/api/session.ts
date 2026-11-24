import { ApiError } from './errors';

// Who is signed in. The real backend reads this from the JWT of every request; the mock keeps it in
// memory, so reloading the page signs out. It is never written to `localStorage` or the URL.

let signedInUserId: string | null = null;

export function setSessionUser(userId: string | null): void {
  signedInUserId = userId;
}

export function hasSession(): boolean {
  return signedInUserId !== null;
}

/** Id of the signed-in user. Throws UNAUTHENTICATED (HTTP 401) when nobody is signed in. */
export function currentUserId(): string {
  if (signedInUserId === null) throw new ApiError('UNAUTHENTICATED', 'Please sign in.');
  return signedInUserId;
}
