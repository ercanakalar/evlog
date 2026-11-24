import { useNavigation } from '@react-navigation/native';
import type { BarcodeScanningResult, CameraView } from 'expo-camera';
import { useMemo, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { useCameraAccess } from '@/hooks/common/useCameraAccess';
import { prepareImage } from '@/services/media/imageCapture';
import { describeError, asAppError } from '@/store/bases/errorMapping';
import { useListShelfQuery, useReadPackLabelMutation, useUpdateItemMutation } from '@/store/services/itemService';
import type { PackLabelResult, ShelfItem } from '@/types/api/models';

export type PackPhase = 'barcode' | 'date' | 'reading' | 'result';

/**
 * Products whose printed date is worth scanning: packaged and perishable.
 * Fruit and vegetables keep their average keeping time; products that do
 * not expire, or already have their pack date, are skipped.
 */
export const needsPackDate = (item: ShelfItem) =>
  item.category !== 'FRUIT_VEG' && item.daysLeft !== null && !item.packDate;

/**
 * Pack scanning: point at a barcode, the phone matches it with a product
 * from your receipts, then a photo of the date replaces the estimate.
 */
export function usePackScan(camera: RefObject<CameraView | null>, scope: { receiptId?: string; itemId?: string }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const modal = useModal();
  const cameraAccess = useCameraAccess();
  const shelf = useListShelfQuery();
  const [readLabel] = useReadPackLabelMutation();
  const [update, updateState] = useUpdateItemMutation();
  const [phase, setPhase] = useState<PackPhase>(scope.itemId ? 'date' : 'barcode');
  const [currentId, setCurrentId] = useState<string | undefined>(scope.itemId);
  const [result, setResult] = useState<PackLabelResult>();
  const [unknownBarcode, setUnknownBarcode] = useState<string>();
  const [done, setDone] = useState<string[]>([]);
  const lastScan = useRef<{ data: string; at: number }>({ data: '', at: 0 });

  const all = useMemo(() => shelf.data ?? [], [shelf.data]);
  const queue = useMemo(
    () =>
      all.filter(
        (i) =>
          (scope.itemId ? i.id === scope.itemId : needsPackDate(i)) &&
          (!scope.receiptId || i.receiptId === scope.receiptId) &&
          !done.includes(i.id),
      ),
    [all, scope.itemId, scope.receiptId, done],
  );
  const current = all.find((i) => i.id === currentId);

  const choose = (itemId: string) => {
    setCurrentId(itemId);
    setUnknownBarcode(undefined);
    setResult(undefined);
    setPhase('date');
  };

  const onBarcode = ({ data }: BarcodeScanningResult) => {
    const now = Date.now();
    if (data === lastScan.current.data && now - lastScan.current.at < 2500) return;
    lastScan.current = { data, at: now };
    // The same barcode can be on two receipts: the product that runs out first.
    const match = queue.filter((i) => i.barcode === data).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))[0];
    if (match) choose(match.id);
    else setUnknownBarcode(data);
  };

  const capture = async () => {
    if (!camera.current || !currentId) return;
    setPhase('reading');
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1 });
      const file = await prepareImage(photo);
      const read = await readLabel({ id: currentId, file }).unwrap();
      setResult(read);
      if (read.label.expiresOn) setDone((d) => [...d, currentId]);
      setPhase('result');
    } catch (error) {
      setPhase('date');
      modal.alert(t('packs.failed'), describeError(asAppError(error), t));
    }
  };

  const next = () => {
    setResult(undefined);
    setCurrentId(undefined);
    if (scope.itemId || queue.length === 0) navigation.goBack();
    else setPhase('barcode');
  };

  return {
    cameraAccess,
    loading: shelf.isLoading,
    phase,
    queue,
    current,
    result,
    unknownBarcode,
    scanned: done.length,
    onBarcode: phase === 'barcode' ? onBarcode : undefined,
    choose,
    capture: () => void capture(),
    retry: () => {
      setResult(undefined);
      setPhase('date');
    },
    /** When the date could not be read: type it in. */
    saveTyped: async (isoDay: string) => {
      if (!currentId) return;
      try {
        await update({ id: currentId, packExpiresAt: new Date(`${isoDay}T12:00:00`).toISOString() }).unwrap();
        setDone((d) => [...d, currentId]);
        next();
      } catch (error) {
        modal.alert(t('packs.failed'), describeError(asAppError(error), t));
      }
    },
    saving: updateState.isLoading,
    skip: () => {
      if (currentId) setDone((d) => [...d, currentId]);
      next();
    },
    next,
    close: () => navigation.goBack(),
  };
}
