import Feather from '@expo/vector-icons/Feather';
import { CameraView } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, IconButton, Text } from '@/components/ui';
import { MAX_RECEIPT_PARTS } from '@/constants/groceries';
import { useScanner } from '@/hooks/groceries/scan/useScanner';
import { useTheme } from '@/theme';

const WHITE = '#FCFCFA';

export function ScanScreen() {
  const { t } = useTranslation('groceries');
  const { colors } = useTheme();
  const camera = useRef<CameraView>(null);
  const s = useScanner(camera);
  const { granted } = s.cameraAccess;

  const hint = s.busy === 'uploading'
    ? t('scan.reading')
    : s.long
      ? s.parts === 0
        ? t('scan.longHintFirst')
        : t('scan.longHintNext', { count: s.parts })
      : t('scan.hint');

  return (
    <View style={{ flex: 1, backgroundColor: colors.scanner }}>
      {granted ? (
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={s.torch}
          onCameraReady={s.onReady}
        />
      ) : null}
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <IconButton icon="x" label={t('scan.close')} color={WHITE} onPress={s.close} />
          <Text variant="heading" color={WHITE} accessibilityRole="header">
            {t('scan.title')}
          </Text>
          <IconButton
            icon="zap"
            label={t('scan.flash')}
            selected={s.torch}
            iconSize={22}
            color={s.torch ? colors.onAccent : WHITE}
            background={s.torch ? colors.accent : undefined}
            onPress={s.toggleTorch}
          />
        </View>

        {granted ? (
          <>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
              <Viewfinder busy={s.busy === 'uploading'} />
            </View>
            <Text variant="bodyMedium" color={WHITE} style={{ textAlign: 'center', paddingHorizontal: 24 }}>
              {hint}
            </Text>
            {s.long && s.parts > 0 && s.busy !== 'uploading' ? (
              <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
                <Button
                  title={t('scan.doneParts', { count: s.parts, max: MAX_RECEIPT_PARTS })}
                  variant="accent"
                  compact
                  onPress={s.finishLong}
                />
              </View>
            ) : null}
            <View style={styles.controls}>
              <ControlButton icon="image" label={t('scan.gallery')} onPress={s.fromGallery} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('scan.takePhoto')}
                accessibilityState={{ busy: s.busy !== null }}
                disabled={s.busy !== null}
                onPress={s.capture}
                style={({ pressed }) => [styles.shutter, { opacity: pressed ? 0.8 : 1 }]}>
                <View style={[styles.shutterInner, { backgroundColor: colors.accent }]}>
                  {s.busy ? <ActivityIndicator color={colors.onAccent} /> : null}
                </View>
              </Pressable>
              <ControlButton icon="layers" label={t('scan.longReceipt')} selected={s.long} onPress={s.toggleLong} />
            </View>
          </>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
            <Text variant="bodyMedium" color={WHITE} style={{ textAlign: 'center' }}>
              {t('scan.needCamera')}
            </Text>
            <Button title={t('scan.allowCamera')} variant="accent" onPress={s.cameraAccess.request} />
            <Button title={t('scan.gallery')} variant="onDark" onPress={s.fromGallery} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function ControlButton({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: 'image' | 'layers';
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const fg = selected ? colors.onAccent : WHITE;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      style={[styles.control, { backgroundColor: selected ? colors.accent : 'transparent' }]}>
      <Feather name={icon} size={24} color={fg} />
      <Text variant="caption" color={fg} style={{ fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Lime corner marks with a line sweeping over the receipt (still when motion is reduced). */
function Viewfinder({ busy }: { busy: boolean }) {
  const { colors } = useTheme();
  const [sweep] = useState(() => new Animated.Value(0));
  const [height, setHeight] = useState(0);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        sweep.setValue(0.5);
        return;
      }
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(sweep, { toValue: 1, duration: busy ? 900 : 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(sweep, { toValue: 0, duration: busy ? 900 : 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [sweep, busy]);

  const corner = { position: 'absolute' as const, width: 36, height: 36, borderColor: colors.accent };
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
      style={{ width: 290, flex: 1, maxHeight: 478 }}>
      <Animated.View
        style={{
          position: 'absolute',
          left: 6,
          right: 6,
          height: 2,
          backgroundColor: colors.accent,
          transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, height - 2)] }) }],
        }}
      />
      <View style={[corner, { left: 0, top: 0, borderLeftWidth: 3, borderTopWidth: 3 }]} />
      <View style={[corner, { right: 0, top: 0, borderRightWidth: 3, borderTopWidth: 3 }]} />
      <View style={[corner, { left: 0, bottom: 0, borderLeftWidth: 3, borderBottomWidth: 3 }]} />
      <View style={[corner, { right: 0, bottom: 0, borderRightWidth: 3, borderBottomWidth: 3 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 48, marginHorizontal: 14, marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  control: { width: 88, minHeight: 64, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 5 },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: WHITE, padding: 5 },
  shutterInner: { flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
