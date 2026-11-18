import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Rule, SpaceBetween, Switch, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/** A titled white group of rows separated by dashed rules. */
export function SettingGroup({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text variant="subheading" accessibilityRole="header">
        {title}
      </Text>
      <View style={{ backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4 }}>
        {children}
      </View>
    </View>
  );
}

export function SwitchRow({
  label,
  value,
  onChange,
  divider,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  divider?: boolean;
}) {
  return (
    <View>
      {divider ? <Rule /> : null}
      <SpaceBetween style={{ minHeight: 56 }}>
        <Text variant="bodyMedium" style={{ flexShrink: 1 }}>
          {label}
        </Text>
        <Switch label={label} value={value} onChange={onChange} />
      </SpaceBetween>
    </View>
  );
}

export function ValueRow({
  label,
  value,
  onPress,
  divider,
}: {
  label: string;
  value: string;
  onPress: () => void;
  divider?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View>
      {divider ? <Rule /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        <SpaceBetween style={{ minHeight: 52 }}>
          <Text variant="bodyMedium">{label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
            <Text variant="body" muted style={{ fontSize: 14 }} numberOfLines={1}>
              {value}
            </Text>
            <Feather name="chevron-right" size={16} color={colors.textMuted} />
          </View>
        </SpaceBetween>
      </Pressable>
    </View>
  );
}
