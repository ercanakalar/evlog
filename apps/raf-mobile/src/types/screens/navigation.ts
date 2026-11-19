import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type TabParamList = {
  Home: undefined;
  /** `view` opens the shelf on the countdown or on the at-home counts. */
  Shelf: { view?: 'countdown' | 'atHome' } | undefined;
  Lists: undefined;
  Trips: undefined;
};

export type RootStackParamList = {
  // Signed out
  SignIn: undefined;
  // Signed in
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Scan: undefined;
  ReceiptReview: { receiptId: string };
  Product: { itemId: string };
  /** Photograph packs for their printed dates: all products, one receipt's, or one product. */
  PackScan: { receiptId?: string; itemId?: string } | undefined;
  TripDetail: { receiptId: string };
  Spending: { month?: string } | undefined;
  Settings: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    // Types useNavigation() and linking across the app (React Navigation's documented pattern).
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
