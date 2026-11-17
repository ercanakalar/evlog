import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import { z } from 'zod';
import { Button, Card, Chip, Field, Row, Screen, T } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCreateHome, useJoinHome } from '@/lib/queries';

const homeSchema = z.object({
  city: z.string().trim().min(1, 'Required').max(60),
  district: z.string().trim().min(1, 'Required').max(60),
  neighborhood: z.string().trim().max(80).optional(),
  addressLine: z.string().trim().min(1, 'Required').max(250),
  roomLayout: z.string().regex(/^\d{1,2}(\.5)?\+\d$/, 'Use the 2+1 format'),
  areaM2: z
    .string()
    .regex(/^\d*$/, 'Numbers only')
    .optional(),
});
type HomeForm = z.infer<typeof homeSchema>;

export default function Onboarding() {
  const [mode, setMode] = useState<'owner' | 'tenant'>('owner');
  const { signOut } = useAuth();
  return (
    <Screen>
      <T variant="title" style={{ marginTop: 24 }}>
        Set up your home
      </T>
      <T muted>Owners register the home. Tenants join with the code the owner shares.</T>
      <Row style={{ marginVertical: 8 }}>
        <Chip label="I own a home" selected={mode === 'owner'} onPress={() => setMode('owner')} />
        <Chip label="I rent a home" selected={mode === 'tenant'} onPress={() => setMode('tenant')} />
      </Row>
      {mode === 'owner' ? <CreateHome /> : <JoinHome />}
      <Button title="Sign out" variant="ghost" onPress={() => void signOut()} />
    </Screen>
  );
}

function CreateHome() {
  const create = useCreateHome();
  const { control, handleSubmit } = useForm<HomeForm>({
    resolver: zodResolver(homeSchema),
    defaultValues: { city: '', district: '', addressLine: '', roomLayout: '2+1', areaM2: '' },
  });
  const fields: { name: keyof HomeForm; label: string; placeholder: string; numeric?: boolean }[] = [
    { name: 'city', label: 'City', placeholder: 'Ankara' },
    { name: 'district', label: 'District', placeholder: 'Çankaya' },
    { name: 'neighborhood', label: 'Neighborhood (optional)', placeholder: 'Kavaklıdere' },
    { name: 'addressLine', label: 'Address', placeholder: 'Street, building, flat' },
    { name: 'roomLayout', label: 'Rooms', placeholder: '2+1' },
    { name: 'areaM2', label: 'Area in m² (optional)', placeholder: '95', numeric: true },
  ];
  const submit = handleSubmit(async ({ areaM2, neighborhood, ...rest }) => {
    try {
      await create.mutateAsync({
        ...rest,
        neighborhood: neighborhood || undefined,
        areaM2: areaM2 ? Number(areaM2) : undefined,
      });
    } catch (error) {
      Alert.alert('Could not save', error instanceof ApiError ? error.messages.join('\n') : undefined);
    }
  });
  return (
    <Card>
      {fields.map((f) => (
        <Controller
          key={f.name}
          control={control}
          name={f.name}
          render={({ field, fieldState }) => (
            <Field
              label={f.label}
              placeholder={f.placeholder}
              keyboardType={f.numeric ? 'number-pad' : 'default'}
              value={field.value ?? ''}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
      ))}
      <Button title="Register home" icon="arrow-right" loading={create.isPending} onPress={submit} />
    </Card>
  );
}

function JoinHome() {
  const join = useJoinHome();
  const [code, setCode] = useState('');
  const valid = /^[A-Z0-9]{10}$/i.test(code.trim());
  return (
    <Card>
      <Field
        label="Invite code"
        placeholder="10 characters"
        autoCapitalize="characters"
        maxLength={10}
        value={code}
        onChangeText={setCode}
      />
      <Button
        title="Join home"
        icon="arrow-right"
        disabled={!valid}
        loading={join.isPending}
        onPress={() =>
          join.mutate(code, {
            onError: (error) => Alert.alert('Could not join', error.message),
          })
        }
      />
    </Card>
  );
}
