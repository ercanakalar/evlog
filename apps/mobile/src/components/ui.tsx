import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, space } from '@/theme/colors';
import { useTheme } from '@/theme/use-theme';

export type IconName = ComponentProps<typeof Feather>['name'];

// ───────── Layout ─────────

export function Screen({
  children,
  refreshing,
  onRefresh,
  scroll = true,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
}) {
  const { colors } = useTheme();
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
        ) : undefined
      }>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.screenContent}>{children}</View>
  );
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      {content}
    </SafeAreaView>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.sm }, style]}>{children}</View>;
}

// ───────── Text ─────────

type Variant = 'title' | 'heading' | 'body' | 'label' | 'caption' | 'display';

export function T({
  children,
  variant = 'body',
  muted,
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  variant?: Variant;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { colors } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        textStyles[variant],
        { color: color ?? (muted ? colors.textMuted : colors.text) },
        style,
      ]}>
      {children}
    </Text>
  );
}

// ───────── Surfaces ─────────

export function Card({
  children,
  tone = 'default',
  style,
  onPress,
}: {
  children: ReactNode;
  tone?: 'default' | 'primary' | 'warm' | 'success' | 'muted';
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const background = {
    default: colors.card,
    primary: colors.primary,
    warm: colors.warmBg,
    success: colors.successBg,
    muted: colors.cardMuted,
  }[tone];
  const body = <View style={[styles.card, { backgroundColor: background }, style]}>{children}</View>;
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.lg, marginBottom: space.sm }}>
      <T variant="heading">{title}</T>
      {action}
    </Row>
  );
}

// ───────── Controls ─────────

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const filled = variant === 'primary';
  const fg = filled ? colors.onPrimary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: filled ? colors.primary : 'transparent',
          borderColor: variant === 'outline' ? colors.text : 'transparent',
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <T variant="label" color={fg} style={{ flex: icon ? 1 : undefined }}>
            {title}
          </T>
          {icon ? (
            <View style={[styles.buttonIcon, { backgroundColor: filled ? colors.onPrimary : colors.primary }]}>
              <Feather name={icon} size={16} color={filled ? colors.primary : colors.onPrimary} />
            </View>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  tone = 'primary',
  label,
  size = 36,
}: {
  icon: IconName;
  onPress: () => void;
  tone?: 'primary' | 'card' | 'light';
  label: string;
  size?: number;
}) {
  const { colors } = useTheme();
  const bg = { primary: colors.primary, card: colors.card, light: '#FFFFFF' }[tone];
  const fg = tone === 'primary' ? colors.onPrimary : tone === 'light' ? colors.primary : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}>
      <Feather name={icon} size={size * 0.48} color={fg} />
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? colors.primary : colors.card },
      ]}>
      {icon ? <Feather name={icon} size={14} color={selected ? colors.onPrimary : colors.text} /> : null}
      <T variant="label" color={selected ? colors.onPrimary : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}

export function Badge({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'danger' | 'ink';
  icon?: IconName;
}) {
  const { colors } = useTheme();
  const [bg, fg] = {
    neutral: [colors.cardMuted, colors.text],
    success: [colors.successBg, colors.successText],
    danger: [colors.dangerBg, colors.dangerText],
    ink: [colors.ink, colors.onInk],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Feather name={icon} size={11} color={fg} /> : null}
      <T variant="caption" color={fg} style={{ fontWeight: '600' }}>
        {label}
      </T>
    </View>
  );
}

export function Stars({
  value,
  onChange,
  size = 18,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <Row style={{ gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={!onChange}
          hitSlop={4}
          accessibilityRole="adjustable"
          accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
          onPress={() => onChange?.(n)}>
          <T style={{ fontSize: size, lineHeight: size + 2 }} color={n <= value ? colors.star : colors.starEmpty}>
            {n <= value ? '★' : '☆'}
          </T>
        </Pressable>
      ))}
    </Row>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.xs }}>
      {label ? <T variant="label">{label}</T> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[
          styles.input,
          {
            backgroundColor: colors.card,
            color: colors.text,
            borderColor: error ? colors.dangerText : colors.border,
          },
          props.style,
        ]}
      />
      {error ? (
        <T variant="caption" color={colors.dangerText}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={[styles.chip, { backgroundColor: checked ? colors.primary : colors.card }]}>
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          borderWidth: 1.5,
          borderColor: checked ? colors.onPrimary : colors.textMuted,
          backgroundColor: checked ? colors.onPrimary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {checked ? <Feather name="check" size={12} color={colors.primary} /> : null}
      </View>
      <T variant="label" color={checked ? colors.onPrimary : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}

// ───────── States ─────────

export function Loading() {
  const { colors } = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <View style={[styles.center, { gap: space.md }]}>
      <T muted>{error instanceof Error ? error.message : 'Something went wrong'}</T>
      {onRetry ? <Button title="Try again" variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <T muted style={{ textAlign: 'center', paddingVertical: space.lg }}>
      {text}
    </T>
  );
}

const textStyles = StyleSheet.create({
  display: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  heading: { fontSize: 17, fontWeight: '700' },
  body: { fontSize: 15 },
  label: { fontSize: 14, fontWeight: '600' },
  caption: { fontSize: 12 },
});

const styles = StyleSheet.create({
  screenContent: { padding: space.lg, paddingBottom: 120, gap: space.md },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  button: {
    minHeight: 50,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: space.xl,
    paddingVertical: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: 15,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
});
