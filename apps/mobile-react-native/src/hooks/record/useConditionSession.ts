import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
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
  const modal = useModal();
  const { home, role } = useCurrentHome();
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
      if (error instanceof CameraPermissionError) modal.alert(t('receipts.cameraDenied'));
      else showError(t('record.photoFailed'), error);
    }
  };

  const lock = () =>
    modal.confirm({
      title: t('record.lockTitle'),
      message: t('record.lockBody'),
      confirmLabel: t('record.lock'),
      onConfirm: () =>
        runAction({ sessionId, homeId: home.id, action: 'lock' })
          .unwrap()
          .catch((error: unknown) => showError(t('record.lockFailed'), error)),
    });

  const confirm = () =>
    runAction({ sessionId, homeId: home.id, action: 'confirm' })
      .unwrap()
      .catch((error: unknown) => showError(t('record.confirmFailed'), error));

  return {
    session: s,
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
