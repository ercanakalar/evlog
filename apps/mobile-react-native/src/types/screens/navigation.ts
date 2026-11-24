import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Inside the Groceries tab: Overview · Shelf · Lists · Trips (the sub-bar under the title). */
export type GroceriesTabParamList = {
  GroceryHome: undefined;
  /** `view` opens the shelf on the countdown or on the at-home counts. */
  GroceryShelf: { view?: 'countdown' | 'atHome' } | undefined;
  GroceryLists: undefined;
  GroceryTrips: undefined;
};

export type HomeTabParamList = {
  Home: undefined;
  Record: undefined;
  Ratings: undefined;
  Groceries: NavigatorScreenParams<GroceriesTabParamList> | undefined;
  Upkeep: undefined;
};

export type LegalDocument = 'privacy' | 'terms' | 'verification';

export type RootStackParamList = {
  // Signed out
  SignIn: undefined;
  SignUp: undefined;
  // Signed in, no home yet
  Onboarding: { inviteCode?: string } | undefined;
  // Signed in with a home
  HomeTabs: NavigatorScreenParams<HomeTabParamList> | undefined;
  ConditionSession: { sessionId: string };
  ReceiptReview: { receiptId: string };
  ReceiptList: undefined;
  Listing: undefined;
  // Groceries (Raf API, its own account)
  GroceryScan: undefined;
  GroceryReceipt: { receiptId: string };
  GroceryProduct: { itemId: string };
  /** An at-home product with its brands and pack sizes. */
  GroceryHomeItem: { homeItemId: string };
  /** Photograph packs for their printed dates: all products, one receipt's, or one product. */
  GroceryPackScan: { receiptId?: string; itemId?: string } | undefined;
  GroceryTrip: { receiptId: string };
  GrocerySpending: { month?: string } | undefined;
  GrocerySettings: undefined;
  // Always available
  Profile: undefined;
  Settings: undefined;
  Legal: { document: LegalDocument };
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof HomeTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<HomeTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type GroceriesTabScreenProps<T extends keyof GroceriesTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<GroceriesTabParamList, T>,
  TabScreenProps<'Groceries'>
>;

declare global {
  namespace ReactNavigation {
    // Types useNavigation() and linking across the app (React Navigation's documented pattern).
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
