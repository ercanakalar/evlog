import Feather from '@expo/vector-icons/Feather';
import { CameraView } from 'expo-camera';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, Field, IconButton, Text } from '@/components/ui';
import { radius, space } from '@/constants/layout';
import { useFormatters } from '@/hooks/common/useFormatters';
import { usePackScan } from '@/hooks/packs/usePackScan';
import { useTheme } from '@/theme';
import type { RootScreenProps } from '@/types/screens/navigation';
import { isoDate } from '@/utils/format';
import { packDateSchema } from '@/utils/validation';

const WHITE = '#FCFCFA';

/**
 * Scan pack dates: the barcode finds the product from your receipts, then a
 * photo of the printed date (SKT / TETT) replaces the estimated countdown.
 */
export function PackScanScreen({ route }: RootScreenProps<'PackScan'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const camera = useRef<CameraView>(null);
  const s = usePackScan(camera, route.params ?? {});
  const { granted } = s.cameraAccess;

  return (
    <View style={{ flex: 1, backgroundColor: colors.scanner }}>
      {granted ? (
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8'] }}
          onBarcodeScanned={s.onBarcode}
        />
      ) : null}
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <IconButton icon="x" label={t('common.close')} color={WHITE} onPress={s.close} />
          <Text variant="heading" color={WHITE} accessibilityRole="header">
            {t('packs.title')}
          </Text>
          <Text variant="smallMedium" color={WHITE} style={{ minWidth: 44, textAlign: 'right' }}>
            {t('packs.left', { count: s.queue.length })}
          </Text>
        </View>

        {granted ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
            <View style={[styles.frame, s.phase === 'barcode' ? styles.barcodeFrame : styles.dateFrame, { borderColor: colors.accent }]} />
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
            <Text variant="bodyMedium" color={WHITE} style={{ textAlign: 'center' }}>
              {t('packs.needCamera')}
            </Text>
            <Button title={t('scan.allowCamera')} variant="accent" onPress={s.cameraAccess.request} />
          </View>
        )}

        {granted ? (
          <View style={[styles.panel, { backgroundColor: colors.card }]}>
            {s.loading ? <ActivityIndicator color={colors.text} /> : null}

            {!s.loading && s.phase === 'barcode' ? (
              s.queue.length === 0 ? (
                <View style={{ gap: space.md }}>
                  <Text variant="bodyStrong">{s.scanned > 0 ? t('packs.allDone') : t('packs.nothing')}</Text>
                  <Text variant="small" muted>{t('packs.produceNote')}</Text>
                  <Button title={t('common.done')} onPress={s.close} />
                </View>
              ) : (
                <View style={{ gap: space.sm }}>
                  <Text variant="bodyStrong">{t('packs.pointBarcode')}</Text>
                  {s.unknownBarcode ? (
                    <Text variant="small" color={colors.urgentText}>
                      {t('packs.unknownBarcode')}
                    </Text>
                  ) : (
                    <Text variant="small" muted>{t('packs.orPick')}</Text>
                  )}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    accessibilityLabel={t('packs.toScan')}
                    contentContainerStyle={{ gap: 6 }}>
                    {s.queue.map((item) => (
                      <Chip key={item.id} label={item.name} onPress={() => s.choose(item.id)} />
                    ))}
                  </ScrollView>
                  <Text variant="caption" muted style={{ fontSize: 12 }}>
                    {t('packs.produceNote')}
                  </Text>
                </View>
              )
            ) : null}

            {s.phase === 'date' && s.current ? (
              <View style={{ gap: space.md }}>
                <View style={{ gap: 2 }}>
                  <Text variant="bodyStrong">{s.current.name}</Text>
                  <Text variant="small" muted>
                    {t('packs.estimate', { date: f.day(s.current.expiresAt) })}
                  </Text>
                </View>
                <Text variant="bodyMedium">{t('packs.photographDate')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Button title={t('packs.skip')} variant="ghost" compact onPress={s.skip} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('packs.takePhoto')}
                    onPress={s.capture}
                    style={({ pressed }) => [styles.shutter, { borderColor: colors.text, opacity: pressed ? 0.8 : 1 }]}>
                    <View style={[styles.shutterInner, { backgroundColor: colors.accent }]} />
                  </Pressable>
                  <View style={{ width: 80 }} />
                </View>
              </View>
            ) : null}

            {s.phase === 'reading' ? (
              <View style={{ alignItems: 'center', gap: space.sm, paddingVertical: space.md }}>
                <ActivityIndicator color={colors.text} />
                <Text variant="bodyMedium">{t('packs.reading')}</Text>
              </View>
            ) : null}

            {s.phase === 'result' && s.result ? (
              s.result.label.expiresOn ? (
                <View style={{ gap: space.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                    <Feather name="check-circle" size={22} color={colors.text} />
                    <Text variant="bodyStrong" style={{ flexShrink: 1 }}>
                      {t('packs.saved', { name: s.result.item.name, date: f.longDate(s.result.item.expiresAt) })}
                    </Text>
                  </View>
                  {s.result.label.barcodeMatches === false ? (
                    <Text variant="small" color={colors.urgentText}>
                      {t('packs.otherProduct')}
                    </Text>
                  ) : null}
                  <Button title={s.queue.length > 0 ? t('packs.next') : t('common.done')} onPress={s.next} />
                </View>
              ) : (
                <TypeDate
                  message={s.result.label.error ?? t('packs.noDate')}
                  read={s.result.label.text}
                  saving={s.saving}
                  onSave={(day) => void s.saveTyped(day)}
                  onRetry={s.retry}
                  onSkip={s.skip}
                />
              )
            ) : null}
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

/** No date found on the photo: try again, or type the date in. */
function TypeDate({
  message,
  read,
  saving,
  onSave,
  onRetry,
  onSkip,
}: {
  message: string;
  read: string | null;
  saving: boolean;
  onSave: (isoDay: string) => void;
  onRetry: () => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="smallMedium" color={colors.urgentText}>
        {message}
      </Text>
      <Text variant="small" muted>
        {read ? t('packs.whatWasRead', { text: read }) : t('packs.nothingRead')}
      </Text>
      <Field
        label={t('product.packDate')}
        placeholder={isoDate()}
        value={value}
        onChangeText={setValue}
        keyboardType="numbers-and-punctuation"
        error={error}
      />
      <Button
        title={t('common.save')}
        compact
        loading={saving}
        onPress={() => {
          const parsed = packDateSchema.safeParse(value.trim());
          if (!parsed.success) return setError(t('validation.date'));
          setError(undefined);
          onSave(parsed.data);
        }}
      />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button title={t('packs.tryAgain')} variant="outline" compact onPress={onRetry} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title={t('packs.skip')} variant="ghost" compact onPress={onSkip} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 48, marginHorizontal: 14, marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  frame: { borderWidth: 3, borderRadius: radius.md },
  barcodeFrame: { width: 280, height: 140 },
  dateFrame: { width: 300, height: 110 },
  panel: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, gap: space.md },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, padding: 5 },
  shutterInner: { flex: 1, borderRadius: 999 },
});
