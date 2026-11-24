import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
import { useFormatters } from '@/hooks/groceries/common/useFormatters';
import { useTheme } from '@/theme';

const MAX_BAR = 84;

/** Six monthly bars; tap one to break that month down. */
export function MonthBars({
  months,
  selected,
  peak,
  currency,
  onSelect,
}: {
  months: { month: string; total: string }[];
  selected: string;
  peak: number;
  currency?: string;
  onSelect: (month: string) => void;
}) {
  const { colors, fonts } = useTheme();
  const f = useFormatters();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      {months.map((m) => {
        const on = m.month === selected;
        const height = Math.max(4, Math.round((Number(m.total) / peak) * MAX_BAR));
        return (
          <Pressable
            key={m.month}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${f.month(m.month)}, ${f.money(m.total, currency)}`}
            onPress={() => onSelect(m.month)}
            style={{ flex: 1, height: 122, alignItems: 'center', justifyContent: 'flex-end', gap: 7 }}>
            <View
              style={{
                width: 22,
                height,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: on ? colors.ink : colors.rule,
              }}
            />
            <Text variant="caption" style={{ fontSize: 12, fontFamily: on ? fonts.bodySemiBold : fonts.bodyMedium }}>
              {f.month(m.month, 'short')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
