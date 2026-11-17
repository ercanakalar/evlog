import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import { tokenStore, type Tokens } from './token-store';

interface AuthState {
  ready: boolean;
  signedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; fullName: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    void tokenStore.load().then((tokens) => {
      setSignedIn(tokens !== null);
      setReady(true);
    });
    // A failed refresh clears the tokens; reflect that everywhere.
    return tokenStore.subscribe((tokens) => {
      setSignedIn(tokens !== null);
      if (!tokens) queryClient.clear();
    });
  }, [queryClient]);

  const value: AuthState = {
    ready,
    signedIn,
    async signIn(email, password) {
      const tokens = await api<Tokens>('/auth/login', {
        method: 'POST',
        body: { email, password },
        auth: false,
      });
      await tokenStore.set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    },
    async signUp(input) {
      const tokens = await api<Tokens>('/auth/register', {
        method: 'POST',
        body: input,
        auth: false,
      });
      await tokenStore.set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
    },
    async signOut() {
      const tokens = tokenStore.get();
      if (tokens) {
        await api('/auth/logout', {
          method: 'POST',
          body: { refreshToken: tokens.refreshToken },
          auth: false,
        }).catch(() => undefined);
      }
      await tokenStore.set(null);
    },
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
