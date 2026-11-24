import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useModal } from '@/components/ui';
import { shareText } from '@/services/linking';
import { useGetDashboardQuery } from '@/store/services/homeService';
import {
  useAddBrokerMutation,
  useLinkListingMutation,
  useListListingsQuery,
  useSendListingUpdateMutation,
  useUpdateListingMutation,
} from '@/store/services/listingService';
import type { Listing, ListingShareField } from '@/types/api/models';
import { brokerSchema, type BrokerValues } from '@/utils/validation';
import { useCurrentHome } from '../common/useCurrentHome';
import { useErrorAlert } from '../common/useErrorAlert';

export function useListings() {
  const { t } = useTranslation();
  const showError = useErrorAlert();
  const { home } = useCurrentHome();
  const listings = useListListingsQuery(home.id);
  const [link, { isLoading: linking }] = useLinkListingMutation();
  const [reference, setReference] = useState('');

  const linkListing = () =>
    link({ homeId: home.id, reference: reference.trim() })
      .unwrap()
      .then(() => setReference(''))
      .catch((error: unknown) => showError(t('listing.linkFailed'), error));

  return {
    listings: listings.data,
    isLoading: listings.isLoading,
    isRefreshing: listings.isFetching && !listings.isLoading,
    error: listings.error,
    refresh: listings.refetch,
    reference,
    setReference,
    canLink: reference.trim().length >= 7,
    linkListing,
    linking,
  };
}

/** Sharing toggles, broker invites and "Send update" for one listing. */
export function useListingCard(listing: Listing) {
  const { t } = useTranslation();
  const modal = useModal();
  const showError = useErrorAlert();
  const { home } = useCurrentHome();
  const dashboard = useGetDashboardQuery(home.id);
  const [updateListing] = useUpdateListingMutation();
  const [addBroker, { isLoading: addingBroker }] = useAddBrokerMutation();
  const [sendUpdate, { isLoading: sending }] = useSendListingUpdateMutation();
  const brokerForm = useForm<BrokerValues>({
    resolver: zodResolver(brokerSchema),
    mode: 'onChange',
    defaultValues: { agencyName: '', email: '' },
  });

  const toggle = (field: ListingShareField) => (value: boolean) =>
    void updateListing({ id: listing.id, homeId: home.id, changes: { [field]: value } })
      .unwrap()
      .catch((error: unknown) => showError(t('common.somethingWrong'), error));

  const inviteBroker = brokerForm.handleSubmit(async ({ agencyName, email }) => {
    try {
      const { shareUrl } = await addBroker({ id: listing.id, homeId: home.id, agencyName, email }).unwrap();
      brokerForm.reset();
      await shareText(t('listing.shareMessage', { url: shareUrl }));
    } catch (error) {
      showError(t('listing.brokerFailed'), error);
    }
  });

  const send = () =>
    sendUpdate({ id: listing.id, homeId: home.id })
      .unwrap()
      .then(({ recipients }) => modal.alert(t('listing.sent'), t('listing.sentBody', { count: recipients })))
      .catch((error: unknown) => showError(t('listing.sendFailed'), error));

  const record = dashboard.data?.conditionRecord;
  return {
    home,
    coverPhotoId: listing.coverPhotoId ?? record?.previewPhotoIds[0],
    recordDate: record?.startedAt,
    score: dashboard.data?.score.score ?? null,
    toggle,
    brokerControl: brokerForm.control,
    brokerValid: brokerForm.formState.isValid,
    inviteBroker,
    addingBroker,
    send,
    sending,
  };
}
