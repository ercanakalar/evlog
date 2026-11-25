import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ReportTarget } from '@/types/api/models';

export type HomeTabParamList = {
  Home: undefined;
  Record: undefined;
  Ratings: undefined;
  Kitchen: undefined;
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
  Report: { targetType: ReportTarget; targetId: string };
  // Always available
  Profile: undefined;
  Settings: undefined;
  Legal: { document: LegalDocument };
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type TabScreenProps<T extends keyof HomeTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<HomeTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    // Types useNavigation() and linking across the app (React Navigation's documented pattern).
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
