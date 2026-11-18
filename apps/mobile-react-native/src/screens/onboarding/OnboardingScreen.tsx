import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip, Field, FormField, Row, Screen, ScreenHeader, Text } from '@/components/ui';
import { useCreateHomeForm, useJoinHome } from '@/hooks/onboarding/useOnboarding';
import type { RootScreenProps } from '@/types/screens/navigation';

export function OnboardingScreen({ route, navigation }: RootScreenProps<'Onboarding'>) {
  const { t } = useTranslation();
  const inviteCode = route.params?.inviteCode;
  // An invite deep link (evlog://join/CODE) opens straight on the tenant tab.
  const [mode, setMode] = useState<'owner' | 'tenant'>(inviteCode ? 'tenant' : 'owner');

  return (
    <Screen>
      <ScreenHeader title={t('onboarding.title')} />
      <Text muted>{t('onboarding.subtitle')}</Text>
      <Row style={{ marginVertical: 8 }}>
        <Chip label={t('onboarding.iOwn')} selected={mode === 'owner'} onPress={() => setMode('owner')} />
        <Chip label={t('onboarding.iRent')} selected={mode === 'tenant'} onPress={() => setMode('tenant')} />
      </Row>
      {mode === 'owner' ? <CreateHomeForm /> : <JoinHomeForm initialCode={inviteCode} />}
      <Button title={t('profile.title')} variant="ghost" onPress={() => navigation.navigate('Profile')} />
    </Screen>
  );
}

function CreateHomeForm() {
  const { t } = useTranslation();
  const { control, submit, isLoading } = useCreateHomeForm();
  return (
    <Card>
      <FormField control={control} name="city" label={t('onboarding.city')} placeholder="Ankara" />
      <FormField control={control} name="district" label={t('onboarding.district')} placeholder="Çankaya" />
      <FormField control={control} name="neighborhood" label={t('onboarding.neighborhood')} placeholder="Kavaklıdere" />
      <FormField control={control} name="addressLine" label={t('onboarding.address')} />
      <FormField control={control} name="roomLayout" label={t('onboarding.rooms')} placeholder="2+1" />
      <FormField control={control} name="areaM2" label={t('onboarding.area')} placeholder="95" keyboardType="number-pad" />
      <Button title={t('onboarding.register')} icon="arrow-right" loading={isLoading} onPress={() => void submit()} />
    </Card>
  );
}

function JoinHomeForm({ initialCode }: { initialCode?: string }) {
  const { t } = useTranslation();
  const j = useJoinHome(initialCode);
  return (
    <Card>
      <Field
        label={t('onboarding.inviteCode')}
        placeholder={t('onboarding.inviteCodeHint')}
        autoCapitalize="characters"
        maxLength={10}
        value={j.code}
        onChangeText={j.setCode}
      />
      <Button title={t('onboarding.join')} icon="arrow-right" disabled={!j.valid} loading={j.isLoading} onPress={() => void j.join()} />
    </Card>
  );
}
