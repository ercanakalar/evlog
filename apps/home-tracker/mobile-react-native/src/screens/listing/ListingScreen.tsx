import { useTranslation } from 'react-i18next';
import { BrokerForm } from '@/components/listing/BrokerForm';
import { ListingHero } from '@/components/listing/ListingHero';
import { ListingSources } from '@/components/listing/ListingSources';
import { SharingOptions } from '@/components/listing/SharingOptions';
import { Button, Card, Empty, ErrorView, Field, Loading, Screen, ScreenHeader, SpaceBetween, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useListingCard, useListings } from '@/hooks/listing/useListing';
import type { Listing } from '@/types/api/models';

export function ListingScreen() {
  const { t } = useTranslation();
  const l = useListings();

  if (l.isLoading) return <Loading />;
  if (!l.listings) return <ErrorView error={l.error} onRetry={l.refresh} />;

  return (
    <Screen refreshing={l.isRefreshing} onRefresh={l.refresh}>
      <ScreenHeader back title={t('listing.title')} />
      {l.listings.map((listing) => (
        <ListingSection key={listing.id} listing={listing} />
      ))}
      {l.listings.length === 0 ? <Empty text={t('listing.empty')} /> : null}
      <Card>
        <Field
          label={t('listing.linkLabel')}
          placeholder={t('listing.linkPlaceholder')}
          autoCapitalize="none"
          value={l.reference}
          onChangeText={l.setReference}
        />
        <Button
          title={t('listing.link')}
          variant="outline"
          disabled={!l.canLink}
          loading={l.linking}
          onPress={() => void l.linkListing()}
        />
      </Card>
    </Screen>
  );
}

function ListingSection({ listing }: { listing: Listing }) {
  const { t } = useTranslation();
  const f = useFormatters();
  const c = useListingCard(listing);
  return (
    <>
      <ListingHero coverPhotoId={c.coverPhotoId} recordDate={c.recordDate} score={c.score} />
      <SpaceBetween>
        <Text variant="heading">
          {c.home.roomLayout}
          {c.home.areaM2 ? ` · ${c.home.areaM2} m²` : ''} · {c.home.district}
        </Text>
        {listing.priceAmount ? (
          <Text variant="label">{t('listing.perMonth', { price: f.money(listing.priceAmount, listing.currency) })}</Text>
        ) : null}
      </SpaceBetween>
      <ListingSources listing={listing} />
      <SharingOptions listing={listing} onToggle={c.toggle} />
      <BrokerForm control={c.brokerControl} valid={c.brokerValid} loading={c.addingBroker} onSubmit={() => void c.inviteBroker()} />
      <Button
        title={t('listing.sendUpdate')}
        icon="arrow-right"
        disabled={listing.brokers.length === 0}
        loading={c.sending}
        onPress={() => void c.send()}
      />
    </>
  );
}
