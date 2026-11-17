import { createContext, useContext, useState, type ReactNode } from 'react';
import { useMe } from './queries';
import type { Home, Role } from './types';

interface CurrentHome {
  home: Home;
  role: Role;
  /** Every (home, role) pair the user has, for the Owner/Tenant switch. */
  options: { home: Home; role: Role }[];
  select: (homeId: string, role: Role) => void;
}

const HomeContext = createContext<CurrentHome | null | undefined>(undefined);

export function HomeProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const me = useMe(enabled);
  const [selected, setSelected] = useState<{ homeId: string; role: Role } | null>(null);
  const options = me.data?.homes ?? [];
  const current =
    options.find((o) => o.home.id === selected?.homeId && o.role === selected.role) ?? options[0];

  const value: CurrentHome | null = current
    ? {
        home: current.home,
        role: current.role,
        options,
        select: (homeId, role) => setSelected({ homeId, role }),
      }
    : null;

  return <HomeContext value={enabled && me.isPending ? undefined : value}>{children}</HomeContext>;
}

/** undefined while loading, null when the user has no home yet. */
export function useCurrentHomeState() {
  return useContext(HomeContext);
}

/** For screens that are only reachable once a home exists. */
export function useCurrentHome(): CurrentHome {
  const value = useContext(HomeContext);
  if (!value) throw new Error('No home selected');
  return value;
}
