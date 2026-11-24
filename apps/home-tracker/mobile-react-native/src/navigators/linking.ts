import type { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { env } from '@/config/env';
import type { RootStackParamList } from '@/types/screens/navigation';

/**
 * Deep links, e.g.
 *   evlog://join/ABCDEFGH23      → join a home with an invite code
 *   evlog://receipt/<id>         → review a scanned receipt
 *   evlog://condition/<id>       → open a condition record
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
          Kitchen: 'kitchen',
          Upkeep: 'upkeep',
        },
      },
      ConditionSession: 'condition/:sessionId',
      ReceiptReview: 'receipt/:receiptId',
      ReceiptList: 'receipts',
      Listing: 'listing',
      Profile: 'profile',
      Settings: 'settings',
      Legal: 'legal/:document',
    },
  },
};
