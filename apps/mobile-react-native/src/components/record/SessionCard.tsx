import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Badge, Card, SpaceBetween, Text } from '@/components/ui';
import { radius } from '@/constants/layout';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useTheme } from '@/theme';
import type { ConditionSession, Room } from '@/types/api/models';

export function SessionCard({ session, onPress }: { session: ConditionSession; onPress: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const rooms = Object.entries(session.rooms) as [Room, number][];
  return (
    <Card onPress={onPress} accessibilityLabel={t(`record.type.${session.type}`)}>
      <SpaceBetween>
        <View>
          <Text variant="heading">{t(`record.type.${session.type}`)}</Text>
          <Text variant="caption" muted>
            {f.dateTime(session.startedAt)}
          </Text>
        </View>
        <Badge
          label={t(`record.status.${session.status}`)}
          tone={session.status === 'CONFIRMED' ? 'success' : 'neutral'}
          icon={session.status === 'CONFIRMED' ? 'check' : session.status === 'LOCKED' ? 'lock' : undefined}
        />
      </SpaceBetween>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {rooms.map(([room, count]) => (
          <View
            key={room}
            style={{
              width: '31.5%',
              aspectRatio: 1.25,
              borderRadius: radius.sm,
              backgroundColor: colors.cardMuted,
              justifyContent: 'flex-end',
              padding: 8,
            }}>
            <Text variant="caption" style={{ fontWeight: '700' }}>
              {t(`rooms.${room}`)}
            </Text>
            <Text variant="caption" muted>
              {t('record.photos', { count })}
            </Text>
          </View>
        ))}
      </View>
      <SpaceBetween>
        <Text variant="caption" muted>
          {t('record.ownerLine', { date: f.shortDate(session.ownerConfirmedAt) })}
        </Text>
        <Text variant="caption" muted>
          {session.tenancyId
            ? t('record.tenantLine', { date: f.shortDate(session.tenantConfirmedAt) })
            : t('record.noTenant')}
        </Text>
      </SpaceBetween>
    </Card>
  );
}
