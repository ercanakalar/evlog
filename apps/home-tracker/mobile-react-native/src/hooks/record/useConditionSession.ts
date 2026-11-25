import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { CameraPermissionError, captureImage } from '@/services/media/imageCapture';
import {
  useAddPhotoMutation,
  useGetSessionQuery,
  useSessionActionMutation,
} from '@/store/services/conditionRecordService';
import type { Room } from '@/types/api/models';
import { useCurrentHome } from '../common/useCurrentHome';
import { useErrorAlert } from '../common/useErrorAlert';

export function useConditionSession(sessionId: string) {
  const { t } = useTranslation();
  const showError = useErrorAlert();
  const { home, role, me } = useCurrentHome();
  const session = useGetSessionQuery(sessionId);
  const [addPhoto, { isLoading: uploading }] = useAddPhotoMutation();
  const [runAction, { isLoading: acting }] = useSessionActionMutation();
  const [room, setRoom] = useState<Room>('LIVING_ROOM');

  const s = session.data;
  const myConfirmation = s ? (role === 'OWNER' ? s.ownerConfirmedAt : s.tenantConfirmedAt) : null;

  const takePhoto = async () => {
    try {
      const file = await captureImage('camera');
      if (file) await addPhoto({ sessionId, room, file }).unwrap();
    } catch (error) {
      if (error instanceof CameraPermissionError) Alert.alert(t('receipts.cameraDenied'));
      else showError(t('record.photoFailed'), error);
    }
  };

  const lock = () =>
    Alert.alert(t('record.lockTitle'), t('record.lockBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('record.lock'),
        onPress: () =>
          void runAction({ sessionId, homeId: home.id, action: 'lock' })
            .unwrap()
            .catch((error: unknown) => showError(t('record.lockFailed'), error)),
      },
    ]);

  const confirm = () =>
    runAction({ sessionId, homeId: home.id, action: 'confirm' })
      .unwrap()
      .catch((error: unknown) => showError(t('record.confirmFailed'), error));

  return {
    session: s,
    userId: me?.id,
    isLoading: session.isLoading,
    isRefreshing: session.isFetching && !session.isLoading,
    error: session.error,
    refresh: session.refetch,
    room,
    setRoom,
    takePhoto,
    uploading,
    lock,
    confirm,
    acting,
    canLock: s?.status === 'OPEN' && s.photos.length > 0,
    canConfirm: s?.status === 'LOCKED' && !myConfirmation,
  };
}
