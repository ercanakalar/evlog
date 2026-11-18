import type { ApplianceType, RatingCategory, ReceiptKind, Room } from '@/types/api/models';

export const ROOMS: Room[] = [
  'LIVING_ROOM', 'KITCHEN', 'BEDROOM', 'BATHROOM', 'BALCONY', 'HALLWAY', 'METERS', 'OTHER',
];

export const RATING_CATEGORIES: RatingCategory[] = [
  'HOME_CONDITION', 'NEIGHBORHOOD', 'INFRASTRUCTURE', 'HEATING_EFFICIENCY', 'RENOVATIONS',
];

/** Which receipt unlocks a rating category (null = condition record). */
export const CATEGORY_UNLOCKED_BY: Record<RatingCategory, ReceiptKind | null> = {
  HOME_CONDITION: null,
  NEIGHBORHOOD: 'RENT',
  INFRASTRUCTURE: 'UTILITY_ELECTRICITY',
  HEATING_EFFICIENCY: 'UTILITY_GAS',
  RENOVATIONS: 'RENOVATION',
};

export const QUICK_ADD_APPLIANCES: ApplianceType[] = [
  'COMBI_BOILER', 'DISHWASHER', 'WASHING_MACHINE', 'AIR_CONDITIONER', 'REFRIGERATOR',
];

export const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{10}$/;
export const ROOM_LAYOUT_PATTERN = /^\d{1,2}(\.5)?\+\d$/;

/** Polling interval while the receipt reader is still working. */
export const RECEIPT_POLL_MS = 2000;
export const RECEIPTS_PAGE_SIZE = 20;
