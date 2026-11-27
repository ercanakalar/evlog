// Shapes returned by the Raf API. Money is a decimal string ("389.90"); dates are ISO strings.

export type Category =
  | 'DAIRY_EGGS' | 'MEAT_FISH' | 'FRUIT_VEG' | 'BAKERY' | 'PANTRY' | 'DRINKS' | 'HOUSEHOLD' | 'OTHER';
export type ReceiptStatus = 'PENDING' | 'PROCESSING' | 'PARSED' | 'FAILED' | 'CONFIRMED';
export type SignInMethod = 'google' | 'password';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserSettings {
  currency: string;
  expiryReminders: boolean;
  reminderLeadDays: number;
  trackHomeItems: boolean;
  countFromReceipts: boolean;
}

export interface Me extends UserSettings {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
  signInMethods: SignInMethod[];
  categoryCount: number;
  marketCount: number;
}

export interface ReceiptItem {
  id: string;
  position: number;
  name: string;
  rawName: string;
  /** EAN printed beside the line on the receipt, when the reader could verify it. */
  barcode?: string | null;
  quantity: string;
  unit: string | null;
  unitPrice: string | null;
  totalPrice: string;
  category: Category;
  shelfLifeDays: number | null;
  openedShelfLifeDays: number | null;
  needsReview: boolean;
  expiresAt: string | null;
  /** Brand printed in the line ("SUTAS AYRAN" -> Sütaş), when it is a known one. */
  brand?: Brand | null;
  /** Pack size printed in the line, as a decimal string ("1000") and unit ("ml"). */
  packAmount?: string | null;
  packUnit?: string | null;
  /** The user keeps a countdown for it on the shelf. */
  onShelf: boolean;
  /** Count it at home: true adds it (creating the at-home product), false skips it, null only if it matches one. */
  countAtHome: boolean | null;
  /** What this line added at home when the receipt was saved. */
  homeChanges?: { amount: string; homeItem: { id: string; name: string; unit: HomeUnit } }[];
}

export interface Receipt {
  id: string;
  status: ReceiptStatus;
  merchantName: string | null;
  issuedAt: string | null;
  totalAmount: string | null;
  currency: string;
  ocrError: string | null;
  /** How many photos it has, and how many the reader has finished (absent from older APIs). */
  partCount?: number;
  partsRead?: number;
  confirmedAt: string | null;
  createdAt: string;
  items?: ReceiptItem[];
  _count?: { items: number };
}

export interface Market {
  name: string;
  trips: number;
}

export interface Brand {
  id: string;
  name: string;
}

/** A product from a saved receipt, with its countdown. */
export interface ShelfItem {
  id: string;
  name: string;
  rawName: string;
  barcode: string | null;
  quantity: string;
  unit: string | null;
  totalPrice: string;
  category: Category;
  shelfLifeDays: number | null;
  openedShelfLifeDays: number | null;
  expiresAt: string | null;
  packDate: boolean;
  openedAt: string | null;
  usedUpAt: string | null;
  brand: Brand | null;
  /** Printed pack size: 1000 + "ml", 1 + "L", 15 + "pack". */
  packAmount: number | null;
  packUnit: string | null;
  boughtAt: string | null;
  market: string | null;
  receiptId: string;
  /** Null when the product does not expire. */
  daysLeft: number | null;
  totalDays: number | null;
}

export interface PurchaseRecord {
  id: string;
  quantity: string;
  unitPrice: string | null;
  totalPrice: string;
  receiptId: string;
  market: string | null;
  boughtAt: string | null;
}

export type ShelfItemDetail = ShelfItem & { history: PurchaseRecord[] };

/** At-home products that ran out when a product was marked used up, and the list they went on. */
export interface AddedToList {
  id: string;
  name: string;
  added: string[];
}

export type UpdatedItem = ShelfItemDetail & { addedToList?: AddedToList | null };

/** What the reader found on a photo of a pack. */
export interface PackLabelResult {
  item: ShelfItemDetail;
  label: {
    /** "YYYY-MM-DD", or null when no date was found. */
    expiresOn: string | null;
    barcode: string | null;
    /** False when the photographed pack's barcode is another product's. */
    barcodeMatches: boolean | null;
    error: string | null;
    /** What the camera read, shown when no date was found. */
    text: string | null;
  };
}

/** How an at-home product is counted: whole pieces, or kilograms. */
export type HomeUnit = 'PIECE' | 'KG';

export interface HomeItem {
  id: string;
  name: string;
  unit: HomeUnit;
  /** Pieces, or kilograms (up to 3 decimals) for KG items. */
  count: number;
  /** What the last matching receipt added, in `unit`. */
  lastMatchAdded: number | null;
  lastMatchMarket: string | null;
  lastMatchAt: string | null;
  /** What is at home by brand and pack size, from receipts (less what was used up). */
  variants: HomeVariant[];
}

/** One brand and pack size of an at-home product: Sütaş, 1000 ml, 1 at home. */
export interface HomeVariant {
  brand: string | null;
  /** Clean name of the newest purchase ("Ayran 1000 ml"). */
  name: string;
  packAmount: number | null;
  packUnit: string | null;
  /** In the home item's unit. */
  count: number;
  lastBoughtAt: string | null;
  lastMarket: string | null;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  done: boolean;
  lastPrice: string | null;
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: string;
  items: ShoppingListItem[];
}

export interface RunningLowItem {
  homeItemId: string;
  name: string;
  unit: HomeUnit;
  count: number;
  lastPrice: string | null;
}

export interface ListsOverview {
  lists: ShoppingList[];
  runningLow: RunningLowItem[];
}

export interface HomeInsights {
  /** "YYYY-MM" */
  month: string;
  spent: string;
  previousSameDay: string;
  trips: number;
  items: number;
  useSoon: ShelfItem[];
  useSoonCount: number;
  lastTrip: {
    id: string;
    merchantName: string | null;
    issuedAt: string | null;
    totalAmount: string | null;
    currency: string;
    itemCount: number;
  } | null;
}

export interface SpendingInsights {
  months: { month: string; total: string; trips: number }[];
  month: string;
  total: string;
  byCategory: { category: Category; total: string }[];
  byMarket: { market: string | null; total: string }[];
}
