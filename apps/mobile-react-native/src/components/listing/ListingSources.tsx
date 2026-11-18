import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Card, Row, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useTheme } from '@/theme';
import type { Listing } from '@/types/api/models';

/** The listing site and every broker with view access. */
export function ListingSources({ listing }: { listing: Listing }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const syncLine =
    listing.syncError ?? (listing.lastSyncedAt ? t('listing.synced', { date: f.shortDate(listing.lastSyncedAt) }) : t('listing.linkOnly'));
  return (
    <Card>
      <Row>
        <Feather name="globe" size={18} color={colors.text} />
        <View style={{ flex: 1 }}>
          <Text variant="label">sahibinden.com</Text>
          <Text variant="caption" muted>
            {t('listing.listingNo', { id: listing.externalId })} · {syncLine}
          </Text>
        </View>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: listing.syncError ? colors.dangerText : colors.successText,
          }}
        />
      </Row>
      {listing.brokers.map((b) => (
        <Row key={b.id}>
          <Feather name="user" size={18} color={colors.text} />
          <View style={{ flex: 1 }}>
            <Text variant="label">{b.agencyName}</Text>
            <Text variant="caption" muted>
              {b.lastViewAt ? `${t('listing.broker')} · ${t('listing.viewed', { date: f.shortDate(b.lastViewAt) })}` : t('listing.broker')}
            </Text>
          </View>
        </Row>
      ))}
    </Card>
  );
}
