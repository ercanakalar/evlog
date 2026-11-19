import type { Category, ReceiptStatus, UserSettings } from './models';

/** A local file from the camera or library, sent as multipart. */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
  /** Web only: the photo's bytes (the browser has no file system to read the uri from). */
  blob?: Blob;
}

export interface SignInRequest { email: string; password: string }
/** `fullName` defaults to the part of the email before the "@". */
export interface SignUpRequest { email: string; password: string; fullName?: string }

/** Parts of one receipt, top to bottom (one part for a normal receipt). */
export interface UploadReceiptRequest { files: UploadFile[] }

export interface ReceiptLineInput {
  name: string;
  rawName?: string;
  quantity?: number;
  unit?: string;
  totalPrice: number;
  category?: Category;
  shelfLifeDays?: number | null;
  checked?: boolean;
  barcode?: string;
}

export interface UpdateReceiptRequest {
  id: string;
  merchantName?: string;
  issuedAt?: string;
  totalAmount?: number;
  items?: ReceiptLineInput[];
}

export interface ListReceiptsRequest {
  status?: ReceiptStatus;
  market?: string;
  from?: string;
  to?: string;
}

export interface UpdateItemRequest {
  id: string;
  opened?: boolean;
  packExpiresAt?: string | null;
  usedUp?: boolean;
  category?: Category;
}

export type UpdateSettingsRequest = Partial<UserSettings>;

export interface SpendingRequest { month?: string; months: number; utcOffset: number }
