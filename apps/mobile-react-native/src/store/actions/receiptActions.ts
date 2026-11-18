import { CameraPermissionError, captureImage } from '@/services/media/imageCapture';
import type { ReceiptKind } from '@/types/api/models';
import { asAppError } from '../bases/errorMapping';
import { receiptService } from '../services/receiptService';
import { createAppAsyncThunk } from './createAppAsyncThunk';

interface ScanArgs {
  kind: ReceiptKind;
  homeId?: string;
  source: 'camera' | 'library';
}

/**
 * Photo -> upload -> receipt reader. Resolves with the receipt id to review,
 * or null when the user cancelled the camera. A duplicate image resolves to
 * the receipt that was already scanned.
 */
export const scanReceipt = createAppAsyncThunk(
  'receipts/scan',
  async ({ kind, homeId, source }: ScanArgs, { dispatch, rejectWithValue }) => {
    let file;
    try {
      file = await captureImage(source);
    } catch (error) {
      if (error instanceof CameraPermissionError) {
        return rejectWithValue({ status: 0, message: 'cameraDenied', messages: [] });
      }
      throw error;
    }
    if (!file) return null;

    try {
      const receipt = await dispatch(
        receiptService.endpoints.uploadReceipt.initiate({ file, kind, homeId }),
      ).unwrap();
      return receipt.id;
    } catch (error) {
      const appError = asAppError(error);
      const existing = (appError.body as { receiptId?: string } | undefined)?.receiptId;
      if (appError.status === 409 && existing) return existing;
      return rejectWithValue(appError);
    }
  },
);
