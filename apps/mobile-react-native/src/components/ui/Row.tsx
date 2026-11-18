import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { space } from '@/constants/layout';

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.sm }, style]}>{children}</View>;
}

export function SpaceBetween({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <Row style={[{ justifyContent: 'space-between' }, style]}>{children}</Row>;
}
