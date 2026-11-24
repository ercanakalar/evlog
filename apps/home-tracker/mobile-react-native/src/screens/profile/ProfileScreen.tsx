import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, Chip, Row, Screen, ScreenHeader, SectionHeader, Text } from '@/components/ui';
import { useProfile } from '@/hooks/profile/useProfile';
import { useTheme } from '@/theme';
import type { IconName } from '@/types/components/ui';
import type { RootScreenProps } from '@/types/screens/navigation';

export function ProfileScreen({ navigation }: RootScreenProps<'Profile'>) {
  const { t } = useTranslation();
  const p = useProfile();
  const hasHome = p.memberships.length > 0;

  return (
    <Screen>
      <ScreenHeader back title={t('profile.title')} />
      {p.me ? (
        <Card>
          <Text variant="heading">{p.me.fullName}</Text>
          <Text muted>{p.me.email}</Text>
        </Card>
      ) : null}

      {hasHome ? (
        <>
          <SectionHeader title={t('profile.homes')} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {p.memberships.map((m) => (
              <Chip
                key={`${m.home.id}:${m.role}`}
                label={`${m.home.district} ${m.home.roomLayout} · ${m.role === 'OWNER' ? t('common.owner') : t('common.tenant')}`}
                selected={p.current?.home.id === m.home.id && p.current.role === m.role}
                onPress={() => p.select(m.home.id, m.role)}
              />
            ))}
          </View>
        </>
      ) : null}

      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {hasHome ? <MenuRow icon="file-text" label={t('profile.receipts')} onPress={() => navigation.navigate('ReceiptList')} /> : null}
        <MenuRow icon="settings" label={t('profile.settings')} onPress={() => navigation.navigate('Settings')} />
        <MenuRow icon="shield" label={t('profile.legal')} onPress={() => navigation.navigate('Legal', { document: 'privacy' })} />
      </Card>
      <Button title={t('profile.signOut')} variant="outline" onPress={p.signOut} />
    </Screen>
  );
}

function MenuRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={label} style={{ paddingHorizontal: 0, paddingVertical: 12 }}>
      <Row>
        <Feather name={icon} size={18} color={colors.text} />
        <Text style={{ flex: 1 }}>{label}</Text>
        <Feather name="chevron-right" size={18} color={colors.textMuted} />
      </Row>
    </Card>
  );
}
