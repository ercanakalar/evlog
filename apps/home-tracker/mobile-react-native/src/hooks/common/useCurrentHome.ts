import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useGetMeQuery } from '@/store/services/homeService';
import { selectAuthStatus } from '@/store/slices/authSlice';
import { homeSelected, selectSelectedHome } from '@/store/slices/sessionSlice';
import type { Role } from '@/types/api/models';

/**
 * The home and role the user is looking at. Falls back to the first
 * membership when nothing (or something stale) is selected.
 */
export function useCurrentHomeState() {
  const dispatch = useAppDispatch();
  const signedIn = useAppSelector(selectAuthStatus) === 'signedIn';
  const selected = useAppSelector(selectSelectedHome);
  const me = useGetMeQuery(undefined, { skip: !signedIn });
  const memberships = me.data?.homes ?? [];
  const current =
    memberships.find((m) => m.home.id === selected.homeId && m.role === selected.role) ?? memberships[0];

  const select = useCallback(
    (homeId: string, role: Role) => dispatch(homeSelected({ homeId, role })),
    [dispatch],
  );

  return {
    me: me.data,
    isLoading: signedIn && me.isLoading,
    error: me.error,
    refetch: me.refetch,
    current,
    memberships,
    select,
  };
}

/** For screens only reachable once a home exists (guarded by the navigator). */
export function useCurrentHome() {
  const state = useCurrentHomeState();
  if (!state.current) throw new Error('useCurrentHome used before a home exists');
  return { ...state, home: state.current.home, role: state.current.role };
}
