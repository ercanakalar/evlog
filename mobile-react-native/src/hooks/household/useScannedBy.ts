import { useGetMeQuery } from '@/store/services/meService';
import type { Person } from '@/types/api/models';

/** Who in the household scanned a receipt, when it was not the user; null otherwise. */
export function useScannedBy(person: Person | null | undefined): string | null {
  const me = useGetMeQuery();
  if (!person || !me.data || person.id === me.data.id) return null;
  return person.fullName;
}
