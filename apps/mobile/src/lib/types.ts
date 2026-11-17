// Shapes returned by the Evlog API. Money is a decimal string ("389.90").

export type Role = 'OWNER' | 'TENANT';
export type Room =
  | 'LIVING_ROOM' | 'KITCHEN' | 'BEDROOM' | 'BATHROOM' | 'BALCONY' | 'HALLWAY' | 'METERS' | 'OTHER';
export type ReceiptKind =
  | 'GROCERY' | 'RENT' | 'UTILITY_ELECTRICITY' | 'UTILITY_WATER' | 'UTILITY_GAS'
  | 'UTILITY_INTERNET' | 'RENOVATION' | 'APPLIANCE' | 'SERVICE' | 'OTHER';
export type ReceiptStatus = 'PENDING' | 'PROCESSING' | 'PARSED' | 'FAILED' | 'CONFIRMED';
export type RatingCategory =
  | 'HOME_CONDITION' | 'NEIGHBORHOOD' | 'INFRASTRUCTURE' | 'HEATING_EFFICIENCY' | 'RENOVATIONS';
export type ApplianceType =
  | 'COMBI_BOILER' | 'DISHWASHER' | 'WASHING_MACHINE' | 'DRYER' | 'AIR_CONDITIONER'
  | 'REFRIGERATOR' | 'OVEN' | 'WATER_HEATER' | 'WATER_PURIFIER' | 'OTHER';

export interface Home {
  id: string;
  city: string;
  district: string;
  neighborhood: string | null;
  addressLine: string;
  roomLayout: string;
  areaM2: number | null;
}

export interface Me {
  id: string;
  email: string;
  fullName: string;
  homes: { role: Role; home: Home; tenancyId?: string }[];
}

export interface HomeScore {
  score: number | null;
  ratingCount: number;
  categories: Partial<Record<RatingCategory, number>>;
}

export interface Dashboard {
  home: Home;
  role: Role;
  activeTenancy: { id: string; startDate: string; verified: boolean } | null;
  score: HomeScore;
  conditionRecord: {
    id: string;
    type: ConditionSessionType;
    status: ConditionStatus;
    startedAt: string;
    photoCount: number;
    previewPhotoIds: string[];
  } | null;
  listings: { count: number };
  kitchen: { lowCount: number };
  upkeep: (MaintenanceTask & { appliance: { id: string; name: string } }) | null;
}

export type ConditionSessionType = 'MOVE_IN' | 'MOVE_OUT' | 'PERIODIC';
export type ConditionStatus = 'OPEN' | 'LOCKED' | 'CONFIRMED';

export interface ConditionSession {
  id: string;
  homeId: string;
  tenancyId: string | null;
  type: ConditionSessionType;
  status: ConditionStatus;
  startedAt: string;
  lockedAt: string | null;
  contentHash: string | null;
  ownerConfirmedAt: string | null;
  tenantConfirmedAt: string | null;
  photoCount?: number;
  rooms: Partial<Record<Room, number>>;
}

export interface ConditionPhoto {
  id: string;
  room: Room;
  capturedAt: string;
  receivedAt: string;
  sha256: string;
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity: string;
  unit: string | null;
  unitPrice: string | null;
  totalPrice: string;
}

export interface Receipt {
  id: string;
  kind: ReceiptKind;
  status: ReceiptStatus;
  homeId: string | null;
  merchantName: string | null;
  issuedAt: string | null;
  totalAmount: string | null;
  currency: string;
  ocrError: string | null;
  items?: ReceiptItem[];
}

export interface RatingEligibility {
  tenancyId: string;
  tenancyVerified: boolean;
  alreadyRated: boolean;
  categories: { category: RatingCategory; requirement: string; eligible: boolean; receiptIds: string[] }[];
}

export interface PublishedRating {
  id: string;
  submittedAt: string;
  noteForNextTenant: string | null;
  scores: { category: RatingCategory; score: number; _count: { evidence: number } }[];
}

export interface KitchenSummary {
  lastScan: { receiptId: string; issuedAt: string | null; itemCount: number; total: string | null; currency: string } | null;
  runningLow: {
    id: string;
    name: string;
    lastPurchasedAt: string;
    daysSincePurchase: number;
    usualDurationDays: number | null;
  }[];
  priceWatch: {
    name: string;
    normalizedName: string;
    unit: string | null;
    price: string;
    previousPrice: string | null;
    changePercent: number | null;
  }[];
}

export interface MaintenanceTask {
  id: string;
  title: string;
  intervalDays: number;
  lastDoneAt: string | null;
  nextDueAt: string;
  daysLeft: number;
}

export interface Appliance {
  id: string;
  type: ApplianceType;
  name: string;
  warrantyUntil: string | null;
  hasReceipt: boolean;
  tasks: MaintenanceTask[];
}

export interface Upkeep {
  next: (MaintenanceTask & { appliance: { id: string; name: string; type: ApplianceType } }) | null;
  appliances: Appliance[];
}

export interface Listing {
  id: string;
  provider: 'SAHIBINDEN';
  externalId: string;
  url: string;
  title: string | null;
  priceAmount: string | null;
  currency: string;
  lastSyncedAt: string | null;
  syncError: string | null;
  sharePhotos: boolean;
  shareRatings: boolean;
  shareHeatingBills: boolean;
  coverPhotoId: string | null;
  brokers: { id: string; agencyName: string; contactName: string | null; email: string; lastViewAt: string | null }[];
  updates: { createdAt: string }[];
}
