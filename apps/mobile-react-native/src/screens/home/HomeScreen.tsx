import { useTranslation } from 'react-i18next';
import { ConditionRecordCard } from '@/components/home/ConditionRecordCard';
import { FeatureTile } from '@/components/home/FeatureTile';
import { ScoreCard } from '@/components/home/ScoreCard';
import { Button, Chip, ErrorView, IconButton, Loading, Row, Screen, SpaceBetween, Text } from '@/components/ui';
import { useHomeDashboard } from '@/hooks/home/useHomeDashboard';
import type { TabScreenProps } from '@/types/screens/navigation';

export function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const { t } = useTranslation();
  const h = useHomeDashboard();

  if (h.isLoading) return <Loading />;
  if (!h.dashboard) return <ErrorView error={h.error} onRetry={h.refresh} />;
  const d = h.dashboard;
  const roles = h.roles.length > 0 ? h.roles : [{ home: h.home, role: h.role }];

  return (
    <Screen refreshing={h.isRefreshing} onRefresh={h.refresh}>
      <SpaceBetween style={{ marginTop: 12 }}>
        <Text variant="caption" muted>
          {h.home.district}, {h.home.city} · {h.home.roomLayout}
        </Text>
        <IconButton icon="user" tone="card" label={t('home.openProfile')} onPress={() => navigation.navigate('Profile')} />
      </SpaceBetween>
      <Text variant="title">{t('home.title')}</Text>
      <Row>
        {roles.map((m) => (
          <Chip
            key={m.role}
            label={m.role === 'OWNER' ? t('common.owner') : t('common.tenant')}
            selected={m.role === h.role}
            onPress={() => h.selectRole(m.home.id, m.role)}
          />
        ))}
      </Row>

      <ScoreCard score={d.score} onOpen={() => navigation.navigate('Ratings')} />
      <ConditionRecordCard record={d.conditionRecord} onPress={() => navigation.navigate('Record')} />

      <Row style={{ alignItems: 'stretch' }}>
        {h.role === 'OWNER' ? (
          <FeatureTile
            icon="link"
            title={t('home.listing')}
            subtitle={t('home.linked', { count: d.listings.count })}
            onPress={() => navigation.navigate('Listing')}
          />
        ) : null}
        {h.groceries ? (
          <FeatureTile
            icon="shopping-bag"
            title={t('home.groceries')}
            subtitle={
              !h.groceries.connected
                ? t('home.connectGroceries')
                : h.groceries.useSoon
                  ? t('home.useSoon', { count: h.groceries.useSoon })
                  : t('home.nothingSoon')
            }
            warm={!!h.groceries.useSoon}
            onPress={() => navigation.navigate('Groceries')}
          />
        ) : null}
        <FeatureTile
          icon="tool"
          title={t('home.upkeep')}
          subtitle={d.upkeep ? t('home.upkeepIn', { name: d.upkeep.appliance.name, days: d.upkeep.daysLeft }) : t('home.allGood')}
          warm={!!d.upkeep && d.upkeep.daysLeft <= 14}
          onPress={() => navigation.navigate('Upkeep')}
        />
      </Row>

      {h.canInvite ? (
        <Button title={t('home.inviteTenant')} variant="outline" loading={h.inviting} onPress={() => void h.inviteTenant()} />
      ) : null}
    </Screen>
  );
}
