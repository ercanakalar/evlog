import Feather from '@expo/vector-icons/Feather';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Rule, SpaceBetween, Switch, Text } from '@/components/ui';
import { FONT_SETS, FONT_STYLE_NAMES, PALETTE_NAMES, palettes, useTheme } from '@/theme';
import type { FontPreference, PalettePreference } from '@/types/store/state';

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
        accessibilityLabel={value ? `${label}, ${value}` : label}
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

/** A row of highlighter swatches, one per palette; the chosen one is ringed and ticked. */
export function PaletteRow({
  label,
  value,
  onChange,
  nameOf,
  divider,
}: {
  label: string;
  value: PalettePreference;
  onChange: (v: PalettePreference) => void;
  nameOf: (v: PalettePreference) => string;
  divider?: boolean;
}) {
  const { colors, dark } = useTheme();
  return (
    <View>
      {divider ? <Rule /> : null}
      <View style={{ paddingTop: 14, paddingBottom: 10, gap: 8 }}>
        <SpaceBetween>
          <Text variant="bodyMedium">{label}</Text>
          <Text variant="body" muted style={{ fontSize: 14 }}>
            {nameOf(value)}
          </Text>
        </SpaceBetween>
        <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginLeft: -6 }}>
          {PALETTE_NAMES.map((name) => {
            const selected = name === value;
            const swatch = palettes[name][dark ? 'dark' : 'light'];
            return (
              <Pressable
                key={name}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={nameOf(name)}
                onPress={() => onChange(name)}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 2,
                  borderColor: selected ? colors.text : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: swatch.accent,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {selected ? <Feather name="check" size={16} color={swatch.onAccent} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/** Font style tiles, each previewing its heading and receipt fonts. */
export function FontRow({
  label,
  value,
  onChange,
  nameOf,
  divider,
}: {
  label: string;
  value: FontPreference;
  onChange: (v: FontPreference) => void;
  nameOf: (v: FontPreference) => string;
  divider?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View>
      {divider ? <Rule /> : null}
      <View style={{ paddingTop: 14, paddingBottom: 12, gap: 10 }}>
        <Text variant="bodyMedium">{label}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FONT_STYLE_NAMES.map((name) => {
            const selected = name === value;
            const { fonts } = FONT_SETS[name];
            return (
              <Pressable
                key={name}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={nameOf(name)}
                onPress={() => onChange(name)}
                style={({ pressed }) => ({
                  flexGrow: 1,
                  flexBasis: '45%',
                  minHeight: 76,
                  borderRadius: 10,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? colors.text : colors.border,
                  backgroundColor: colors.background,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.7 : 1,
                })}>
                <SpaceBetween>
                  <Text variant="heading" style={{ fontFamily: fonts.headingBold, fontSize: 22 }}>
                    Aa
                  </Text>
                  <Text variant="mono" muted style={{ fontFamily: fonts.monoMedium }}>
                    12,50
                  </Text>
                </SpaceBetween>
                <Text variant="small" style={{ fontFamily: selected ? fonts.bodySemiBold : fonts.body }} numberOfLines={1}>
                  {nameOf(name)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
