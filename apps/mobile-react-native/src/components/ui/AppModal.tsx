import Feather from '@expo/vector-icons/Feather';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, space } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { ModalAction, ModalPresentation } from '@/types/components/ui';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { ReceiptEdge } from './ReceiptPaper';
import { Text } from './Text';

export interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  /** Anything between the message and the actions: a field, a list of choices, an image. */
  children?: ReactNode;
  /** Buttons, stacked full width. An action closes the modal unless its handler returns false. */
  actions?: ModalAction[];
  /** `sheet` slides up from the bottom (default); `fullscreen` fills the screen in dark (photos). */
  presentation?: ModalPresentation;
  /** Tapping the backdrop or the back button closes it (default true). */
  dismissable?: boolean;
}

/**
 * The one modal used across Raf: a slip of receipt paper that slides up
 * over a dimmed screen, with a torn top edge, a title, an optional message
 * and content, and full-width actions. Use it directly, or through
 * `useModal()` for confirmations, choices, prompts and errors.
 */
export function AppModal({
  visible,
  onClose,
  title,
  message,
  children,
  actions = [],
  presentation = 'sheet',
  dismissable = true,
}: AppModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [busy, setBusy] = useState<number | null>(null);

  const run = async (action: ModalAction, index: number) => {
    if (!action.onPress) return onClose();
    setBusy(index);
    try {
      const keepOpen = (await action.onPress()) === false;
      if (!keepOpen) onClose();
    } finally {
      setBusy(null);
    }
  };
  const close = () => {
    if (dismissable && busy === null) onClose();
  };

  if (presentation === 'fullscreen') {
    return (
      <Modal visible={visible} animationType="fade" onRequestClose={close} presentationStyle="fullScreen">
        <View style={{ flex: 1, backgroundColor: colors.scanner }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.fullHeader}>
              <Text variant="heading" color="#FCFCFA" numberOfLines={1} style={{ flex: 1 }}>
                {title ?? ''}
              </Text>
              <IconButton icon="x" label={t('common.close')} color="#FCFCFA" onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>{children}</View>
          </SafeAreaView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={close}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14,16,17,0.55)' }]}
        />
        <View style={{ flex: 1 }} pointerEvents="box-none" />
        <View accessibilityViewIsModal style={{ maxHeight: '85%' }}>
          {/* The torn edge, flipped so the teeth point up. */}
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <ReceiptEdge />
          </View>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.card }}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheet}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
              {title ? (
                <Text variant="heading" accessibilityRole="header">
                  {title}
                </Text>
              ) : null}
              {message ? (
                <Text variant="body" muted style={{ fontSize: 14.5, lineHeight: 21 }}>
                  {message}
                </Text>
              ) : null}
              {children}
              {actions.length > 0 ? (
                <View style={{ gap: space.sm, marginTop: space.xs }}>
                  {actions.map((action, index) => (
                    <Button
                      key={action.label}
                      title={action.label}
                      variant={action.variant ?? 'primary'}
                      compact
                      loading={busy === index}
                      disabled={action.disabled || (busy !== null && busy !== index)}
                      onPress={() => void run(action, index)}
                    />
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** A tappable choice inside a modal ("Turkish lira (₺)" with a tick when selected). */
export function ModalChoice({
  label,
  selected,
  destructive,
  onPress,
}: {
  label: string;
  selected?: boolean;
  destructive?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={selected === undefined ? 'button' : 'radio'}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        { backgroundColor: selected ? colors.cardMuted : colors.background, opacity: pressed ? 0.75 : 1 },
      ]}>
      <Text variant="bodyMedium" color={destructive ? colors.urgentText : colors.text} style={{ flex: 1 }}>
        {label}
      </Text>
      {selected ? <Feather name="check" size={18} color={colors.text} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg, gap: space.md },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: space.xs },
  fullHeader: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.xl, paddingRight: space.sm, gap: space.sm },
  choice: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
});
