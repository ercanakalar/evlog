import type { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button, Card, FormField, Text } from '@/components/ui';
import type { BrokerValues } from '@/utils/validation';

export function BrokerForm({
  control,
  valid,
  loading,
  onSubmit,
}: {
  control: Control<BrokerValues>;
  valid: boolean;
  loading: boolean;
  onSubmit: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <Text variant="label">{t('listing.addBroker')}</Text>
      <FormField control={control} name="agencyName" placeholder={t('listing.agencyName')} maxLength={120} />
      <FormField
        control={control}
        name="email"
        placeholder={t('listing.brokerEmail')}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Button title={t('listing.giveAccess')} variant="outline" disabled={!valid} loading={loading} onPress={onSubmit} />
    </Card>
  );
}
