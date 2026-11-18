import type { ConditionSessionType, ListingShareField, RatingCategory, ReceiptKind, ReceiptStatus, Room } from './models';

/** A local file from the camera or library, sent as multipart. */
export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

export interface SignInRequest { email: string; password: string }
export interface SignUpRequest { email: string; password: string; fullName: string }

export interface CreateHomeRequest {
  city: string;
  district: string;
  neighborhood?: string;
  addressLine: string;
  roomLayout: string;
  areaM2?: number;
}

export interface StartSessionRequest { homeId: string; type: ConditionSessionType }
export interface AddPhotoRequest { sessionId: string; room: Room; file: UploadFile }
export interface SessionActionRequest { sessionId: string; homeId: string; action: 'lock' | 'confirm' }

export interface UploadReceiptRequest { file: UploadFile; kind: ReceiptKind; homeId?: string }
export interface UpdateReceiptRequest {
  id: string;
  merchantName?: string;
  issuedAt?: string;
  totalAmount?: number;
}
export interface ListReceiptsRequest { homeId?: string; kind?: ReceiptKind; status?: ReceiptStatus }

export interface SubmitRatingRequest {
  homeId: string;
  scores: { category: RatingCategory; score: number }[];
  noteForNextTenant?: string;
}

export interface UpdateListingRequest {
  id: string;
  homeId: string;
  changes: Partial<Record<ListingShareField, boolean>>;
}
export interface AddBrokerRequest { id: string; homeId: string; agencyName: string; email: string }
