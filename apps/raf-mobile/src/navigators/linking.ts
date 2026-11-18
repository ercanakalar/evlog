import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import type { RootStackParamList } from '@/types/screens/navigation';

/**
 * Deep links, e.g.
 *   raf://scan               → open the receipt scanner
 *   raf://receipt/<id>       → review a scanned receipt
 *   raf://trip/<id>          → a saved receipt
 *   raf://product/<id>       → a product's countdown (expiry reminders open this)
 * Screens behind auth are only reachable once the user is signed in.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [Linking.createURL('/'), 'raf://'],
  config: {
    screens: {
      SignIn: 'sign-in',
      Tabs: {
        screens: {
          Home: '',
          Shelf: 'shelf',
          Lists: 'lists',
          Trips: 'trips',
        },
      },
      Scan: 'scan',
      ReceiptReview: 'receipt/:receiptId',
      Product: 'product/:itemId',
      TripDetail: 'trip/:receiptId',
      Spending: 'spending/:month?',
      Settings: 'settings',
    },
  },
};
