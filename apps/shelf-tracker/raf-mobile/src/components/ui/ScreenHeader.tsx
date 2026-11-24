import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { IconButton } from './IconButton';
import { SpaceBetween } from './Row';
import { Text } from './Text';

/**
 * Tab screens: a big title with an optional action. Stack screens (`back`):
 * a chevron and a smaller title, as in the mockups.
 */
export function ScreenHeader({ title, back, action }: { title?: string; back?: boolean; action?: ReactNode }) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  if (!back) {
    return (
      <SpaceBetween style={{ minHeight: 44 }}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {action}
      </SpaceBetween>
    );
  }
  return (
    <SpaceBetween style={{ marginLeft: -12, marginRight: action ? -12 : 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
        <IconButton icon="chevron-left" label={t('common.back')} onPress={() => navigation.goBack()} />
        {title ? (
          <Text variant="screenTitle" accessibilityRole="header" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
        ) : null}
      </View>
      {action}
    </SpaceBetween>
  );
}
