import Feather from '@expo/vector-icons/Feather';
import { CameraView } from 'expo-camera';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScanProgress } from '@/components/scan/ScanProgress';
import { Button, IconButton, Text } from '@/components/ui';
import { MAX_RECEIPT_PARTS } from '@/constants/domain';
import { useScannedBy } from '@/hooks/household/useScannedBy';
import { useScanner } from '@/hooks/scan/useScanner';
import { useTheme } from '@/theme';

const WHITE = '#FCFCFA';

export function ScanScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const camera = useRef<CameraView>(null);
  const s = useScanner(camera);
  const duplicateBy = useScannedBy(s.duplicate?.scannedBy);
  const { granted } = s.cameraAccess;

  const hint = s.long
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
          enableTorch={s.torch && !s.stage}
          onCameraReady={s.onReady}
        />
      ) : null}
      {s.preview ? (
        <>
          <Image
            source={{ uri: s.preview.uri }}
            contentFit={s.preview.fit}
            style={StyleSheet.absoluteFill}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14,16,17,0.45)' }]} />
        </>
      ) : null}
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <IconButton icon="x" label={t('scan.close')} color={WHITE} onPress={s.close} />
          <Text variant="heading" color={WHITE} accessibilityRole="header">
            {t('scan.title')}
          </Text>
          {s.stage ? (
            <View style={{ width: 44 }} />
          ) : (
            <IconButton
              icon="zap"
              label={t('scan.flash')}
              selected={s.torch}
              iconSize={22}
              color={s.torch ? colors.onAccent : WHITE}
              background={s.torch ? colors.accent : undefined}
              onPress={s.toggleTorch}
            />
          )}
        </View>

        {s.stage ? (
          <>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
              <Viewfinder busy />
            </View>
            <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}>
              <ScanProgress
                stage={s.stage}
                photos={s.partCount}
                partsRead={s.partsRead}
                found={s.found}
                failed={s.sendError !== null}
                alreadyScanned={
                  s.duplicate
                    ? s.duplicate.scannedBy === null
                      ? t('scan.steps.duplicateSomeone')
                      : duplicateBy
                        ? t('scan.steps.duplicateBy', { name: duplicateBy })
                        : t('scan.steps.duplicateYou')
                    : undefined
                }
              />
              {s.sendError ? (
                <>
                  <Text variant="small" color={WHITE} accessibilityRole="alert" style={{ textAlign: 'center' }}>
                    {s.sendError}
                  </Text>
                  <Button title={t('common.retry')} variant="accent" compact onPress={s.retrySend} />
                  <Button title={t('scan.retake')} variant="onDark" compact onPress={s.retake} />
                </>
              ) : null}
              {s.stage === 'reading' ? (
                <>
                  <Text variant="small" color={WHITE} style={{ textAlign: 'center' }}>
                    {t('review.leaveWhileReading')}
                  </Text>
                  <Button title={t('scan.inBackground')} variant="onDark" compact onPress={s.close} />
                </>
              ) : null}
            </View>
          </>
        ) : granted ? (
          <>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
              <Viewfinder busy={false} overlap={s.long && s.parts > 0} />
            </View>
            <Text variant="bodyMedium" color={WHITE} style={{ textAlign: 'center', paddingHorizontal: 24 }}>
              {hint}
            </Text>
            {s.long && s.parts > 0 ? (
              <View style={{ paddingHorizontal: 24, paddingTop: 12, gap: 12 }}>
                <PartsStrip photos={s.partPhotos} onUndo={s.undoPart} />
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
                accessibilityState={{ busy: s.capturing }}
                disabled={s.capturing}
                onPress={s.capture}
                style={({ pressed }) => [styles.shutter, { opacity: pressed ? 0.8 : 1 }]}>
                <View style={[styles.shutterInner, { backgroundColor: colors.accent }]}>
                  {s.capturing ? <ActivityIndicator color={colors.onAccent} /> : null}
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

/** Thumbnails of the long-receipt parts taken so far, with a way to take the last one again. */
function PartsStrip({ photos, onUndo }: { photos: string[]; onUndo: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View
        style={{ flexDirection: 'row', gap: 6, flex: 1 }}
        accessible
        accessibilityLabel={t('scan.partsTaken', { count: photos.length })}>
        {photos.map((uri, index) => (
          <View key={uri} style={styles.thumb}>
            <Image source={{ uri }} contentFit="cover" style={StyleSheet.absoluteFill} />
            <View style={styles.thumbBadge}>
              <Text variant="caption" color={WHITE} style={{ fontSize: 10 }}>
                {index + 1}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('scan.retakeLast')}
        onPress={onUndo}
        hitSlop={6}
        style={({ pressed }) => [styles.undo, { opacity: pressed ? 0.7 : 1 }]}>
        <Feather name="rotate-ccw" size={16} color={WHITE} />
        <Text variant="smallMedium" color={WHITE}>
          {t('scan.retakeLast')}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * Lime corner marks with a line sweeping over the receipt (still when motion
 * is reduced). For the next part of a long receipt, a dashed line near the top
 * shows where the last line of the previous part should sit, so the photos
 * overlap and nothing between them is missed.
 */
function Viewfinder({ busy, overlap = false }: { busy: boolean; overlap?: boolean }) {
  const { t } = useTranslation();
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
      {overlap ? (
        <View style={styles.overlap}>
          <View style={[styles.overlapLine, { borderColor: colors.accent }]} />
          <Text variant="caption" color={colors.accent} style={{ textAlign: 'center' }}>
            {t('scan.overlapHere')}
          </Text>
        </View>
      ) : null}
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
  thumb: { width: 30, height: 42, borderRadius: 6, overflow: 'hidden', borderWidth: 1.5, borderColor: WHITE },
  thumbBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    minWidth: 15,
    paddingHorizontal: 3,
    borderTopLeftRadius: 5,
    backgroundColor: 'rgba(14,16,17,0.8)',
    alignItems: 'center',
  },
  undo: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 8 },
  overlap: { position: 'absolute', left: 14, right: 14, top: '14%', gap: 4 },
  overlapLine: { borderTopWidth: 1.5, borderStyle: 'dashed' },
  shutterInner: { flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
