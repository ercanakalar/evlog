import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/screens/navigation';

/** For navigation from outside React components (e.g. notification handlers). */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
