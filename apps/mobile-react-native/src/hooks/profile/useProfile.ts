import { signOut } from '@/store/actions/sessionActions';
import { useAppDispatch } from '@/store/hooks';
import { useCurrentHomeState } from '../common/useCurrentHome';

export function useProfile() {
  const dispatch = useAppDispatch();
  const { me, memberships, current, select } = useCurrentHomeState();
  return {
    me,
    memberships,
    current,
    select,
    signOut: () => void dispatch(signOut()),
  };
}
