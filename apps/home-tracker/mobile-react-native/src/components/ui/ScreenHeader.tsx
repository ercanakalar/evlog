import { useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { space } from '@/constants/layout';
import { IconButton } from './IconButton';
import { SpaceBetween } from './Row';
import { Text } from './Text';

/** Big title with optional back button (stack screens) and a trailing action. */
export function ScreenHeader({ title, back, action }: { title: string; back?: boolean; action?: ReactNode }) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  return (
    <View style={{ gap: space.sm, marginTop: space.sm }}>
      {back ? (
        <IconButton icon="chevron-left" tone="card" label={t('common.back')} onPress={() => navigation.goBack()} />
      ) : null}
      <SpaceBetween>
        <Text variant="title">{title}</Text>
        {action}
      </SpaceBetween>
    </View>
  );
}
