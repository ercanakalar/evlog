import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import { SpaceBetween } from './Row';
import { Text } from './Text';

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <SpaceBetween>
      <Text variant="heading" accessibilityRole="header">
        {title}
      </Text>
      {action}
    </SpaceBetween>
  );
}

/** Underlined text link ("See all 11"). */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text variant="label" style={{ textDecorationLine: 'underline' }}>
        {label}
      </Text>
    </Pressable>
  );
}
