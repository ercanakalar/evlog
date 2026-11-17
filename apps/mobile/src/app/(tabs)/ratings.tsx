import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useReceiptScanner } from '@/components/scan-receipt-button';
import { Badge, Button, Card, Empty, ErrorView, Field, Loading, Row, Screen, SectionHeader, Stars, T } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { CATEGORY_LABEL, monthYear } from '@/lib/format';
import { useCurrentHome } from '@/lib/home-context';
import { useEligibility, useRatings, useSubmitRating } from '@/lib/queries';
import type { RatingCategory, ReceiptKind } from '@/lib/types';
import { useTheme } from '@/theme/use-theme';

/** Which receipt to scan to unlock each category. */
const UNLOCK_WITH: Record<RatingCategory, ReceiptKind | null> = {
  HOME_CONDITION: null,
  NEIGHBORHOOD: 'RENT',
  INFRASTRUCTURE: 'UTILITY_ELECTRICITY',
  HEATING_EFFICIENCY: 'UTILITY_GAS',
  RENOVATIONS: 'RENOVATION',
};

const EVIDENCE_LABEL: Record<RatingCategory, (n: number) => string> = {
  HOME_CONDITION: () => 'Condition record',
  NEIGHBORHOOD: () => 'Rent receipts',
  INFRASTRUCTURE: (n) => `${n} utility bill${n > 1 ? 's' : ''}`,
  HEATING_EFFICIENCY: (n) => `${n} gas bill${n > 1 ? 's' : ''}`,
  RENOVATIONS: (n) => `${n} renovation receipt${n > 1 ? 's' : ''}`,
};

export default function RatingsScreen() {
  const { role } = useCurrentHome();
  return role === 'TENANT' ? <RateHome /> : <PublishedRatings title="Ratings" />;
}

function RateHome() {
  const { home } = useCurrentHome();
  const { colors } = useTheme();
  const eligibility = useEligibility(home.id, true);
  const submit = useSubmitRating(home.id);
  const scanner = useReceiptScanner(home.id);
  const [scores, setScores] = useState<Partial<Record<RatingCategory, number>>>({});
  const [note, setNote] = useState('');

  if (eligibility.isPending) return <Loading />;
  if (eligibility.isError) return <ErrorView error={eligibility.error} onRetry={() => void eligibility.refetch()} />;
  const e = eligibility.data;
  if (e.alreadyRated) return <PublishedRatings title="Ratings" banner="You rated this tenancy. Thank you!" />;

  const rated = Object.entries(scores).filter(([, v]) => v) as [RatingCategory, number][];

  const send = () =>
    submit.mutate(
      {
        scores: rated.map(([category, score]) => ({ category, score })),
        noteForNextTenant: note.trim() || undefined,
      },
      {
        onSuccess: () => void eligibility.refetch(),
        onError: (error) =>
          Alert.alert('Could not submit', error instanceof ApiError ? error.messages.join('\n') : error.message),
      },
    );

  return (
    <Screen refreshing={eligibility.isRefetching} onRefresh={() => void eligibility.refetch()}>
      <T variant="title" style={{ marginTop: 12 }}>
        Rate this home
      </T>

      <Card tone={e.tenancyVerified ? 'success' : 'warm'}>
        <Row>
          <Feather
            name={e.tenancyVerified ? 'check-circle' : 'alert-circle'}
            size={26}
            color={e.tenancyVerified ? colors.successText : colors.warmText}
          />
          <View style={{ flex: 1 }}>
            <T variant="label">{e.tenancyVerified ? 'Your tenancy is verified' : 'Verify your tenancy first'}</T>
            <T variant="caption" muted>
              {e.tenancyVerified
                ? 'Your rent receipts match this address.'
                : 'Scan and confirm your rent receipts to rate this home.'}
            </T>
          </View>
        </Row>
        {!e.tenancyVerified ? (
          <Button title="Scan rent receipt" icon="camera" loading={scanner.scanning} onPress={() => scanner.start('RENT')} />
        ) : null}
      </Card>

      {e.categories.map((c) => {
        const label = CATEGORY_LABEL[c.category];
        const unlock = UNLOCK_WITH[c.category];
        return (
          <Card key={c.category}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="label">{label.title}</T>
              <Stars
                value={scores[c.category] ?? 0}
                onChange={c.eligible && e.tenancyVerified ? (v) => setScores((s) => ({ ...s, [c.category]: v })) : undefined}
              />
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <T variant="caption" muted>
                {label.hint}
              </T>
              {c.eligible ? (
                <Badge tone="success" icon="check" label={EVIDENCE_LABEL[c.category](c.receiptIds.length)} />
              ) : null}
            </Row>
            {!c.eligible ? (
              <Card tone="warm" style={{ padding: 10 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T variant="caption" color={colors.warmText} style={{ flex: 1 }}>
                    Needs: {c.requirement.toLowerCase()}
                  </T>
                  {unlock ? (
                    <Button
                      title="Scan receipt"
                      style={{ minHeight: 34, paddingHorizontal: 14 }}
                      onPress={() => scanner.start(unlock)}
                    />
                  ) : null}
                </Row>
              </Card>
            ) : null}
          </Card>
        );
      })}

      <SectionHeader title="Note for the next tenant" />
      <Field placeholder="What should they know?" multiline maxLength={1000} value={note} onChangeText={setNote} style={{ minHeight: 80 }} />
      <Button
        title="Submit verified rating"
        icon="arrow-right"
        disabled={!e.tenancyVerified || rated.length === 0}
        loading={submit.isPending}
        onPress={send}
      />
    </Screen>
  );
}

function PublishedRatings({ title, banner }: { title: string; banner?: string }) {
  const { home } = useCurrentHome();
  const ratings = useRatings(home.id);
  if (ratings.isPending) return <Loading />;
  if (ratings.isError) return <ErrorView error={ratings.error} onRetry={() => void ratings.refetch()} />;
  return (
    <Screen refreshing={ratings.isRefetching} onRefresh={() => void ratings.refetch()}>
      <T variant="title" style={{ marginTop: 12 }}>
        {title}
      </T>
      {banner ? (
        <Card tone="success">
          <T variant="label">{banner}</T>
        </Card>
      ) : null}
      {ratings.data.length === 0 ? <Empty text="No verified ratings yet." /> : null}
      {ratings.data.map((r) => (
        <Card key={r.id}>
          <T variant="caption" muted>
            Tenancy from {monthYear(r.submittedAt)}
          </T>
          {r.scores.map((s) => (
            <Row key={s.category} style={{ justifyContent: 'space-between' }}>
              <T>{CATEGORY_LABEL[s.category].title}</T>
              <Stars value={s.score} size={15} />
            </Row>
          ))}
          {r.noteForNextTenant ? <T muted>“{r.noteForNextTenant}”</T> : null}
        </Card>
      ))}
    </Screen>
  );
}
