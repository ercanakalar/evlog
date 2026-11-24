import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { env } from '@/config/env';
import type { RootStackParamList } from '@/types/screens/navigation';

/**
 * Deep links, e.g.
 *   evlog://join/ABCDEFGH23           → join a home with an invite code
 *   evlog://receipt/<id>              → review a scanned bill or receipt
 *   evlog://condition/<id>            → open a condition record
 *   evlog://groceries/scan            → open the grocery receipt scanner
 *   evlog://groceries/product/<id>    → a product's countdown (expiry reminders open this)
 * Screens behind auth are only reachable once the user is signed in.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'evlog://', env.webOrigin],
  config: {
    screens: {
      SignIn: 'sign-in',
      SignUp: 'sign-up',
      Onboarding: 'join/:inviteCode?',
      HomeTabs: {
        screens: {
          Home: '',
          Record: 'record',
          Ratings: 'ratings',
          Groceries: {
            path: 'groceries',
            screens: {
              GroceryHome: '',
              GroceryShelf: 'shelf',
              GroceryLists: 'lists',
              GroceryTrips: 'trips',
            },
          },
          Upkeep: 'upkeep',
        },
      },
      ConditionSession: 'condition/:sessionId',
      ReceiptReview: 'receipt/:receiptId',
      ReceiptList: 'receipts',
      Listing: 'listing',
      GroceryScan: 'groceries/scan',
      GroceryReceipt: 'groceries/receipt/:receiptId',
      GroceryProduct: 'groceries/product/:itemId',
      GroceryHomeItem: 'groceries/home/:homeItemId',
      GroceryPackScan: 'groceries/scan-packs',
      GroceryTrip: 'groceries/trip/:receiptId',
      GrocerySpending: 'groceries/spending/:month?',
      GrocerySettings: 'groceries/settings',
      Profile: 'profile',
      Settings: 'settings',
      Legal: 'legal/:document',
    },
  },
};
