import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import {
  Button,
  ErrorView,
  Field,
  FooterBar,
  Loading,
  ReceiptPaper,
  Row,
  Rule,
  Screen,
  ScreenHeader,
  SectionHeader,
  Segmented,
  SpaceBetween,
  Text,
  TickBar,
} from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useProduct } from '@/hooks/product/useProduct';
import { useTheme } from '@/theme';
import type { RootScreenProps } from '@/types/screens/navigation';
import { countdownColors, countdownProgress } from '@/utils/countdown';
import { isoDate } from '@/utils/format';
import { packDateSchema } from '@/utils/validation';

export function ProductScreen({ route }: RootScreenProps<'Product'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const p = useProduct(route.params.itemId);
  const [packEditing, setPackEditing] = useState(false);
  const [packDay, setPackDay] = useState('');
  const [packError, setPackError] = useState<string>();

  if (p.isLoading) return <Loading />;
  if (!p.item) return <ErrorView error={p.error} onRetry={p.refetch} />;
  const { item } = p;
  const opened = item.openedAt !== null;
  const tone = countdownColors(item.daysLeft, colors);
  const expires = item.expiresAt ? f.day(item.expiresAt).toLocaleUpperCase() : null;

  const formula = item.packDate
    ? t('product.formulaPack', { date: f.day(item.expiresAt) })
    : opened
      ? t('product.formulaOpened', {
          date: f.day(item.openedAt),
          count: item.openedShelfLifeDays ?? item.shelfLifeDays ?? 0,
          expires: f.day(item.expiresAt),
        })
      : t('product.formulaBought', {
          date: f.day(item.boughtAt),
          count: item.shelfLifeDays ?? 0,
          expires: f.day(item.expiresAt),
        });

  const savePack = () => {
    const parsed = packDateSchema.safeParse(packDay.trim());
    if (!parsed.success) return setPackError(t('validation.date'));
    setPackError(undefined);
    void p.setPackDate(parsed.data).then((ok) => ok && setPackEditing(false));
  };

  return (
    <Screen
      header={<ScreenHeader back title={item.name} />}
      footer={
        <FooterBar>
          <Button title={t('product.usedUp')} loading={p.updating} onPress={p.usedUp} />
        </FooterBar>
      }
      gap={16}>
      <ReceiptPaper style={{ paddingVertical: 16, gap: 10 }}>
        <Text variant="smallMedium" muted>
          {f.category(item.category)}
        </Text>
        {item.daysLeft === null ? (
          <Text variant="heading" style={{ fontSize: 22 }}>
            {t('countdown.noExpiry')}
          </Text>
        ) : (
          <>
            <Row style={{ alignItems: 'baseline', gap: 10 }}>
              <Text variant="amountXL" style={{ fontSize: 84, lineHeight: 84, letterSpacing: -4 }}>
                {item.daysLeft}
              </Text>
              <Text variant="heading" style={{ fontSize: 22 }}>
                {t('product.daysLeft', { count: item.daysLeft })}
              </Text>
            </Row>
            <TickBar
              progress={countdownProgress(item.daysLeft, item.totalDays)}
              color={tone.bar}
              height={18}
              tick={3}
              gap={4}
            />
            <Text variant="bodyMedium" style={{ fontSize: 14 }}>
              {item.packDate ? t('product.packBestBefore') : t('product.bestBefore')}{' '}
              <Text variant="amount" style={{ fontSize: 14 }}>
                {expires}
              </Text>
            </Text>
          </>
        )}
      </ReceiptPaper>

      {item.shelfLifeDays !== null || item.packDate ? (
        <View style={{ gap: 10 }}>
          <SectionHeader title={t('product.howWeEstimate')} />
          <Segmented<'closed' | 'open'>
            value={opened ? 'open' : 'closed'}
            onChange={(v) => p.setOpened(v === 'open')}
            options={[
              { value: 'closed', label: t('product.unopened') },
              { value: 'open', label: t('product.opened') },
            ]}
          />
          <Text variant="body" style={{ fontSize: 14, lineHeight: 20 }}>
            {formula}
          </Text>
          {packEditing ? (
            <View style={{ gap: 8 }}>
              <Field
                label={t('product.packDate')}
                placeholder={isoDate()}
                value={packDay}
                onChangeText={setPackDay}
                keyboardType="numbers-and-punctuation"
                error={packError}
                autoFocus
              />
              <Row>
                <View style={{ flex: 1 }}>
                  <Button title={t('common.cancel')} variant="outline" compact onPress={() => setPackEditing(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title={t('common.save')} compact loading={p.updating} onPress={savePack} />
                </View>
              </Row>
            </View>
          ) : item.packDate ? (
            <Button title={t('product.useEstimate')} variant="outline" compact onPress={() => void p.setPackDate(null)} />
          ) : (
            <Button
              title={t('product.usePackDate')}
              variant="outline"
              compact
              onPress={() => {
                setPackDay(item.expiresAt ? isoDate(new Date(item.expiresAt)) : '');
                setPackEditing(true);
              }}
            />
          )}
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <SectionHeader title={t('product.history')} />
        {item.history.map((h) => (
          <View key={h.id}>
            <Rule />
            <Pressable
              accessibilityRole="button"
              onPress={() => p.openTrip(h.receiptId)}
              style={{ paddingVertical: 10 }}>
              <SpaceBetween>
                <View style={{ gap: 2 }}>
                  <Text variant="bodyStrong" style={{ fontSize: 14.5 }}>
                    {h.market ?? t('trips.unknownMarket')}
                  </Text>
                  <Text variant="small" muted>
                    {f.longDate(h.boughtAt)}
                  </Text>
                </View>
                <Text variant="mono" style={{ fontSize: 14 }}>
                  {`${Number(h.quantity)} × ${f.money(h.unitPrice ?? h.totalPrice)}`}
                </Text>
              </SpaceBetween>
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}
