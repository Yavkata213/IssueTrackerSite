import { createContext, useContext } from 'react';
import type { User } from '../types';

export interface AuthContextValue {
  /** `loading` only while a session that already exists is being read. */
  status: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** For a session that started somewhere else, e.g. a new account created from an invitation. */
  startSession: (user: User) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
