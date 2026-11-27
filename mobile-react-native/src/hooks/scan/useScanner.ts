import { StackActions, useNavigation } from '@react-navigation/native';
import { skipToken } from '@reduxjs/toolkit/query';
import type { CameraView } from 'expo-camera';
import { useEffect, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { MAX_RECEIPT_PARTS, RECEIPT_POLL_MS } from '@/constants/domain';
import { useCameraAccess } from '@/hooks/common/useCameraAccess';
import * as haptics from '@/services/haptics';
import { pickImages, prepareImage } from '@/services/media/imageCapture';
import { uploadReceipt } from '@/store/actions/receiptActions';
import { describeError } from '@/store/bases/errorMapping';
import { useAppDispatch } from '@/store/hooks';
import { useGetReceiptQuery } from '@/store/services/receiptService';
import type { UploadFile } from '@/types/api/requests';

/** Where a sent receipt is: each step is one the app can see happen. */
export type ScanStage = 'preparing' | 'sending' | 'reading' | 'matching' | 'done';

/** How long "Found N items" stays up before the review opens. */
const DONE_PAUSE_MS = 700;

/**
 * Camera -> photo(s) -> upload -> read -> review. A long receipt is
 * photographed in parts, top first; the API joins them into one receipt.
 * Once a receipt is sent, the photo stays on screen as the background while
 * it is prepared, sent and read; the review opens when the reading is done.
 */
export function useScanner(camera: RefObject<CameraView | null>) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const modal = useModal();
  const cameraAccess = useCameraAccess();
  const [ready, setReady] = useState(false);
  const [torch, setTorch] = useState(false);
  const [long, setLong] = useState(false);
  const [parts, setParts] = useState<UploadFile[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [step, setStep] = useState<Exclude<ScanStage, 'matching' | 'done'> | null>(null);
  /** The photo shown behind the progress; camera photos fill the screen like the preview did. */
  const [preview, setPreview] = useState<{ uri: string; fit: 'cover' | 'contain' } | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const reading = useGetReceiptQuery(receiptId ?? skipToken, {
    pollingInterval: step === 'reading' ? RECEIPT_POLL_MS : 0,
  });
  const status = reading.data?.status;
  const partCount = reading.data?.partCount ?? photoCount;
  const partsRead = reading.data?.partsRead ?? 0;
  // Every photo read but not yet done: the lines are being matched with products.
  const stage: ScanStage | null =
    step !== 'reading' ? step : status === 'PARSED' ? 'done' : reading.data?.partCount && partsRead >= partCount ? 'matching' : step;
  const found = reading.data ? (reading.data.items?.length ?? reading.data._count?.items ?? 0) : 0;

  useEffect(() => {
    if (!receiptId || !status || status === 'PENDING' || status === 'PROCESSING') return;
    // Replaces the scanner only while it is still on screen: closing it leaves the receipt reading.
    const openReview = () => {
      if (navigation.isFocused()) navigation.dispatch(StackActions.replace('ReceiptReview', { receiptId }));
    };
    // Unreadable or already saved: the review explains it, no need to pause.
    if (status === 'FAILED') haptics.failed();
    if (status !== 'PARSED') return openReview();
    haptics.succeeded();
    const timer = setTimeout(openReview, DONE_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [navigation, receiptId, status]);

  const reset = () => {
    setStep(null);
    setPreview(null);
    setParts([]);
    setReceiptId(null);
  };

  const upload = async (files: UploadFile[], shown: { uri: string; fit: 'cover' | 'contain' }) => {
    setPreview(shown);
    setPhotoCount(files.length);
    setStep('sending');
    const result = await dispatch(uploadReceipt(files));
    if (uploadReceipt.fulfilled.match(result)) {
      setStep('reading');
      setReceiptId(result.payload);
      return;
    }
    reset();
    haptics.failed();
    modal.alert(t('scan.failed'), describeError(result.payload, t));
  };

  const capture = async () => {
    if (!camera.current || !ready || capturing || stage) return;
    setCapturing(true);
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1, skipProcessing: false });
      haptics.tapped();
      const frozen = { uri: photo.uri, fit: 'cover' as const };
      const last = !long || parts.length + 1 >= MAX_RECEIPT_PARTS;
      // The last photo freezes on screen straight away, while it is made ready to send.
      if (last) {
        setPreview(frozen);
        setStep('preparing');
      }
      const file = await prepareImage(photo);
      setCapturing(false);
      if (!long) return void upload([file], frozen);
      const next = [...parts, file];
      setParts(next);
      if (last) void upload(next, frozen);
    } catch {
      // Parts already taken of a long receipt are kept; only the frozen photo goes.
      setCapturing(false);
      setStep(null);
      setPreview(null);
      modal.alert(t('scan.failed'), t('scan.cameraError'));
    }
  };

  /**
   * Gallery photos are sent straight away as one receipt: one photo is the
   * whole receipt, several are its parts in the order picked. Parts already
   * taken with the camera come first. Nothing is left waiting, so the same
   * receipt cannot end up in one upload twice.
   */
  const fromGallery = async () => {
    if (stage) return;
    try {
      const files = await pickImages(MAX_RECEIPT_PARTS - parts.length);
      const [first] = files;
      if (!first) return;
      void upload([...parts, ...files], { uri: first.uri, fit: 'contain' });
    } catch {
      modal.alert(t('scan.failed'), t('scan.photoUnreadable'));
    }
  };

  return {
    cameraAccess,
    onReady: () => setReady(true),
    torch,
    toggleTorch: () => setTorch((v) => !v),
    long,
    toggleLong: () => {
      setLong((v) => !v);
      setParts([]);
    },
    parts: parts.length,
    /** The long-receipt parts taken so far, top first, for their thumbnails. */
    partPhotos: parts.map((p) => p.uri),
    /** Drops the last part taken, to take it again. */
    undoPart: () => setParts((current) => current.slice(0, -1)),
    /** A photo is being taken (or a long-receipt part made ready). */
    capturing,
    /** Set once a receipt is on its way: the camera controls give way to its progress. */
    stage,
    preview,
    photoCount,
    partCount,
    partsRead,
    found,
    capture: () => void capture(),
    fromGallery: () => void fromGallery(),
    finishLong: () => {
      const last = parts[parts.length - 1];
      if (last) void upload(parts, { uri: last.uri, fit: 'cover' });
    },
    close: () => navigation.goBack(),
  };
}
