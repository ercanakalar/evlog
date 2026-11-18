import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { CheckChip, Text } from '@/components/ui';
import type { Listing, ListingShareField } from '@/types/api/models';

export function SharingOptions({
  listing,
  onToggle,
}: {
  listing: Listing;
  onToggle: (field: ListingShareField) => (value: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Text variant="label">{t('listing.sharedWith')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <CheckChip label={t('listing.photos')} checked={listing.sharePhotos} onChange={onToggle('sharePhotos')} />
        <CheckChip label={t('listing.ratings')} checked={listing.shareRatings} onChange={onToggle('shareRatings')} />
        <CheckChip
          label={t('listing.heatingBills')}
          checked={listing.shareHeatingBills}
          onChange={onToggle('shareHeatingBills')}
        />
      </View>
    </>
  );
}
