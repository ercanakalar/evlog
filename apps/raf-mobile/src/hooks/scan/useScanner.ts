import { StackActions, useNavigation } from '@react-navigation/native';
import type { CameraView } from 'expo-camera';
import { useCameraPermissions } from 'expo-camera';
import { useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { MAX_RECEIPT_PARTS } from '@/constants/domain';
import { PhotoPermissionError, pickImage, prepareImage } from '@/services/media/imageCapture';
import { uploadReceipt } from '@/store/actions/receiptActions';
import { describeError } from '@/store/bases/errorMapping';
import { useAppDispatch } from '@/store/hooks';
import type { UploadFile } from '@/types/api/requests';

/**
 * Camera -> photo(s) -> upload -> review. A long receipt is photographed in
 * parts, top first; the API joins them into one receipt.
 */
export function useScanner(camera: RefObject<CameraView | null>) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [long, setLong] = useState(false);
  const [parts, setParts] = useState<UploadFile[]>([]);
  const [busy, setBusy] = useState<'capturing' | 'uploading' | null>(null);

  const upload = async (files: UploadFile[]) => {
    setBusy('uploading');
    const result = await dispatch(uploadReceipt(files));
    setBusy(null);
    if (uploadReceipt.fulfilled.match(result)) {
      navigation.dispatch(StackActions.replace('ReceiptReview', { receiptId: result.payload }));
      return;
    }
    setParts([]);
    Alert.alert(t('scan.failed'), describeError(result.payload, t));
  };

  const capture = async () => {
    if (!camera.current || !ready || busy) return;
    setBusy('capturing');
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1, skipProcessing: false });
      const file = await prepareImage(photo);
      setBusy(null);
      if (!long) return void upload([file]);
      const next = [...parts, file];
      setParts(next);
      if (next.length >= MAX_RECEIPT_PARTS) void upload(next);
    } catch {
      setBusy(null);
      Alert.alert(t('scan.failed'), t('scan.cameraError'));
    }
  };

  const fromGallery = async () => {
    try {
      const file = await pickImage();
      if (!file) return;
      if (long) setParts((p) => [...p, file]);
      else void upload([file]);
    } catch (error) {
      if (error instanceof PhotoPermissionError) Alert.alert(t('scan.failed'), t('scan.photosDenied'));
    }
  };

  return {
    permission,
    requestPermission,
    onReady: () => setReady(true),
    torch,
    toggleTorch: () => setTorch((v) => !v),
    long,
    toggleLong: () => {
      setLong((v) => !v);
      setParts([]);
    },
    parts: parts.length,
    busy,
    capture: () => void capture(),
    fromGallery: () => void fromGallery(),
    finishLong: () => void upload(parts),
    close: () => navigation.goBack(),
  };
}
