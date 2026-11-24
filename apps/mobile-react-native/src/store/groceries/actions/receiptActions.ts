import type { UploadFile } from '@/types/api/groceries/requests';
import { asAppError } from '@/store/bases/errorMapping';
import { receiptService } from '@/store/groceries/services/receiptService';
import { createAppAsyncThunk } from '@/store/actions/createAppAsyncThunk';

/**
 * Uploads the photo(s) of one receipt and resolves with the receipt id to
 * review. A photo that was already scanned resolves to the existing receipt.
 */
export const uploadReceipt = createAppAsyncThunk(
  'groceries/uploadReceipt',
  async (files: UploadFile[], { dispatch, rejectWithValue }) => {
    try {
      const receipt = await dispatch(receiptService.endpoints.uploadReceipt.initiate({ files })).unwrap();
      return receipt.id;
    } catch (error) {
      const appError = asAppError(error);
      const existing = (appError.body as { receiptId?: string } | undefined)?.receiptId;
      if (appError.status === 409 && existing) return existing;
      return rejectWithValue(appError);
    }
  },
);
