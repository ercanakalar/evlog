import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { useListSessionsQuery, useStartSessionMutation } from '@/store/services/conditionRecordService';
import type { ConditionSessionType } from '@/types/api/models';
import { useCurrentHome } from '../common/useCurrentHome';
import { useErrorAlert } from '../common/useErrorAlert';

const TYPES: ConditionSessionType[] = ['MOVE_IN', 'MOVE_OUT', 'PERIODIC'];

export function useConditionRecords() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const showError = useErrorAlert();
  const modal = useModal();
  const { home } = useCurrentHome();
  const sessions = useListSessionsQuery(home.id);
  const [start, { isLoading: starting }] = useStartSessionMutation();
  const openSession = sessions.data?.find((s) => s.status === 'OPEN');

  const open = (sessionId: string) => navigation.navigate('ConditionSession', { sessionId });

  const begin = (type: ConditionSessionType) =>
    start({ homeId: home.id, type })
      .unwrap()
      .then((s) => open(s.id))
      .catch((error: unknown) => showError(t('record.startFailed'), error));

  const startNew = () =>
    modal.choose({
      title: t('record.newSession'),
      message: t('record.chooseType'),
      choices: TYPES.map((type) => ({ label: t(`record.type.${type}`), onPress: () => void begin(type) })),
    });

  return {
    sessions: sessions.data,
    isLoading: sessions.isLoading,
    isRefreshing: sessions.isFetching && !sessions.isLoading,
    error: sessions.error,
    refresh: sessions.refetch,
    openSession,
    open,
    startNew,
    starting,
  };
}
