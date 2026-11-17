import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { Badge, Button, Card, Checkbox, Empty, ErrorView, Field, IconButton, Loading, Row, Screen, T } from '@/components/ui';
import { authedImage } from '@/lib/api';
import { money, shortDate } from '@/lib/format';
import { useCurrentHome } from '@/lib/home-context';
import {
  useAddBroker,
  useDashboard,
  useLinkListing,
  useListings,
  useSendListingUpdate,
  useUpdateListing,
} from '@/lib/queries';
import type { Listing } from '@/lib/types';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/use-theme';

export default function ListingScreen() {
  const { home } = useCurrentHome();
  const listings = useListings(home.id);
  const link = useLinkListing(home.id);
  const [reference, setReference] = useState('');

  if (listings.isPending) return <Loading />;
  if (listings.isError) return <ErrorView error={listings.error} onRetry={() => void listings.refetch()} />;

  return (
    <Screen refreshing={listings.isRefetching} onRefresh={() => void listings.refetch()}>
      <Row style={{ marginTop: 8 }}>
        <IconButton icon="chevron-left" tone="card" label="Back" onPress={() => router.back()} />
      </Row>
      <T variant="title">Listing</T>
      {listings.data.map((l) => (
        <ListingCard key={l.id} listing={l} />
      ))}
      {listings.data.length === 0 ? <Empty text="Link your sahibinden.com listing to share verified data with brokers." /> : null}
      <Card>
        <Field
          label="Link a sahibinden.com listing"
          placeholder="Listing link or number"
          autoCapitalize="none"
          value={reference}
          onChangeText={setReference}
        />
        <Button
          title="Link listing"
          variant="outline"
          disabled={reference.trim().length < 7}
          loading={link.isPending}
          onPress={() =>
            link.mutate(reference, {
              onSuccess: () => setReference(''),
              onError: (e) => Alert.alert('Could not link', e.message),
            })
          }
        />
      </Card>
    </Screen>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const { home } = useCurrentHome();
  const { colors } = useTheme();
  const dashboard = useDashboard(home.id);
  const update = useUpdateListing(home.id);
  const addBroker = useAddBroker(home.id);
  const send = useSendListingUpdate(home.id);
  const [agency, setAgency] = useState('');
  const [email, setEmail] = useState('');
  const cover = listing.coverPhotoId ?? dashboard.data?.conditionRecord?.previewPhotoIds[0];

  const toggle = (key: 'sharePhotos' | 'shareRatings' | 'shareHeatingBills') => (value: boolean) =>
    update.mutate({ id: listing.id, [key]: value });

  const invite = () =>
    addBroker.mutate(
      { id: listing.id, agencyName: agency.trim(), email: email.trim() },
      {
        onSuccess: ({ shareUrl }) => {
          setAgency('');
          setEmail('');
          void Share.share({ message: `Read-only home record: ${shareUrl}` });
        },
        onError: (e) => Alert.alert('Could not add broker', e.message),
      },
    );

  return (
    <>
      <View style={{ borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.cardMuted, height: 170 }}>
        {cover ? (
          <Image source={authedImage(`/condition-photos/${cover}/file`)} style={{ flex: 1 }} contentFit="cover" />
        ) : null}
        <Row style={{ position: 'absolute', left: 12, bottom: 12 }}>
          {dashboard.data?.conditionRecord ? (
            <Badge tone="success" icon="check" label={`Record · ${shortDate(dashboard.data.conditionRecord.startedAt)}`} />
          ) : null}
          {dashboard.data?.score.score ? <Badge tone="ink" label={`Score ${dashboard.data.score.score.toFixed(1)}`} /> : null}
        </Row>
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">
          {home.roomLayout}
          {home.areaM2 ? ` · ${home.areaM2} m²` : ''} · {home.district}
        </T>
        <T variant="label">{listing.priceAmount ? `${money(listing.priceAmount, listing.currency)}/mo` : ''}</T>
      </Row>

      <Card>
        <Row>
          <Feather name="globe" size={18} color={colors.text} />
          <View style={{ flex: 1 }}>
            <T variant="label">sahibinden.com</T>
            <T variant="caption" muted>
              No. {listing.externalId} ·{' '}
              {listing.syncError ?? (listing.lastSyncedAt ? `synced ${shortDate(listing.lastSyncedAt)}` : 'link only')}
            </T>
          </View>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: listing.syncError ? colors.dangerText : colors.successText }} />
        </Row>
        {listing.brokers.map((b) => (
          <Row key={b.id}>
            <Feather name="user" size={18} color={colors.text} />
            <View style={{ flex: 1 }}>
              <T variant="label">{b.agencyName}</T>
              <T variant="caption" muted>
                Broker · view only{b.lastViewAt ? ` · viewed ${shortDate(b.lastViewAt)}` : ''}
              </T>
            </View>
          </Row>
        ))}
      </Card>

      <T variant="label">Shared with them</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Checkbox label="Photos" checked={listing.sharePhotos} onChange={toggle('sharePhotos')} />
        <Checkbox label="Ratings" checked={listing.shareRatings} onChange={toggle('shareRatings')} />
        <Checkbox label="Heating bills" checked={listing.shareHeatingBills} onChange={toggle('shareHeatingBills')} />
      </View>

      <Card>
        <T variant="label">Add a real-estate broker</T>
        <Field placeholder="Agency name" value={agency} onChangeText={setAgency} maxLength={120} />
        <Field placeholder="Broker email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Button
          title="Give view access"
          variant="outline"
          disabled={!agency.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())}
          loading={addBroker.isPending}
          onPress={invite}
        />
      </Card>

      <Button
        title="Send update"
        icon="arrow-right"
        disabled={listing.brokers.length === 0}
        loading={send.isPending}
        onPress={() =>
          send.mutate(listing.id, {
            onSuccess: ({ recipients }) => Alert.alert('Update sent', `${recipients} broker(s) can now see the latest record.`),
            onError: (e) => Alert.alert('Could not send', e.message),
          })
        }
      />
    </>
  );
}
