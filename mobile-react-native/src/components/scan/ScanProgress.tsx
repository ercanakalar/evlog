import Feather from '@expo/vector-icons/Feather';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import type { ScanStage } from '@/hooks/scan/useScanner';
import { useTheme } from '@/theme';

const WHITE = '#FCFCFA';
const STEPS: ScanStage[] = ['preparing', 'sending', 'reading', 'matching', 'done'];

/** The steps a sent receipt goes through, over its photo on the scanner. */
export function ScanProgress({
  stage,
  photos,
  partsRead,
  found,
  failed = false,
  alreadyScanned,
}: {
  stage: ScanStage;
  photos: number;
  /** Photos the reader has finished, out of `photos`. */
  partsRead: number;
  found: number;
  /** The current step went wrong (sending, when it can be tried again). */
  failed?: boolean;
  /** Read, but someone in the household already scanned it: says who, in place of "Found N items". */
  alreadyScanned?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const current = STEPS.indexOf(stage);

  const label = (step: ScanStage) =>
    ({
      preparing: t('scan.steps.preparing'),
      sending: t('scan.steps.sending', { count: photos }),
      reading:
        photos > 1 && stage === 'reading'
          ? t('scan.steps.readingPart', { part: Math.min(partsRead + 1, photos), count: photos })
          : t('scan.steps.reading'),
      matching: t('scan.steps.matching'),
      done:
        stage !== 'done' ? t('scan.steps.review') : (alreadyScanned ?? t('scan.steps.found', { count: found })),
    })[step];

  // Screen readers hear each step as it starts; the list itself is not read again.
  const now = label(stage);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(now);
  }, [now]);

  return (
    <View style={styles.panel}>
      {STEPS.map((step, index) => {
        const state = index < current || stage === 'done' ? 'done' : index === current ? 'active' : 'todo';
        return (
          <View key={step} style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={styles.mark}>
              {state === 'done' && step === 'done' && alreadyScanned ? (
                <Feather name="alert-circle" size={20} color={colors.accent} />
              ) : state === 'done' ? (
                <View style={[styles.dot, { backgroundColor: colors.accent }]}>
                  <Feather name="check" size={13} color={colors.onAccent} />
                </View>
              ) : state === 'active' && failed ? (
                <Feather name="alert-circle" size={20} color={WHITE} />
              ) : state === 'active' ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <View style={[styles.dot, styles.todo]} />
              )}
            </View>
            <Text
              variant={state === 'active' ? 'bodyStrong' : 'body'}
              color={WHITE}
              style={{ flexShrink: 1, opacity: state === 'todo' ? 0.55 : 1 }}>
              {label(step)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: 'rgba(14,16,17,0.78)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 24 },
  mark: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  todo: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(252,252,250,0.55)' },
});
