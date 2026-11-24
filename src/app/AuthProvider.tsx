import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getCurrentUser, hasSession, signIn as apiSignIn, signOut as apiSignOut } from '../api';
import type { User } from '../types';
import { AuthContext } from './authContext';
import type { AuthContextValue } from './authContext';

type AuthState = Pick<AuthContextValue, 'status' | 'user'>;

/**
 * Knows who is signed in. The access token lives only in memory (in `src/api`), never in
 * `localStorage` or `sessionStorage`. With the real backend a reload asks the refresh cookie for a
 * new token; the mock has no cookie, so a reload signs out.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    hasSession() ? { status: 'loading', user: null } : { status: 'signedOut', user: null },
  );

  useEffect(() => {
    if (state.status !== 'loading') return;
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (!cancelled) setState({ status: 'signedIn', user });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'signedOut', user: null });
      });
    return () => {
      cancelled = true;
    };
  }, [state.status]);

  const signIn = useCallback(async (email: string, password: string) => {
    const user = await apiSignIn(email, password);
    setState({ status: 'signedIn', user });
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setState({ status: 'signedOut', user: null });
  }, []);

  const startSession = useCallback((user: User) => setState({ status: 'signedIn', user }), []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signOut, startSession }),
    [state, signIn, signOut, startSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
